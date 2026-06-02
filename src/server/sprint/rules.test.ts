import { describe, expect, it } from "vitest";
import { SprintPlan } from "@prisma/client";

import {
  computeSprintEndDate,
  findInvalidSprintIds,
  sameDay,
  sprintMatchesDuration,
  startOfDay,
  timelineViolations,
} from "./rules";

describe("sprint rules", () => {
  it("computes a 7-day weekly sprint ending on day 7", () => {
    const start = startOfDay(new Date("2026-06-01"));
    const end = computeSprintEndDate(start, 1);
    expect(sameDay(end, new Date("2026-06-07"))).toBe(true);
  });

  it("detects duration mismatch", () => {
    const start = startOfDay(new Date("2026-06-01"));
    const badEnd = startOfDay(new Date("2026-06-05"));
    expect(sprintMatchesDuration(start, badEnd, 1)).toBe(false);
  });

  it("flags gaps in the sprint timeline", () => {
    const violation = timelineViolations([
      {
        startDate: startOfDay(new Date("2026-06-01")),
        endDate: startOfDay(new Date("2026-06-07")),
      },
      {
        startDate: startOfDay(new Date("2026-06-10")),
        endDate: startOfDay(new Date("2026-06-16")),
      },
    ]);
    expect(violation).toBe("gap");
  });

  it("finds invalid sprints for project rules", () => {
    const ids = findInvalidSprintIds(
      {
        sprintPlan: SprintPlan.WEEKLY,
        sprintDurationWeeks: 1,
        sprintStartDayOfWeek: null,
      },
      [
        {
          id: "good",
          startDate: startOfDay(new Date("2026-06-01")),
          endDate: startOfDay(new Date("2026-06-07")),
        },
        {
          id: "bad-duration",
          startDate: startOfDay(new Date("2026-06-08")),
          endDate: startOfDay(new Date("2026-06-12")),
        },
      ],
    );
    expect(ids).toContain("bad-duration");
  });
});
