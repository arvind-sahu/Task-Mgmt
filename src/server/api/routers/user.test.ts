import { describe, expect, it, vi, type Mock } from "vitest";
import bcrypt from "bcryptjs";
import { type PrismaClient } from "@prisma/client";

import { createCaller } from "~/server/api/root";

// Shape of the `data` arg passed into `db.user.create({ data })`. Captured
// in a named type so the test mocks aren't fighting `any`.
interface CreateUserArg {
  data: {
    email: string;
    name: string;
    password: string;
  };
}

interface DbMocks {
  findUnique?: Mock;
  create?: Mock;
  update?: Mock;
}

/**
 * Build a minimal tRPC context for tests. The router's `register` mutation
 * only exercises `db.user.findUnique` and `db.user.create`, so we mock just
 * those and cast through `unknown`.
 */
function makeCtx(opts: DbMocks) {
  const findUnique = opts.findUnique ?? vi.fn().mockResolvedValue(null);
  const create =
    opts.create ??
    vi.fn(async ({ data }: CreateUserArg) => ({
      id: "u_new",
      email: data.email,
      name: data.name,
    }));

  const update = opts.update ?? vi.fn().mockResolvedValue({ id: "u1" });

  const db = {
    user: { findUnique, create, update },
    emailOtp: {
      create: vi.fn().mockResolvedValue({ id: "otp_1" }),
      findFirst: vi.fn().mockResolvedValue({
        id: "otp_1",
        codeHash: "$2a$10$B2q9xL6guB8xQJ0I95r8Auj7mXlv5wVCK8SPoaqe7i0rGUNShUMy2", // hash for "123456"
      }),
      update: vi.fn().mockResolvedValue({ id: "otp_1", consumedAt: new Date() }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        rateLimitHit: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: "hit-1" }),
        },
      }),
    ),
    rateLimitHit: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as PrismaClient;

  return {
    db,
    session: null,
    clientIp: "127.0.0.1",
    mocks: { findUnique, create, update },
  };
}

describe("user.register", () => {
  it("rejects an existing email with CONFLICT", async () => {
    const ctx = makeCtx({
      findUnique: vi.fn().mockResolvedValue({ id: "u1" }),
    });
    const caller = createCaller(ctx);
    await expect(
      caller.user.register({
        name: "Alice",
        email: "alice@example.com",
        password: "longenough",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("hashes the password before persisting", async () => {
    const create: Mock = vi.fn(async ({ data }: CreateUserArg) => ({
      id: "u_new",
      email: data.email,
      name: data.name,
    }));
    const ctx = makeCtx({ create });

    const caller = createCaller(ctx);
    const result = await caller.user.register({
      name: "Alice",
      email: "Alice@Example.com",
      password: "longenough",
    });

    expect(result).toMatchObject({ email: "alice@example.com" });
    expect(create).toHaveBeenCalledTimes(1);

    // Reach into the captured call args; cast to our known shape.
    const firstCall = create.mock.calls[0] as [CreateUserArg];
    const stored = firstCall[0].data.password;
    expect(stored).not.toBe("longenough"); // never plaintext
    expect(await bcrypt.compare("longenough", stored)).toBe(true);
  });

  it("rejects invalid input via the zod schema", async () => {
    const caller = createCaller(makeCtx({}));
    await expect(
      caller.user.register({
        name: "A",
        email: "not-an-email",
        password: "short",
      }),
    ).rejects.toThrow();
  });

  it("requires strong password for resetPassword", async () => {
    const caller = createCaller(makeCtx({}));
    await expect(
      caller.user.resetPassword({
        email: "alice@example.com",
        otp: "123456",
        password: "weakpass",
      }),
    ).rejects.toThrow();
  });

  it("requires strong password for sendSignupOtp payload", async () => {
    const caller = createCaller(makeCtx({}));
    await expect(
      caller.user.sendSignupOtp({
        name: "Alice",
        email: "alice@example.com",
        password: "weakpass",
      }),
    ).rejects.toThrow();
  });
});
