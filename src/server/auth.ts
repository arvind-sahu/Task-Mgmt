import { PrismaAdapter } from "@auth/prisma-adapter";
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

// Module augmentation: expose `id` on `session.user` everywhere.
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

// Schema for the credentials form payload — kept here so it stays in sync with
// what `authorize` actually parses.
export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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

export const authOptions: NextAuthOptions = {
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
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user) return null;

        const ok = await verifyPassword(password, user.password);
        if (!ok) return null;

        // The returned object is what gets persisted into the JWT.
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
      await db.loginAudit.create({
        data: { userId: user.id, method },
      });

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
