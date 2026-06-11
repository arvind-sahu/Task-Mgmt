import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { InviteStatus } from "@prisma/client";
import { z } from "zod";

import {
  COMPANY_PLANS,
  DEFAULT_COMPANY_PLAN,
  type CompanyPlanValue,
} from "~/constants/company";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { normalizeCompanyName } from "~/server/company";
import { emailMatchesDomain, normalizeEmailDomain } from "~/server/company/domain";
import {
  companyInviteAcceptUrl,
  companyRoleLabel,
  sendCompanyInviteEmail,
} from "~/server/company/inviteEmail";
import {
  canInviteCompanyRole,
  canInviteCompanyUsers,
  canCreateCompanyProjects,
  canManageCompanySettings,
} from "~/server/company/permissions";
import { uniqueCompanySlug } from "~/server/company/slug";
import {
  requireActiveCompany,
  resolveActiveCompany,
} from "~/server/company/workspace";
import { EmailDeliveryError } from "~/server/emailErrors";
import { issueEmailOtp, verifyEmailOtp } from "~/server/otp";
import {
  buildObjectUrl,
  companyLogoKey,
  createPresignedUploadUrl,
  deleteObjectByKey,
  extractKeyFromObjectUrl,
  isCompanyLogoKeyForCompany,
  isS3Configured,
} from "~/server/storage/s3";
import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "~/server/security/sanitize";

const COMPANY_INVITE_TTL_DAYS = 7;
const objectKeySchema = z.string().min(1).max(512);

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

const companyRoleSchema = z.enum([
  "SUPER_ADMIN",
  "MANAGER",
  "MEMBER",
  "VIEWER",
]);

function inviteExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + COMPANY_INVITE_TTL_DAYS);
  return d;
}

