import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import {
  assertLoginNotLocked,
  LOGIN_OTP_MAX_ATTEMPTS,
  LOGIN_PASSWORD_MAX_ATTEMPTS,
  recordLoginOtpFailure,
  recordLoginPasswordFailure,
} from "./loginSecurity";

const scope = {
  email: "alice@example.com",
  ip: "203.0.113.10",
  userAgent: "Mozilla/5.0 Test Browser",
};

function makeDb() {
  const hits: Array<{ id: string; key: string; createdAt: Date }> = [];
  let seq = 0;

  const db = {
    rateLimitHit: {
      create: vi.fn(async ({ data }: { data: { key: string } }) => {
        const row = {
          id: `hit_${++seq}`,
          key: data.key,
          createdAt: new Date(),
        };
        hits.push(row);
        return row;
      }),
      count: vi.fn(async ({ where }: { where: { key: string; createdAt?: { gte: Date } } }) =>
        hits.filter(
          (hit) =>
            hit.key === where.key &&
            (!where.createdAt?.gte || hit.createdAt >= where.createdAt.gte),
        ).length,
      ),
      findFirst: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where: { key: string; createdAt?: { gte: Date } };
          orderBy?: { createdAt: "desc" };
        }) => {
          const matches = hits.filter(
            (hit) =>
              hit.key === where.key &&
              (!where.createdAt?.gte || hit.createdAt >= where.createdAt.gte),
          );
          if (orderBy?.createdAt === "desc") {
            return matches.at(-1) ?? null;
          }
          return matches[0] ?? null;
        },
      ),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const before = hits.length;
        for (let i = hits.length - 1; i >= 0; i -= 1) {
          const hit = hits[i]!;
          const keyFilter = where.key;
          if (typeof keyFilter === "string") {
            const createdAt = where.createdAt as { lt?: Date } | undefined;
            if (
              hit.key === keyFilter &&
              (!createdAt?.lt || hit.createdAt < createdAt.lt)
            ) {
              hits.splice(i, 1);
            }
          } else if (
            keyFilter &&
            typeof keyFilter === "object" &&
            "in" in keyFilter &&
            Array.isArray(keyFilter.in) &&
            keyFilter.in.includes(hit.key)
          ) {
            hits.splice(i, 1);
          }
        }
        return { count: before - hits.length };
      }),
    },
    loginAudit: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
    emailOtp: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as PrismaClient;

  return { db };
}

describe("loginSecurity", () => {
  it("locks out after repeated password failures", async () => {
    const { db } = makeDb();

    for (let i = 0; i < LOGIN_PASSWORD_MAX_ATTEMPTS - 1; i += 1) {
      await expect(
        recordLoginPasswordFailure(db, scope, "user_1"),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    }

    await expect(
      recordLoginPasswordFailure(db, scope, "user_1"),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });

    await expect(assertLoginNotLocked(db, "pwd", scope)).rejects.toBeInstanceOf(
      TRPCError,
    );
  });

  it("locks out after repeated OTP failures and invalidates OTPs", async () => {
    const { db } = makeDb();

    for (let i = 0; i < LOGIN_OTP_MAX_ATTEMPTS - 1; i += 1) {
      await expect(recordLoginOtpFailure(db, scope, "user_1")).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: expect.stringContaining("attempt"),
      });
    }

    await expect(recordLoginOtpFailure(db, scope, "user_1")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("Sign in again"),
    });

    expect(db.emailOtp.updateMany).toHaveBeenCalled();
  });

  it("records failed login audits with device metadata", async () => {
    const { db } = makeDb();

    await expect(
      recordLoginPasswordFailure(db, scope, "user_1"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(db.loginAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          method: "credentials_password_failed",
          ipAddress: scope.ip,
          deviceLabel: expect.stringContaining("Desktop"),
        }),
      }),
    );
  });
});
