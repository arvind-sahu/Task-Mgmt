/** Company plan values — mirrors Prisma `CompanyPlan` (use these until client is regenerated). */
export const COMPANY_PLANS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export type CompanyPlanValue = (typeof COMPANY_PLANS)[number];
export const DEFAULT_COMPANY_PLAN: CompanyPlanValue = "FREE";

/** Company role values — mirrors Prisma `CompanyRole`. */
export const COMPANY_ROLES = [
  "ROOT",
  "SUPER_ADMIN",
  "MANAGER",
  "MEMBER",
  "VIEWER",
] as const;
export type CompanyRoleValue = (typeof COMPANY_ROLES)[number];
