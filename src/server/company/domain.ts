/** Normalize domain input (`acme.com` or `@acme.com`). */
export function normalizeEmailDomain(value: string): string {
  return value.replace(/^@+/, "").toLowerCase().trim();
}

export function emailMatchesDomain(email: string, domain: string): boolean {
  const normalized = email.toLowerCase().trim();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return false;
  const emailDomain = normalized.slice(at + 1);
  return emailDomain === normalizeEmailDomain(domain);
}

export function domainFromEmail(email: string): string | null {
  const normalized = email.toLowerCase().trim();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return null;
  return normalized.slice(at + 1);
}
