import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { EmailDeliveryError } from "~/server/emailErrors";
import { LOGIN_OTP_SENT_MESSAGE } from "~/server/auth";
import { normalizeCompanyName, companyNamesMatch } from "~/server/company";
import { issueEmailOtp, verifyEmailOtp } from "~/server/otp";
import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "~/server/security/sanitize";
import { EMAIL_DELIVERY_FAILED_MESSAGE } from "~/utils/emailErrors";

// Reusable input shapes — exported so tests can import the same schemas.
export const registerInput = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72), // bcrypt's effective max is 72 bytes
});

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/,
    "Password must contain at least one special character",
  );

const companyNameSchema = z.string().min(2).max(120);

export const updateProfileInput = z.object({
  name: z.string().min(1).max(80).optional(),
  companyName: companyNameSchema.optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(64).optional(),
  image: z
    .string()
    .refine(
      (value) => {
        if (value.startsWith("data:image/")) return true;
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Provide a valid http(s) image URL or uploaded image data" },
    )
    .optional()
    .nullable(),
});

export const userRouter = createTRPCRouter({
  /** Public registration endpoint. Hashes the password with bcrypt. */
  register: publicProcedure
    .input(registerInput)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          name: sanitizePlainText(input.name),
          email,
          password: passwordHash,
        },
        select: { id: true, email: true, name: true },
      });
      return user;
    }),

  sendSignupOtp: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        email: z.string().email(),
        password: strongPasswordSchema,
        companyName: companyNameSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }
      try {
        await issueEmailOtp(email, "SIGNUP_VERIFY");
      } catch (err) {
        if (err instanceof EmailDeliveryError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err.message,
          });
        }
        throw err;
      }
      return { message: "OTP sent to your email for signup verification." };
    }),

  verifySignupOtpAndRegister: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        email: z.string().email(),
        password: strongPasswordSchema,
        companyName: companyNameSchema,
        otp: z.string().regex(/^\d{6}$/, "Enter valid 6 digit OTP"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const valid = await verifyEmailOtp({
        email,
        code: input.otp,
        purpose: "SIGNUP_VERIFY",
        consume: true,
      });
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired OTP",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await ctx.db.user.create({
        data: {
          name: sanitizePlainText(input.name),
          email,
          password: passwordHash,
          companyName: normalizeCompanyName(input.companyName),
        },
        select: { id: true, email: true, name: true, companyName: true },
      });
      return user;
    }),

  sendLoginOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8).max(72),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { id: true, email: true, password: true },
      });

      if (user) {
        const ok = await bcrypt.compare(input.password, user.password ?? "");
        if (ok) {
          try {
            await issueEmailOtp(email, "LOGIN_2FA");
          } catch (err) {
            if (err instanceof EmailDeliveryError) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: err.message,
              });
            }
            throw err;
          }
        }
      }

      return { message: LOGIN_OTP_SENT_MESSAGE };
    }),

  verifyLoginOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().regex(/^\d{6}$/, "Enter valid 6 digit OTP"),
      }),
    )
    .mutation(async ({ input }) => {
      const valid = await verifyEmailOtp({
        email: input.email,
        code: input.otp,
        purpose: "LOGIN_2FA",
        consume: false,
      });
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired OTP",
        });
      }
      return { ok: true };
    }),

  sendForgotPasswordOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });
      // Keep this endpoint response generic to prevent account enumeration.
      if (user) {
        try {
          await issueEmailOtp(email, "FORGOT_PASSWORD");
        } catch (err) {
          console.error("[forgot-password] Failed to send OTP email:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof EmailDeliveryError
                ? err.message
                : EMAIL_DELIVERY_FAILED_MESSAGE,
          });
        }
      }
      return { message: "If an account exists, OTP has been sent to email." };
    }),

  verifyForgotPasswordOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().regex(/^\d{6}$/, "Enter valid 6 digit OTP"),
      }),
    )
    .mutation(async ({ input }) => {
      const valid = await verifyEmailOtp({
        email: input.email,
        code: input.otp,
        purpose: "FORGOT_PASSWORD",
        consume: false,
      });
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired OTP",
        });
      }
      return { ok: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().regex(/^\d{6}$/, "Enter valid 6 digit OTP"),
        password: strongPasswordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const otpIsVerified = await verifyEmailOtp({
        email,
        code: input.otp,
        purpose: "FORGOT_PASSWORD",
        consume: true,
      });
      if (!otpIsVerified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Please verify OTP before resetting password",
        });
      }
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account exists with this email",
        });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      await ctx.db.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      });
      return { ok: true };
    }),

  /** Returns the currently signed-in user (no password). */
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        companyName: true,
        timezone: true,
        createdAt: true,
      },
    });
  }),

  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...input,
          name: input.name ? sanitizePlainText(input.name) : undefined,
          companyName: input.companyName
            ? normalizeCompanyName(input.companyName)
            : undefined,
          bio: sanitizeOptionalPlainText(input.bio),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          companyName: true,
          timezone: true,
        },
      });
    }),

  /**
   * Employee directory scoped to the signed-in user's organization.
   */
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(80) }))
    .query(async ({ ctx, input }) => {
      const currentUser = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { companyName: true },
      });

      if (!currentUser?.companyName) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Add your company name in Profile settings before searching teammates.",
        });
      }

      return ctx.db.user.findMany({
        where: {
          companyName: {
            equals: currentUser.companyName,
            mode: "insensitive",
          },
          OR: [
            { email: { contains: input.query, mode: "insensitive" } },
            { name: { contains: input.query, mode: "insensitive" } },
          ],
          NOT: { id: ctx.session.user.id },
        },
        select: { id: true, name: true, email: true, image: true, companyName: true },
        take: 20,
      });
    }),

  security: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [accounts, loginAudits, user] = await Promise.all([
      ctx.db.account.findMany({
        where: { userId },
        select: { id: true, provider: true, type: true },
      }),
      ctx.db.loginAudit.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      ctx.db.user.findUnique({
        where: { id: userId },
        select: { password: true },
      }),
    ]);

    return {
      accounts,
      loginAudits,
      hasPassword: !!user?.password,
      sessionNote:
        "You are signed in on this browser. JWT sessions are not listed individually.",
    };
  }),

  disconnectAccount: protectedProcedure
    .input(z.object({ provider: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const accounts = await ctx.db.account.findMany({
        where: { userId },
        select: { provider: true },
      });
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      const target = accounts.find((a) => a.provider === input.provider);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not linked",
        });
      }

      const remainingOAuth = accounts.filter(
        (a) => a.provider !== input.provider,
      ).length;
      if (!user?.password && remainingOAuth === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Add a password before disconnecting your only sign-in method",
        });
      }

      await ctx.db.account.deleteMany({
        where: { userId, provider: input.provider },
      });
      return { ok: true };
    }),
});
