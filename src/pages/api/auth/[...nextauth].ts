import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";

import { withApiRateLimit } from "~/server/api/withApiRateLimit";
import { createAuthOptions } from "~/server/auth";

async function auth(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, createAuthOptions(req));
}

export default withApiRateLimit(auth, "auth");
