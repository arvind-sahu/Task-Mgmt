import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import {
  assertRateLimit,
  RATE_LIMIT_MAX_REQUESTS,
  RateLimitError,
  toRateLimitTrpcError,
} from "./rateLimit";

type MockTx = {
  rateLimitHit: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makeClient(recentCount: number) {
  const tx: MockTx = {
    rateLimitHit: {
      count: vi.fn().mockResolvedValue(recentCount),
      create: vi.fn().mockResolvedValue({ id: "hit-1", key: "test" }),
    },
  };

  return {
    client: {
      $transaction: vi.fn(async (fn: (inner: MockTx) => Promise<void>) => fn(tx)),
      rateLimitHit: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    },
    tx,
  };
}

describe("assertRateLimit", () => {
  it("records a hit when under the sliding window limit", async () => {
    const { client, tx } = makeClient(RATE_LIMIT_MAX_REQUESTS - 1);

    await assertRateLimit(client as never, "api:ip:127.0.0.1", 1_700_000_000_000);

    expect(tx.rateLimitHit.count).toHaveBeenCalledOnce();
    expect(tx.rateLimitHit.create).toHaveBeenCalledWith({
      data: { key: "api:ip:127.0.0.1" },
    });
  });

  it("throws RateLimitError when the window is full", async () => {
    const { client, tx } = makeClient(RATE_LIMIT_MAX_REQUESTS);

    await expect(
      assertRateLimit(client as never, "api:ip:127.0.0.1"),
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(tx.rateLimitHit.create).not.toHaveBeenCalled();
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
