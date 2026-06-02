import { sanitizePlainText } from "~/server/security/sanitize";

/** Normalize organization name for display and case-insensitive matching. */
export function normalizeCompanyName(value: string): string {
  return sanitizePlainText(value).replace(/\s+/g, " ").trim();
}

export function companyNamesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return (
    normalizeCompanyName(left).toLowerCase() ===
    normalizeCompanyName(right).toLowerCase()
  );
}
