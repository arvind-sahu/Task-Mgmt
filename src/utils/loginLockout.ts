/** Client-safe helper for login / OTP lockout responses from tRPC. */
export function isLoginLockoutError(error: unknown) {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { code?: string } }).data;
    if (data?.code === "TOO_MANY_REQUESTS") return true;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    return (
      message.includes("Sign in again") || message.includes("Try again in")
    );
  }

  return false;
}
