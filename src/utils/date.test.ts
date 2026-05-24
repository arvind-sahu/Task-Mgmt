import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  isOverdue,
  relativeDeadline,
  wasEdited,
} from "./date";

describe("formatDate", () => {
  it("returns em dash for nullish values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats a valid date", () => {
    const result = formatDate(new Date("2024-06-15T12:00:00Z"));
    expect(result).toMatch(/2024/);
  });
});

describe("formatDateTime", () => {
  it("includes time components", () => {
    const result = formatDateTime(new Date("2024-06-15T14:30:00"));
    expect(result).toMatch(/2024/);
  });
});

describe("wasEdited", () => {
  it("is false when created and updated are nearly equal", () => {
    const t = new Date("2024-01-01T12:00:00Z");
    expect(wasEdited(t, t)).toBe(false);
  });

  it("is true when updated is much later", () => {
    const created = new Date("2024-01-01T12:00:00Z");
    const updated = new Date("2024-01-02T12:00:00Z");
    expect(wasEdited(created, updated)).toBe(true);
  });
});

describe("relativeDeadline", () => {
  const now = new Date(2024, 5, 15, 12, 0, 0);

  it("returns Today for same calendar day", () => {
    expect(relativeDeadline(new Date(2024, 5, 15, 23, 0, 0), now)).toBe(
      "Today",
    );
  });

  it("returns Tomorrow", () => {
    expect(relativeDeadline(new Date(2024, 5, 16, 10, 0, 0), now)).toBe(
      "Tomorrow",
    );
  });

  it("returns overdue phrasing for past dates", () => {
    expect(relativeDeadline(new Date(2024, 5, 10, 10, 0, 0), now)).toMatch(
      /ago/,
    );
  });
});

describe("isOverdue", () => {
  const now = new Date(2024, 5, 15, 12, 0, 0);

  it("is false without a deadline", () => {
    expect(isOverdue(null, now)).toBe(false);
  });

  it("is true for past calendar days", () => {
    expect(isOverdue(new Date(2024, 5, 10, 10, 0, 0), now)).toBe(true);
  });

  it("is false for future calendar days", () => {
    expect(isOverdue(new Date(2024, 5, 20, 10, 0, 0), now)).toBe(false);
  });
});
