import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextApiRequest } from "next";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
  type Session,
} from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { env } from "~/env";
import { db } from "~/server/db";
import { getEnabledOAuthProviders } from "~/server/oauth";
import { verifyEmailOtp } from "~/server/otp";
import { recordLoginAudit } from "~/server/security/loginAudit";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  }
}

export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
export const LOGIN_OTP_SENT_MESSAGE =
  "If your credentials are correct, a verification code was sent to your email.";

const SIGNUP_LOGIN_GRACE_MS = 5 * 60 * 1000;

// Schema for the credentials form payload — kept here so it stays in sync with
// what `authorize` actually parses.
export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  otp: z
    .string()
    .regex(/^\d{6}$/, "Enter valid 6 digit OTP")
    .optional(),
  authFlow: z.enum(["signup"]).optional(),
});

async function hasRecentSignupVerification(email: string) {
  const record = await db.emailOtp.findFirst({
    where: {
      email: email.toLowerCase(),
      purpose: "SIGNUP_VERIFY",
      consumedAt: { gte: new Date(Date.now() - SIGNUP_LOGIN_GRACE_MS) },
    },
    orderBy: { consumedAt: "desc" },
  });
  return !!record;
}

/**
 * Verify a plaintext password against a stored bcrypt hash. Extracted so it
 * can be unit-tested independently of NextAuth.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

function buildOAuthProviders() {
  const providers = [];
  if (getEnabledOAuthProviders().includes("google")) {
    providers.push(
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (getEnabledOAuthProviders().includes("microsoft")) {
    providers.push(
      AzureADProvider({
        id: "microsoft",
        name: "Microsoft",
        clientId: env.MICROSOFT_CLIENT_ID!,
        clientSecret: env.MICROSOFT_CLIENT_SECRET!,
        tenantId: env.MICROSOFT_TENANT_ID ?? "common",
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (getEnabledOAuthProviders().includes("github")) {
    providers.push(
      GitHubProvider({
        clientId: env.AUTH_GITHUB_ID!,
        clientSecret: env.AUTH_GITHUB_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (getEnabledOAuthProviders().includes("linkedin")) {
    providers.push(
      LinkedInProvider({
        clientId: env.LINKEDIN_CLIENT_ID!,
        clientSecret: env.LINKEDIN_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  return providers;
}

export function createAuthOptions(req?: NextApiRequest): NextAuthOptions {
  return {
  adapter: PrismaAdapter(db),

  // Credentials provider requires JWT sessions — DB sessions are not supported
  // for this provider in NextAuth v4.
  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/signin",
  },

  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        authFlow: { label: "Auth flow", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const normalizedEmail = parsed.data.email.toLowerCase();
        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) return null;

        const passwordOk = await verifyPassword(
          parsed.data.password,
          user.password,
        );
        if (!passwordOk) return null;

        if (parsed.data.authFlow === "signup") {
          const recentlyVerified = await hasRecentSignupVerification(normalizedEmail);
          if (!recentlyVerified) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }

        if (!parsed.data.otp) return null;

        const otpOk = await verifyEmailOtp({
          email: normalizedEmail,
          code: parsed.data.otp,
          purpose: "LOGIN_2FA",
          consume: true,
        });
        if (!otpOk) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    ...buildOAuthProviders(),
  ],

  events: {
    signIn: async ({ user, account }) => {
      if (!user.id) return;

      const method = account?.provider ?? "credentials";
      if (req) {
        await recordLoginAudit({ userId: user.id, method, req });
      } else {
        await db.loginAudit.create({
          data: { userId: user.id, method },
        });
      }

      if (account?.provider === "credentials") return;
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },

  callbacks: {
    // Persist only lightweight identity fields into JWT to avoid oversized
    // cookies (HTTP 431), especially if profile image is a data URL.
    jwt: ({ token, user, account, profile }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image ?? null;
      }
      if (
        account?.provider !== "credentials" &&
        profile &&
        "picture" in profile
      ) {
        const pic = profile.picture;
        if (typeof pic === "string") token.picture = pic;
      }
      if (
        account?.provider === "github" &&
        profile &&
        "avatar_url" in profile
      ) {
        const avatar = profile.avatar_url;
        if (typeof avatar === "string") token.picture = avatar;
      }
      return token;
    },
    // ...and surface it on the client-visible session.
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        name: token.name ?? session.user.name,
        email: token.email ?? session.user.email,
        image: token.picture ?? session.user.image ?? null,
        id: token.id,
      },
    }),
  },
  };
}

export const authOptions = createAuthOptions();

/** Server-side helper used by getServerSideProps and the tRPC context. */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};

/** Protected pages: redirect guests and pass `session` for client hydration. */
export async function requireAuth(
  ctx: GetServerSidePropsContext,
): Promise<
  | { redirect: { destination: string; permanent: false } }
  | { props: { session: Session } }
> {
  const session = await getServerAuthSession(ctx);
  if (!session) {
    return { redirect: { destination: "/auth/signin", permanent: false } };
  }
  return { props: { session } };
}
