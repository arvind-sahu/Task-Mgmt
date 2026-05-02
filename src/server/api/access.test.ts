import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { ProjectRole, type PrismaClient } from "@prisma/client";

import { assertProjectAccess } from "./access";

/**
 * Tiny helper: build a `PrismaClient`-shaped object with just the
 * `project.findUnique` method mocked. Casting through `unknown` is fine here
 * because `assertProjectAccess` only touches that one method.
 */
function makeDb(impl: ReturnType<typeof vi.fn>): PrismaClient {
  return {
    project: { findUnique: impl },
  } as unknown as PrismaClient;
}

describe("assertProjectAccess", () => {
  it("throws NOT_FOUND when the project doesn't exist", async () => {
    const db = makeDb(vi.fn().mockResolvedValue(null));
    await expect(
      assertProjectAccess(db, "p1", "u1"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns OWNER when the user is the project owner", async () => {
    const db = makeDb(
      vi.fn().mockResolvedValue({ ownerId: "u1", members: [] }),
    );
    expect(await assertProjectAccess(db, "p1", "u1")).toBe("OWNER");
  });

  it("throws FORBIDDEN when the user is not a member", async () => {
    const db = makeDb(
      vi.fn().mockResolvedValue({ ownerId: "u2", members: [] }),
    );
    await expect(
      assertProjectAccess(db, "p1", "u1"),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("returns the membership role for non-owners", async () => {
    const db = makeDb(
      vi.fn().mockResolvedValue({
        ownerId: "u2",
        members: [{ role: ProjectRole.MEMBER }],
      }),
    );
    expect(await assertProjectAccess(db, "p1", "u1")).toBe("MEMBER");
  });

  it("enforces the required role hierarchy", async () => {
    // A MEMBER cannot pass an ADMIN-required check.
    const memberDb = makeDb(
      vi.fn().mockResolvedValue({
        ownerId: "u2",
        members: [{ role: ProjectRole.MEMBER }],
      }),
    );
    await expect(
      assertProjectAccess(memberDb, "p1", "u1", ProjectRole.ADMIN),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // An ADMIN can pass an ADMIN-required check.
    const adminDb = makeDb(
      vi.fn().mockResolvedValue({
        ownerId: "u2",
        members: [{ role: ProjectRole.ADMIN }],
      }),
    );
    expect(
      await assertProjectAccess(adminDb, "p1", "u1", ProjectRole.ADMIN),
    ).toBe("ADMIN");

    // The OWNER short-circuit works regardless of `required`.
    const ownerDb = makeDb(
      vi.fn().mockResolvedValue({ ownerId: "u1", members: [] }),
    );
    expect(
      await assertProjectAccess(ownerDb, "p1", "u1", ProjectRole.ADMIN),
    ).toBe("OWNER");
  });
});
