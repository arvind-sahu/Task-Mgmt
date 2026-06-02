import { TRPCError } from "@trpc/server";

export const RATE_LIMIT_MAX_REQUESTS = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;
/** Drop idle keys after 30 minutes to bound memory use. */
export const RATE_LIMIT_ENTRY_TTL_MS = 30 * 60 * 1000;

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded. Maximum 60 requests per minute.") {
    super(message);
    this.name = "RateLimitError";
  }
}

const buckets = new Map<string, number[]>();

function pruneBucket(hits: number[], now: number): number[] {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  return hits.filter((t) => t >= windowStart);
}

function purgeStaleKeys(now: number) {
  const cutoff = now - RATE_LIMIT_ENTRY_TTL_MS;
  for (const [key, hits] of buckets) {
    const latest = hits.at(-1);
    if (latest === undefined || latest < cutoff) {
      buckets.delete(key);
    }
  }
}

let lastPurgeAt = 0;

/**
 * Sliding-window rate limit in process memory (no DB round-trips).
 * Suitable for dev and single-instance Lambda; entries expire after 30 minutes.
 */
export function assertRateLimit(key: string, now = Date.now()): void {
  if (now - lastPurgeAt >= RATE_LIMIT_ENTRY_TTL_MS) {
    purgeStaleKeys(now);
    lastPurgeAt = now;
  }

  const hits = pruneBucket(buckets.get(key) ?? [], now);

  if (hits.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new RateLimitError();
  }

  hits.push(now);
  buckets.set(key, hits);
}

/** Test helper — clears in-memory counters between cases. */
export function resetRateLimitStoreForTests() {
  buckets.clear();
  lastPurgeAt = 0;
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
