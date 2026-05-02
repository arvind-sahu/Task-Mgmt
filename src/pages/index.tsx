import type { GetServerSidePropsContext } from "next";

import { getServerAuthSession } from "~/server/auth";

/**
 * Root entry. Always redirects:
 *  - signed in   → /dashboard
 *  - signed out  → /auth/signin
 *
 * Keeping the redirect server-side avoids any flash of placeholder content.
 */
export default function Home() {
  return null;
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  return {
    redirect: {
      destination: session ? "/dashboard" : "/auth/signin",
      permanent: false,
    },
  };
}
