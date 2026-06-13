import { describe, expect, it } from "vitest";

import { sanitizeRichTextHtml } from "./sanitizeHtml";

describe("sanitizeRichTextHtml", () => {
  it("keeps safe formatting tags", () => {
    const html = "<p>Hello <strong>team</strong></p><ul><li>One</li></ul>";
    expect(sanitizeRichTextHtml(html)).toContain("<strong>team</strong>");
    expect(sanitizeRichTextHtml(html)).toContain("<ul>");
  });

  it("stores images by storage key without src", () => {
    const html =
      '<p>See below</p><img data-storage-key="tasks-attachments/user/file.png" alt="shot" />';
    const sanitized = sanitizeRichTextHtml(html);
    expect(sanitized).toContain("data-storage-key=\"tasks-attachments/user/file.png\"");
    expect(sanitized).not.toContain("src=");
  });

  it("removes script handlers", () => {
    const html = "<p onclick=\"alert(1)\">bad</p>";
    expect(sanitizeRichTextHtml(html)).not.toContain("onclick");
  });
});
