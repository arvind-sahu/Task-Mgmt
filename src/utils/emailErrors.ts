/** User-safe message when outbound email cannot be sent. */
export const EMAIL_DELIVERY_FAILED_MESSAGE =
  "We couldn't send the verification email. Please try again in a few minutes.";

const TECHNICAL_EMAIL_PATTERNS = [
  /invalid login/i,
  /535[\s-]?5\.7\.8/i,
  /badcredentials/i,
  /eauth/i,
  /gsmtp/i,
  /support\.google\.com\/mail/i,
  /authentication failed/i,
  /self signed certificate/i,
  /certificate/i,
  /etimedout/i,
  /econnrefused/i,
  /enotfound/i,
  /getaddrinfo/i,
  /socket/i,
  /nodemailer/i,
];

function extractErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function friendlyEmailSendErrorMessage(error: unknown): string {
  const raw = extractErrorText(error);
  if (!raw.trim()) return EMAIL_DELIVERY_FAILED_MESSAGE;

  if (
    /535|5\.7\.8|invalid login|badcredentials|eauth|authentication failed/i.test(
      raw,
    )
  ) {
    return EMAIL_DELIVERY_FAILED_MESSAGE;
  }

  if (/etimedout|econnrefused|enotfound|getaddrinfo|network/i.test(raw)) {
    return "We couldn't reach the mail server. Check your connection and try again.";
  }

  if (TECHNICAL_EMAIL_PATTERNS.some((re) => re.test(raw))) {
    return EMAIL_DELIVERY_FAILED_MESSAGE;
  }

  return EMAIL_DELIVERY_FAILED_MESSAGE;
}

export function sanitizeEmailErrorForDisplay(message: string): string {
  if (TECHNICAL_EMAIL_PATTERNS.some((re) => re.test(message))) {
    return EMAIL_DELIVERY_FAILED_MESSAGE;
  }
  return message;
}
