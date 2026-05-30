const HTML_TAG = /<[^>]*>/g;
const SCRIPT_PROTOCOL = /javascript:/gi;
const EVENT_HANDLER = /\bon[a-z]+\s*=/gi;

/** Strip HTML/script patterns from user-authored plain text before persistence. */
export function sanitizePlainText(value: string): string {
  return value
    .replace(HTML_TAG, "")
    .replace(SCRIPT_PROTOCOL, "")
    .replace(EVENT_HANDLER, "")
    .replace(/\u0000/g, "")
    .trim();
}

export function sanitizeOptionalPlainText(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const sanitized = sanitizePlainText(value);
  return sanitized.length ? sanitized : undefined;
}
