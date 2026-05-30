import { describe, expect, it } from "vitest";

import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "./sanitize";

describe("sanitizePlainText", () => {
  it("strips HTML tags", () => {
    expect(sanitizePlainText("<b>Hello</b> world")).toBe("Hello world");
  });

  it("removes javascript: protocol fragments", () => {
    expect(sanitizePlainText("click javascript:alert(1) now")).toBe(
      "click alert(1) now",
    );
  });

  it("removes inline event handlers", () => {
    expect(sanitizePlainText('bad onclick=alert(1) value')).toBe(
      "bad alert(1) value",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizePlainText("  safe text  ")).toBe("safe text");
  });
});

describe("sanitizeOptionalPlainText", () => {
  it("returns undefined for nullish values", () => {
    expect(sanitizeOptionalPlainText(null)).toBeUndefined();
    expect(sanitizeOptionalPlainText(undefined)).toBeUndefined();
  });

  it("returns undefined when sanitization leaves an empty string", () => {
    expect(sanitizeOptionalPlainText("   <i></i>   ")).toBeUndefined();
  });

  it("sanitizes optional strings", () => {
    expect(sanitizeOptionalPlainText("<script>x</script>note")).toBe("xnote");
  });
});
