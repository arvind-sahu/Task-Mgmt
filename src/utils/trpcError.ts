import { sanitizeEmailErrorForDisplay } from "~/utils/emailErrors";

/**
 * Prefer the tRPC error message, with a safe fallback for OTP / email flows.
 */
export function getTrpcMutationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (message.trim()) {
      return sanitizeEmailErrorForDisplay(message);
    }
  }
  return fallback;
}
