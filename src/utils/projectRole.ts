import type { ProjectRole } from "~/server/api/access";

export function canManageProject(role: ProjectRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