export const companyRouter = createTRPCRouter({
  sendCompanySignupOtp: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(2).max(120),
        emailDomain: z.string().min(3).max(120),
        name: z.string().min(1).max(80),
        email: z.string().email(),
        password: strongPasswordSchema,
        agreeTerms: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const domain = normalizeEmailDomain(input.emailDomain);

      if (!emailMatchesDomain(email, domain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Work email must use your company domain (@${domain})`,
        });
      }

      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      try {
        await issueEmailOtp(email, "COMPANY_SIGNUP_VERIFY");
      } catch (err) {
        if (err instanceof EmailDeliveryError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err.message,
          });
        }
        throw err;
      }

      return {
        message: "Verification code sent to your work email.",
      };
    }),

  verifyAndCreateWorkspace: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(2).max(120),
        emailDomain: z.string().min(3).max(120),
        name: z.string().min(1).max(80),
        email: z.string().email(),
        password: strongPasswordSchema,
        otp: z.string().regex(/^\d{6}$/, "Enter valid 6 digit OTP"),
        agreeTerms: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const domain = normalizeEmailDomain(input.emailDomain);
      const companyName = normalizeCompanyName(input.companyName);

      if (!emailMatchesDomain(email, domain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Work email must use your company domain (@${domain})`,
        });
      }

      const valid = await verifyEmailOtp({
        email,
        code: input.otp,
        purpose: "COMPANY_SIGNUP_VERIFY",
        consume: true,
      });
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired OTP",
        });
      }

      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const slug = await uniqueCompanySlug(ctx.db, companyName);

      const result = await ctx.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: sanitizePlainText(input.name),
            email,
            password: passwordHash,
            emailVerified: new Date(),
            companyName,
          },
        });

        const company = await tx.company.create({
          data: {
            name: companyName,
            slug,
            emailDomain: domain,
            rootUserId: user.id,
            members: {
              create: { userId: user.id, role: "ROOT" },
            },
          },
        });

        return { userId: user.id, companyId: company.id };
      });

      return {
        userId: result.userId,
        companyId: result.companyId,
        needsOnboarding: true,
      };
    }),

  workspaceContext: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const memberships = await ctx.db.companyMember.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            timezone: true,
            logoUrl: true,
            setupCompletedAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const active = await resolveActiveCompany(
      ctx.db,
      userId,
      ctx.activeCompanyId,
    );

    const role = active?.role ?? null;

    return {
      activeCompanyId: active?.companyId ?? null,
      activeCompany: active?.company ?? null,
      role,
      workspaces: memberships.map((m) => ({
        id: m.company.id,
        name: m.company.name,
        slug: m.company.slug,
        role: m.role,
      })),
      canManageCompany: role ? canManageCompanySettings(role) : false,
      canCreateProjects: role ? canCreateCompanyProjects(role) : false,
      canInviteUsers: role ? canInviteCompanyUsers(role) : false,
      needsOnboarding:
        active?.company.setupCompletedAt == null && role === "ROOT",
    };
  }),

  switchWorkspace: protectedProcedure
    .input(z.object({ companyId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId: input.companyId,
            userId: ctx.session.user.id,
          },
        },
      });
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }
      return { companyId: input.companyId };
    }),

  getLogoUploadUrl: protectedProcedure
    .input(
      z.object({
        contentType: z
          .string()
          .min(1)
          .max(100)
          .refine((value) => value.startsWith("image/"), {
            message: "Only image uploads are allowed",
          }),
        contentLength: z
          .number()
          .int()
          .positive()
          .max(4 * 1024 * 1024, "Logo must be 4MB or smaller"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isS3Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Image storage is not configured on this server.",
        });
      }

      const active = await requireActiveCompany(
        ctx.db,
        ctx.session.user.id,
        ctx.activeCompanyId,
        "ROOT",
      );

      const key = companyLogoKey(active.companyId, input.contentType);
      return createPresignedUploadUrl(key, input.contentType);
    }),

  confirmCompanyLogo: protectedProcedure
    .input(z.object({ objectKey: objectKeySchema }))
    .mutation(async ({ ctx, input }) => {
      if (!isS3Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Image storage is not configured on this server.",
        });
      }

      const active = await requireActiveCompany(
        ctx.db,
        ctx.session.user.id,
        ctx.activeCompanyId,
        "ROOT",
      );

      if (!isCompanyLogoKeyForCompany(input.objectKey, active.companyId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid company logo key",
        });
      }

      const existing = await ctx.db.company.findUnique({
        where: { id: active.companyId },
        select: { logoUrl: true },
      });
      const previousKey = existing?.logoUrl
        ? extractKeyFromObjectUrl(existing.logoUrl)
        : null;
      if (previousKey && previousKey !== input.objectKey) {
        try {
          await deleteObjectByKey(previousKey);
        } catch {
          // Best-effort cleanup.
        }
      }

      const logoUrl = buildObjectUrl(input.objectKey);
      await ctx.db.company.update({
        where: { id: active.companyId },
        data: { logoUrl },
      });

      return { logoUrl };
    }),

  completeSetup: protectedProcedure
    .input(
      z.object({
        timezone: z.string().min(1).max(64),
        plan: z.enum(COMPANY_PLANS).default(DEFAULT_COMPANY_PLAN),
        logoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const active = await requireActiveCompany(
        ctx.db,
        ctx.session.user.id,
        ctx.activeCompanyId,
        "ROOT",
      );

      await ctx.db.company.update({
        where: { id: active.companyId },
        data: {
          timezone: input.timezone,
          plan: input.plan as CompanyPlanValue,
          logoUrl: input.logoUrl ?? active.company.logoUrl ?? undefined,
          setupCompletedAt: new Date(),
        },
      });

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { timezone: input.timezone },
      });

      return { ok: true };
    }),

  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const active = await requireActiveCompany(
      ctx.db,
      ctx.session.user.id,
      ctx.activeCompanyId,
    );
    if (!canManageCompanySettings(active.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.companyMember.findMany({
      where: { companyId: active.companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            imageKey: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }),

  listPendingInvites: protectedProcedure.query(async ({ ctx }) => {
    const active = await requireActiveCompany(
      ctx.db,
      ctx.session.user.id,
      ctx.activeCompanyId,
    );
    if (!canManageCompanySettings(active.role) && !canInviteCompanyUsers(active.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.companyInvite.findMany({
      where: {
        companyId: active.companyId,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  inviteUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: companyRoleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const active = await requireActiveCompany(
        ctx.db,
        ctx.session.user.id,
        ctx.activeCompanyId,
      );

      if (!canInviteCompanyRole(active.role, input.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your role cannot invite ${input.role} users`,
        });
      }

      const email = input.email.toLowerCase();
      const company = active.company;

      const existingMember = await ctx.db.companyMember.findFirst({
        where: {
          companyId: active.companyId,
          user: { email },
        },
      });
      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already in the workspace",
        });
      }

      const pending = await ctx.db.companyInvite.findFirst({
        where: {
          companyId: active.companyId,
          email,
          status: InviteStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      });
      if (pending) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A pending invite already exists for this email",
        });
      }

      const inviter = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.session.user.id },
        select: { name: true, email: true },
      });

      const invite = await ctx.db.companyInvite.create({
        data: {
          email,
          role: input.role,
          companyId: active.companyId,
          invitedById: ctx.session.user.id,
          expiresAt: inviteExpiresAt(),
        },
      });

      const acceptUrl = companyInviteAcceptUrl(invite.token);
      try {
        await sendCompanyInviteEmail({
          to: email,
          companyName: company.name,
          inviterName: inviter.name ?? inviter.email ?? "A teammate",
          roleLabel: companyRoleLabel(input.role),
          acceptUrl,
          expiresAt: invite.expiresAt,
        });
      } catch (err) {
        await ctx.db.companyInvite.delete({ where: { id: invite.id } });
        if (err instanceof EmailDeliveryError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err.message,
          });
        }
        throw err;
      }

      return { inviteId: invite.id, acceptUrl };
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const active = await requireActiveCompany(
        ctx.db,
        ctx.session.user.id,
        ctx.activeCompanyId,
      );
      if (!canManageCompanySettings(active.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: active.companyId },
        select: { rootUserId: true },
      });
      if (input.userId === company.rootUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The root user cannot be removed",
        });
      }

      const target = await ctx.db.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId: active.companyId,
            userId: input.userId,
          },
        },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }
      if (
        target.role === "ROOT" ||
        (target.role === "SUPER_ADMIN" && active.role !== "ROOT")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove this member",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.companyMember.delete({
          where: {
            companyId_userId: {
              companyId: active.companyId,
              userId: input.userId,
            },
          },
        });

        const projectIds = await tx.project.findMany({
          where: { companyId: active.companyId },
          select: { id: true },
        });
        const ids = projectIds.map((p) => p.id);
        if (ids.length > 0) {
          await tx.projectMember.deleteMany({
            where: { userId: input.userId, projectId: { in: ids } },
          });
        }
      });

      return { ok: true };
    }),

  getInviteByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.companyInvite.findUnique({
        where: { token: input.token },
        include: {
          company: { select: { id: true, name: true, emailDomain: true } },
          invitedBy: { select: { name: true, email: true } },
        },
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      if (invite.status !== InviteStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is no longer valid",
        });
      }

      if (invite.expiresAt < new Date()) {
        await ctx.db.companyInvite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      const existingUser = await ctx.db.user.findUnique({
        where: { email: invite.email },
        select: { id: true, name: true, email: true },
      });

      return {
        email: invite.email,
        role: invite.role,
        companyName: invite.company.name,
        inviterName:
          invite.invitedBy.name ?? invite.invitedBy.email ?? "A teammate",
        hasAccount: !!existingUser,
        existingUserName: existingUser?.name ?? null,
      };
    }),

  acceptInvite: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        name: z.string().min(1).max(80).optional(),
        password: strongPasswordSchema.optional(),
        otp: z.string().regex(/^\d{6}$/).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.companyInvite.findUnique({
        where: { token: input.token },
        include: { company: true },
      });

      if (!invite || invite.status !== InviteStatus.PENDING) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found or already used",
        });
      }

      if (invite.expiresAt < new Date()) {
        await ctx.db.companyInvite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      const email = invite.email.toLowerCase();
      let userId: string;

      const existing = await ctx.db.user.findUnique({ where: { email } });

      if (!existing) {
        if (!input.name || !input.password) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Name and password are required for new accounts",
          });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const created = await ctx.db.user.create({
          data: {
            name: sanitizePlainText(input.name),
            email,
            password: passwordHash,
            emailVerified: new Date(),
            companyName: invite.company.name,
          },
        });
        userId = created.id;
      } else {
        userId = existing.id;
      }

      const alreadyMember = await ctx.db.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId: invite.companyId,
            userId,
          },
        },
      });
      if (alreadyMember) {
        await ctx.db.companyInvite.update({
          where: { id: invite.id },
          data: {
            status: InviteStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });
        return {
          companyId: invite.companyId,
          userId,
          alreadyMember: true,
        };
      }

      await ctx.db.$transaction([
        ctx.db.companyMember.create({
          data: {
            companyId: invite.companyId,
            userId,
            role: invite.role,
          },
        }),
        ctx.db.companyInvite.update({
          where: { id: invite.id },
          data: {
            status: InviteStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        }),
      ]);

      return {
        companyId: invite.companyId,
        userId,
        alreadyMember: false,
      };
    }),
});
