export function isProbablyHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function hasRichTextContent(html: string): boolean {
  if (!html.trim()) return false;
  if (/<img\b/i.test(html)) return true;
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim().length > 0;
}

/** Strip rich-text HTML for list previews, search, and notifications. */
export function richTextToPlainText(html: string): string {
  if (!html.trim()) return "";

  if (!isProbablyHtml(html)) {
    return html.replace(/\s+/g, " ").trim();
  }

  const withoutTags = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeBasicHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}
