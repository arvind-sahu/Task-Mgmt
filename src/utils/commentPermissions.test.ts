import { describe, expect, it } from "vitest";

import { canModifyTaskComment } from "./commentPermissions";

describe("canModifyTaskComment", () => {
  it("allows the comment author", () => {
    expect(
      canModifyTaskComment("u1", "u1", {
        isProjectOwner: false,
        companyRole: "MEMBER",
      }),
    ).toBe(true);
  });

  it("allows project owners", () => {
    expect(
      canModifyTaskComment("u2", "u1", {
        isProjectOwner: true,
        companyRole: "MEMBER",
      }),
    ).toBe(true);
  });

  it("allows company super admins", () => {
    expect(
      canModifyTaskComment("u2", "u1", {
        isProjectOwner: false,
        companyRole: "SUPER_ADMIN",
      }),
    ).toBe(true);
  });

  it("denies other members", () => {
    expect(
      canModifyTaskComment("u2", "u1", {
        isProjectOwner: false,
        companyRole: "MANAGER",
      }),
    ).toBe(false);
  });
});
