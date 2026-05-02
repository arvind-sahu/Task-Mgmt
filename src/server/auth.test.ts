import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { credentialsSchema, verifyPassword } from "./auth";

describe("verifyPassword", () => {
  it("returns false when no hash is stored (e.g. OAuth-only users)", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", undefined)).toBe(false);
  });

  it("returns true for the matching plaintext", async () => {
    const hash = await bcrypt.hash("super-secret", 4);
    expect(await verifyPassword("super-secret", hash)).toBe(true);
  });

  it("returns false for a mismatched plaintext", async () => {
    const hash = await bcrypt.hash("super-secret", 4);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("credentialsSchema", () => {
  it("accepts a valid email and 8+ char password", () => {
    const r = credentialsSchema.safeParse({
      email: "alice@example.com",
      password: "longenough",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a short password", () => {
    const r = credentialsSchema.safeParse({
      email: "alice@example.com",
      password: "short",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = credentialsSchema.safeParse({
      email: "not-an-email",
      password: "longenough",
    });
    expect(r.success).toBe(false);
  });
});
