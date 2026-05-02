import { describe, expect, it } from "vitest";

import { formatDate, isOverdue, relativeDeadline } from "./date";

describe("formatDate", () => {
  it("returns em-dash for nullish values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns em-dash for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formats valid dates", () => {
    // We don't assert exact locale output (depends on the test runner's
    // locale) — just that it produced a non-empty, non-fallback string.
    const out = formatDate(new Date("2025-01-15"));
    expect(out).not.toBe("—");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("relativeDeadline", () => {
  const now = new Date("2025-01-15T12:00:00Z");

  it("handles missing deadline", () => {
    expect(relativeDeadline(null, now)).toBe("No deadline");
  });

  it("identifies today/tomorrow/yesterday", () => {
    expect(relativeDeadline(new Date("2025-01-15T05:00:00Z"), now)).toBe(
      "Today",
    );
    expect(relativeDeadline(new Date("2025-01-16T05:00:00Z"), now)).toBe(
      "Tomorrow",
    );
    expect(relativeDeadline(new Date("2025-01-14T05:00:00Z"), now)).toBe(
      "Yesterday",
    );
  });

  it("formats future and past distances", () => {
    expect(relativeDeadline(new Date("2025-01-22T05:00:00Z"), now)).toBe(
      "in 7 days",
    );
    expect(relativeDeadline(new Date("2025-01-10T05:00:00Z"), now)).toBe(
      "5 days ago",
    );
  });
});

describe("isOverdue", () => {
  const now = new Date("2025-01-15T12:00:00Z");

  it("returns true for past dates", () => {
    expect(isOverdue(new Date("2025-01-14"), now)).toBe(true);
  });

  it("returns false for today and the future", () => {
    expect(isOverdue(new Date("2025-01-15"), now)).toBe(false);
    expect(isOverdue(new Date("2025-02-01"), now)).toBe(false);
  });

  it("treats nullish as not overdue", () => {
    expect(isOverdue(null, now)).toBe(false);
    expect(isOverdue(undefined, now)).toBe(false);
  });
});
