import { useEffect, useMemo, useRef } from "react";

import DOMPurify from "isomorphic-dompurify";

import { isProbablyHtml } from "~/utils/richText";
import { api } from "~/utils/api";
import { requestObjectUrl } from "~/utils/objectUrls";

type RichTextContentProps = {
  html: string;
  className?: string;
  emptyLabel?: string;
  onClick?: () => void;
};

export function RichTextContent({
  html,
  className = "",
  emptyLabel = "Nothing here yet.",
  onClick,
}: RichTextContentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  const sanitized = useMemo(() => {
    if (!html.trim()) return "";
    if (!isProbablyHtml(html)) return "";
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
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
        "span",
      ],
      ALLOWED_ATTR: [
        "href",
        "target",
        "rel",
        "data-storage-key",
        "data-list-style",
        "data-type",
        "data-id",
        "data-label",
        "data-mention-suggestion-char",
        "class",
        "alt",
        "src",
      ],
      ALLOW_DATA_ATTR: true,
    });
  }, [html]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !sanitized) return;

    const images = root.querySelectorAll("img[data-storage-key], img:not([src])");
    let cancelled = false;

    images.forEach((img) => {
      const key = img.getAttribute("data-storage-key");
      if (!key) return;
      void requestObjectUrl(key, (input) =>
        utils.storage.getDownloadUrls.fetch(input),
      ).then((url) => {
        if (!cancelled && url) img.setAttribute("src", url);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [sanitized, utils.storage.getDownloadUrls]);

  if (!html.trim()) {
    return (
      <p className={`text-sm italic text-muted ${className}`}>{emptyLabel}</p>
    );
  }

  if (!sanitized) {
    const body = onClick ? (
      <button
        type="button"
        onClick={onClick}
        className={`editable-field block w-full text-left text-sm leading-6 text-heading whitespace-pre-wrap ${className}`}
      >
        {html}
      </button>
    ) : (
      <p className={`text-sm leading-6 text-heading whitespace-pre-wrap ${className}`}>
        {html}
      </p>
    );
    return body;
  }

  const content = (
    <div
      ref={rootRef}
      className={`rich-text-content text-sm leading-6 text-heading ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      className="editable-field block w-full rounded-xl text-left"
    >
      {content}
    </button>
  );
}
