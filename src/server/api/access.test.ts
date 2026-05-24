import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { ProjectRole, type PrismaClient } from "@prisma/client";

import { assertProjectAccess, canManageProject } from "./access";

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
    const memberDb = makeDb(
      vi.fn().mockResolvedValue({
        ownerId: "u2",
        members: [{ role: ProjectRole.MEMBER }],
      }),
    );
    await expect(
      assertProjectAccess(memberDb, "p1", "u1", ProjectRole.ADMIN),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminDb = makeDb(
      vi.fn().mockResolvedValue({
        ownerId: "u2",
        members: [{ role: ProjectRole.ADMIN }],
      }),
    );
    expect(
      await assertProjectAccess(adminDb, "p1", "u1", ProjectRole.ADMIN),
    ).toBe("ADMIN");

    const ownerDb = makeDb(
      vi.fn().mockResolvedValue({ ownerId: "u1", members: [] }),
    );
    expect(
      await assertProjectAccess(ownerDb, "p1", "u1", ProjectRole.ADMIN),
    ).toBe("OWNER");
  });
});

describe("canManageProject", () => {
  it("allows OWNER and ADMIN", () => {
    expect(canManageProject("OWNER")).toBe(true);
    expect(canManageProject("ADMIN")).toBe(true);
  });

  it("denies MEMBER", () => {
    expect(canManageProject("MEMBER")).toBe(false);
  });
});
