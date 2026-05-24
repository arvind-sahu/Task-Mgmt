import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

type DbClient = typeof db;
export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER";

const roleRank: Record<ProjectRole, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * Throw 403 if `userId` is not a member or owner of `projectId`. Returns the
 * resolved role on success so callers can do role-based checks.
 *
 * Centralizing this logic keeps every router endpoint consistent and makes
 * it trivial to unit-test (see src/server/api/__tests__).
 */
export async function assertProjectAccess(
  db: DbClient,
  projectId: string,
  userId: string,
  required: ProjectRole | "ANY" = "ANY",
): Promise<ProjectRole> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: { where: { userId }, select: { role: true } },
    },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  // Owner short-circuits: always full access.
  if (project.ownerId === userId) return "OWNER";

  const membership = project.members[0];
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this project",
    });
  }

  if (required !== "ANY") {
    const memberRole = membership.role as ProjectRole;
    const memberRank = roleRank[memberRole] ?? 0;
    const requiredRank = roleRank[required] ?? Number.MAX_SAFE_INTEGER;

    if (memberRank < requiredRank) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requires ${required} role`,
      });
    }
  }

  return membership.role;
}

/** Owners and admins can manage members, invites, and project settings. */
export function canManageProject(role: ProjectRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
