import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "~/server/db";

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

export const authOptions: NextAuthOptions = {
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
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    // Persist the user id into the JWT on sign-in...
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // ...and surface it on the client-visible session.
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
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
