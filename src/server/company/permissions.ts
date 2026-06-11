import type { CompanyRoleValue as CompanyRole } from "~/constants/company";

const ROLE_RANK: Record<CompanyRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
  SUPER_ADMIN: 4,
  ROOT: 5,
};

/** Roles an inviter may assign via company invite. */
const INVITEABLE_BY: Record<CompanyRole, CompanyRole[]> = {
  ROOT: ["SUPER_ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  SUPER_ADMIN: ["MANAGER", "MEMBER", "VIEWER"],
  MANAGER: ["MEMBER", "VIEWER"],
  MEMBER: [],
  VIEWER: [],
};

export function companyRoleRank(role: CompanyRole): number {
  return ROLE_RANK[role] ?? 0;
}

export function hasMinCompanyRole(
  actual: CompanyRole,
  minimum: CompanyRole,
): boolean {
  return companyRoleRank(actual) >= companyRoleRank(minimum);
}

export function canInviteCompanyRole(
  inviter: CompanyRole,
  target: CompanyRole,
): boolean {
  if (target === "ROOT") return false;
  return INVITEABLE_BY[inviter]?.includes(target) ?? false;
}

export function canManageCompanySettings(role: CompanyRole): boolean {
  return role === "ROOT" || role === "SUPER_ADMIN";
}

export function canCreateCompanyProjects(role: CompanyRole): boolean {
  return hasMinCompanyRole(role, "MANAGER");
}

export function canInviteCompanyUsers(role: CompanyRole): boolean {
  return (INVITEABLE_BY[role]?.length ?? 0) > 0;
}
