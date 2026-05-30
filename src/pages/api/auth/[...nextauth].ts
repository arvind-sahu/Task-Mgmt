import NextAuth from "next-auth";

import { withApiRateLimit } from "~/server/api/withApiRateLimit";
import { authOptions } from "~/server/auth";

const handler = NextAuth(authOptions);

export default withApiRateLimit(handler, "auth");
