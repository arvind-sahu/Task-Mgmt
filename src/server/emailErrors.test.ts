import { describe, expect, it } from "vitest";

import {
  EMAIL_DELIVERY_FAILED_MESSAGE,
  friendlyEmailSendErrorMessage,
  sanitizeEmailErrorForDisplay,
} from "~/utils/emailErrors";

describe("friendlyEmailSendErrorMessage", () => {
  it("maps Gmail bad credentials to a safe message", () => {
    const raw =
      "Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to 535 5.7.8 https://support.google.com/mail/?p=BadCredentials d2e1a72fcca58 - gsmtp";
    expect(friendlyEmailSendErrorMessage(new Error(raw))).toBe(
      EMAIL_DELIVERY_FAILED_MESSAGE,
    );
  });

  it("maps network errors", () => {
    expect(friendlyEmailSendErrorMessage(new Error("connect ETIMEDOUT"))).toBe(
      "We couldn't reach the mail server. Check your connection and try again.",
    );
  });

  it("uses default for unknown errors", () => {
    expect(friendlyEmailSendErrorMessage(new Error("something weird"))).toBe(
      EMAIL_DELIVERY_FAILED_MESSAGE,
    );
  });
});

describe("sanitizeEmailErrorForDisplay", () => {
  it("leaves normal API messages unchanged", () => {
    expect(sanitizeEmailErrorForDisplay("Invalid email or password")).toBe(
      "Invalid email or password",
    );
  });

  it("sanitizes leaked SMTP text", () => {
    expect(
      sanitizeEmailErrorForDisplay(
        "Invalid login: 535-5.7.8 Username and Password not accepted",
      ),
    ).toBe(EMAIL_DELIVERY_FAILED_MESSAGE);
  });
});
