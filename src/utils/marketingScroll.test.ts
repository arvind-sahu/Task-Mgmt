import { describe, expect, it } from "vitest";

import { sunsetArcPosition, sunArcPositionForTheme } from "~/utils/marketingScroll";

describe("marketingScroll sun paths", () => {
  it("uses a diagonal sinking path for sunset", () => {
    const start = sunsetArcPosition(0, false);
    const end = sunsetArcPosition(1, false);

    expect(start.left).toBeLessThan(20);
    expect(start.top).toBeLessThan(35);
    expect(end.left).toBeGreaterThan(85);
    expect(end.top).toBeGreaterThan(80);
    expect(start.sink).toBe(0);
    expect(end.sink).toBeGreaterThan(0.7);
  });

  it("routes sunset theme to the sunset arc", () => {
    const sunset = sunArcPositionForTheme("sunset", 1, false);
    expect(sunset.sink).toBeDefined();
    expect(sunset.left).toBeGreaterThan(85);
  });
});
