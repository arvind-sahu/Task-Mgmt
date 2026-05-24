import { describe, expect, it } from "vitest";

import { canManageProject } from "./projectRole";

describe("canManageProject", () => {
  it("matches server access helper rules", () => {
    expect(canManageProject("OWNER")).toBe(true);
    expect(canManageProject("ADMIN")).toBe(true);
    expect(canManageProject("MEMBER")).toBe(false);
  });
});
