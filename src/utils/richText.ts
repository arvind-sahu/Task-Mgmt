export function isProbablyHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function hasRichTextContent(html: string): boolean {
  if (!html.trim()) return false;
  if (/<img\b/i.test(html)) return true;
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim().length > 0;
}
