import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

import type { CompanyRoleValue as CompanyRole } from "~/constants/company";

import { ensureLegacyWorkspace } from "~/server/company/legacy";

export function parseCompanyIdFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("tasker_company_id=")) {
      const value = trimmed.slice("tasker_company_id=".length);
      if (value) return decodeURIComponent(value);
    }
  }
  return undefined;
}

export type ActiveCompanyContext = {
  companyId: string;
  role: CompanyRole;
  company: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    timezone: string;
    logoUrl: string | null;
    setupCompletedAt: Date | null;
    emailDomain: string;
  };
};

export async function resolveActiveCompany(
  db: PrismaClient,
  userId: string,
  cookieCompanyId?: string,
): Promise<ActiveCompanyContext | null> {
  await ensureLegacyWorkspace(db, userId);

  const memberships = await db.companyMember.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          timezone: true,
          logoUrl: true,
          setupCompletedAt: true,
          emailDomain: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const preferred =
    cookieCompanyId &&
    memberships.find((m) => m.companyId === cookieCompanyId);
  const active = preferred ?? memberships[0]!;

  return {
    companyId: active.companyId,
    role: active.role,
    company: active.company,
  };
}

export async function requireActiveCompany(
  db: PrismaClient,
  userId: string,
  cookieCompanyId?: string,
  minimumRole?: CompanyRole,
): Promise<ActiveCompanyContext> {
  const ctx = await resolveActiveCompany(db, userId, cookieCompanyId);
  if (!ctx) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Join or create a company workspace to continue.",
    });
  }
  if (minimumRole) {
    const { hasMinCompanyRole } = await import("~/server/company/permissions");
    if (!hasMinCompanyRole(ctx.role, minimumRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission for this action.",
      });
    }
  }
  return ctx;
}
