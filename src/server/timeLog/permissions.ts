import { TRPCError } from "@trpc/server";

import {
  type ProjectRole,
  canManageProject,
} from "~/server/api/access";

export const MEMBER_TIME_LOG_EDIT_DAYS = 7;
export const TIME_LOG_CSV_MAX_ROWS = 10_000;

export function canEditTimeLog(
  projectRole: ProjectRole,
  actorId: string,
  logUserId: string,
  createdAt: Date,
): boolean {
  if (canManageProject(projectRole)) return true;
  if (actorId !== logUserId) return false;
  const ageMs = Date.now() - createdAt.getTime();
  return ageMs < MEMBER_TIME_LOG_EDIT_DAYS * 24 * 60 * 60 * 1000;
}

export function canDeleteTimeLog(
  projectRole: ProjectRole,
  actorId: string,
  logUserId: string,
): boolean {
  return canManageProject(projectRole) || actorId === logUserId;
}

export function assertCanEditTimeLog(
  projectRole: ProjectRole,
  actorId: string,
  logUserId: string,
  createdAt: Date,
) {
  if (!canEditTimeLog(projectRole, actorId, logUserId, createdAt)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot edit this time log",
    });
  }
}

export function assertCanDeleteTimeLog(
  projectRole: ProjectRole,
  actorId: string,
  logUserId: string,
) {
  if (!canDeleteTimeLog(projectRole, actorId, logUserId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot delete this time log",
    });
  }
}
