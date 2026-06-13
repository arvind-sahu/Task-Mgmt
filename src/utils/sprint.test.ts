import { describe, expect, it } from "vitest";

import { resolveSprintLabel, sortSprintsByStart } from "./sprint";

describe("sprint helpers", () => {
  it("sorts sprints by start date", () => {
    const sorted = sortSprintsByStart([
      { startDate: "2026-02-01", name: "Sprint 2" },
      { startDate: "2026-01-01", name: "Sprint 1" },
    ]);
    expect(sorted.map((sprint) => sprint.name)).toEqual(["Sprint 1", "Sprint 2"]);
  });

  it("resolves numbered sprint labels", () => {
    expect(resolveSprintLabel({ name: "Sprint 4" }, 3)).toBe("Sprint 4");
    expect(resolveSprintLabel({ name: "Release sprint 2" }, 1)).toBe("Sprint 2");
    expect(resolveSprintLabel({ name: "" }, 0)).toBe("Sprint 1");
  });
});
