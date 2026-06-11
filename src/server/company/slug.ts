import type { PrismaClient } from "@prisma/client";

export function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "workspace";
}

export async function uniqueCompanySlug(
  db: PrismaClient,
  baseName: string,
): Promise<string> {
  const base = slugifyCompanyName(baseName);
  let slug = base;
  let suffix = 0;
  while (await db.company.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}
