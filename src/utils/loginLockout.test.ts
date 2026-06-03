import { describe, expect, it } from "vitest";

import { isLoginLockoutError } from "./loginLockout";

describe("isLoginLockoutError", () => {
  it("detects TOO_MANY_REQUESTS tRPC client errors", () => {
    expect(
      isLoginLockoutError({
        data: { code: "TOO_MANY_REQUESTS" },
        message: "Try again in 30 minutes.",
      }),
    ).toBe(true);
  });

  it("detects lockout messages without structured data", () => {
    expect(
      isLoginLockoutError({
        message: "Too many incorrect verification codes. Sign in again in 30 minutes.",
      }),
    ).toBe(true);
  });

  it("returns false for normal auth errors", () => {
    expect(
      isLoginLockoutError({
        data: { code: "UNAUTHORIZED" },
        message: "Invalid email or password",
      }),
    ).toBe(false);
  });
});
