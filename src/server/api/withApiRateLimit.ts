import { type NextApiHandler, type NextApiRequest, type NextApiResponse } from "next";

import { assertRateLimit, RateLimitError } from "~/server/rateLimit";
import { db } from "~/server/db";
import { getClientIp } from "~/server/security/clientIp";

export function withApiRateLimit(
  handler: NextApiHandler,
  scope = "api",
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await assertRateLimit(db, `${scope}:ip:${getClientIp(req)}`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({ error: error.message });
      }
      throw error;
    }

    return handler(req, res);
  };
}
