import { describe, expect, it } from "vitest";

import {
  getHomeTimeThemeFromDate,
  resolveHomeTimeTheme,
} from "~/utils/homeTimeTheme";

describe("getHomeTimeThemeFromDate", () => {
  it("maps local hours to the correct theme slot", () => {
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 5, 30))).toBe("sunrise");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 8, 0))).toBe("morning");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 10, 0))).toBe("late-morning");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 13, 0))).toBe("noon");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 16, 0))).toBe("afternoon");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 19, 0))).toBe("sunset");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 22, 0))).toBe("night");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 1, 0))).toBe("late-night");
    expect(getHomeTimeThemeFromDate(new Date(2026, 4, 31, 4, 0))).toBe("pre-dawn");
  });
});

describe("resolveHomeTimeTheme", () => {
  it("uses explicit slot overrides for preview", () => {
    expect(
      resolveHomeTimeTheme(new Date(2026, 4, 31, 22, 0), "sunset"),
    ).toBe("sunset");
    expect(
      resolveHomeTimeTheme(new Date(2026, 4, 31, 8, 0), "late-night"),
    ).toBe("late-night");
  });

  it("uses auto time when override is auto", () => {
    expect(
      resolveHomeTimeTheme(new Date(2026, 4, 31, 8, 0), "auto"),
    ).toBe("morning");
  });
});
