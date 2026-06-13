import DOMPurify from "isomorphic-dompurify";

import { isAllowedTaskAttachmentKey } from "~/server/storage/s3";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "a",
  "img",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "data-storage-key",
  "data-list-style",
  "class",
  "alt",
  "src",
];

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "data-storage-key" && node.tagName === "IMG") {
    const key = data.attrValue;
    if (!key || !isAllowedTaskAttachmentKey(key)) {
      data.forceKeepAttr = false;
      data.attrValue = "";
    }
    return;
  }

  if (data.attrName === "data-list-style" && (node.tagName === "OL" || node.tagName === "UL")) {
    const allowed = new Set([
      "disc",
      "circle",
      "square",
      "decimal",
      "lower-alpha",
      "upper-alpha",
      "lower-roman",
      "upper-roman",
    ]);
    if (!allowed.has(data.attrValue)) {
      data.forceKeepAttr = false;
      data.attrValue = "";
    }
  }
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName !== "IMG") return;
  const key = node.getAttribute("data-storage-key");
  if (key) {
    node.removeAttribute("src");
  }
  node.removeAttribute("style");
});

/** Sanitize persisted rich text (Jira-style descriptions and comments). */
export function sanitizeRichTextHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  }).trim();
}

export function sanitizeOptionalRichTextHtml(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const sanitized = sanitizeRichTextHtml(value);
  if (!sanitized) return undefined;

  const hasImage = /<img\b/i.test(sanitized);
  const textOnly = sanitized.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
  if (!textOnly && !hasImage) return undefined;
  return sanitized;
}
