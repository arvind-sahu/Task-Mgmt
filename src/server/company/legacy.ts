import type { PrismaClient } from "@prisma/client";

import { normalizeCompanyName } from "~/server/company";
import { domainFromEmail } from "~/server/company/domain";
import { uniqueCompanySlug } from "~/server/company/slug";

/**
 * Migrates legacy users who only have `User.companyName` into a `Company` row.
 * First user with a given company name becomes ROOT; later users join as MEMBER.
 */
export async function ensureLegacyWorkspace(
  db: PrismaClient,
  userId: string,
): Promise<string | null> {
  const existing = await db.companyMember.findFirst({
    where: { userId },
    select: { companyId: true },
  });
  if (existing) return existing.companyId;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { companyName: true, email: true },
  });
  if (!user?.companyName) return null;

  const name = normalizeCompanyName(user.companyName);
  let company = await db.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, rootUserId: true },
  });

  if (!company) {
    const emailDomain = domainFromEmail(user.email) ?? "unknown.local";
    company = await db.company.create({
      data: {
        name,
        slug: await uniqueCompanySlug(db, name),
        emailDomain,
        rootUserId: userId,
        members: {
          create: { userId, role: "ROOT" },
        },
      },
      select: { id: true, rootUserId: true },
    });
  } else {
    const isRoot = company.rootUserId === userId;
    await db.companyMember.upsert({
      where: {
        companyId_userId: { companyId: company.id, userId },
      },
      create: {
        companyId: company.id,
        userId,
        role: isRoot ? "ROOT" : "MEMBER",
      },
      update: {},
    });
  }

  await db.project.updateMany({
    where: {
      companyId: null,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    data: { companyId: company.id },
  });

  return company.id;
}
