import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";

export const RATE_LIMIT_MAX_REQUESTS = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded. Maximum 60 requests per minute.") {
    super(message);
    this.name = "RateLimitError";
  }
}

function slidingWindowStart(now = Date.now()) {
  return new Date(now - RATE_LIMIT_WINDOW_MS);
}

/**
 * Sliding-window rate limit backed by Postgres so it works across Lambda instances.
 * Keeps request timestamps for each key and rejects when count >= limit in the window.
 */
export async function assertRateLimit(
  client: typeof db,
  key: string,
  now = Date.now(),
): Promise<void> {
  const windowStart = slidingWindowStart(now);

  await client.$transaction(async (tx) => {
    const recentCount = await tx.rateLimitHit.count({
      where: {
        key,
        createdAt: { gte: windowStart },
      },
    });

    if (recentCount >= RATE_LIMIT_MAX_REQUESTS) {
      throw new RateLimitError();
    }

    await tx.rateLimitHit.create({ data: { key } });
  });

  if (Math.random() < 0.02) {
    void client.rateLimitHit
      .deleteMany({
        where: {
          createdAt: { lt: new Date(now - RATE_LIMIT_WINDOW_MS * 2) },
        },
      })
      .catch(() => undefined);
  }
}

export function toRateLimitTrpcError(error: unknown): never {
  if (error instanceof RateLimitError) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: error.message,
    });
  }
  throw error;
}
