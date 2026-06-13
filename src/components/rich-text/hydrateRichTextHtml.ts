/** Resolve S3 storage keys to preview URLs inside persisted HTML. */
export async function hydrateRichTextHtml(
  html: string,
  resolveKey: (key: string) => Promise<string | null>,
): Promise<string> {
  if (!html.trim() || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const images = doc.querySelectorAll("img[data-storage-key]");

  await Promise.all(
    Array.from(images).map(async (img) => {
      const key = img.getAttribute("data-storage-key");
      if (!key) return;
      const url = await resolveKey(key);
      if (url) img.setAttribute("src", url);
    }),
  );

  return doc.body.innerHTML;
}
