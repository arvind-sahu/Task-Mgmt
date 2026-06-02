import { TRPCError } from "@trpc/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertRateLimit,
  RATE_LIMIT_MAX_REQUESTS,
  RateLimitError,
  resetRateLimitStoreForTests,
  toRateLimitTrpcError,
} from "./rateLimit";

afterEach(() => {
  resetRateLimitStoreForTests();
});

describe("assertRateLimit", () => {
  it("records a hit when under the sliding window limit", () => {
    const key = "api:ip:127.0.0.1";
    const now = 1_700_000_000_000;

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS - 1; i++) {
      assertRateLimit(key, now + i);
    }

    expect(() => assertRateLimit(key, now + RATE_LIMIT_MAX_REQUESTS)).not.toThrow();
  });

  it("throws RateLimitError when the window is full", () => {
    const key = "api:ip:127.0.0.1";
    const now = 1_700_000_000_000;

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      assertRateLimit(key, now + i);
    }

    expect(() => assertRateLimit(key, now + RATE_LIMIT_MAX_REQUESTS)).toThrow(
      RateLimitError,
    );
  });

  it("allows new hits after the sliding window advances", () => {
    const key = "api:ip:127.0.0.1";
    const now = 1_700_000_000_000;

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      assertRateLimit(key, now + i);
    }

    expect(() =>
      assertRateLimit(key, now + 60_001),
    ).not.toThrow();
  });
});

describe("toRateLimitTrpcError", () => {
  it("maps RateLimitError to TOO_MANY_REQUESTS", () => {
    expect(() => toRateLimitTrpcError(new RateLimitError())).toThrow(
      expect.objectContaining<Partial<TRPCError>>({
        code: "TOO_MANY_REQUESTS",
      }),
    );
  });

  it("rethrows unknown errors", () => {
    const err = new Error("db down");
    expect(() => toRateLimitTrpcError(err)).toThrow(err);
  });
});
