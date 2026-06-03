import { useEffect, useState } from "react";

import { api } from "~/utils/api";
import { isImageMime } from "~/utils/attachments";
import { requestObjectUrl } from "~/utils/objectUrls";

export type AttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl?: string | null;
  storageKey?: string | null;
};

type AttachmentListProps = {
  items: AttachmentItem[];
  onDelete?: (id: string) => void;
  deletingId?: string | null;
};

function useAttachmentHref(item: AttachmentItem): string | null {
  const utils = api.useUtils();
  const [href, setHref] = useState<string | null>(
    item.dataUrl && !item.storageKey ? item.dataUrl : null,
  );

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (item.storageKey) {
        const url = await requestObjectUrl(item.storageKey, (input) =>
          utils.storage.getDownloadUrls.fetch(input),
        );
        if (!cancelled) setHref(url);
        return;
      }

      if (item.dataUrl?.includes(".amazonaws.com/tasks-attachments/")) {
        try {
          const parsed = new URL(item.dataUrl);
          const key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
          if (key.startsWith("tasks-attachments/")) {
            const url = await requestObjectUrl(key, (input) =>
              utils.storage.getDownloadUrls.fetch(input),
            );
            if (!cancelled) setHref(url);
            return;
          }
        } catch {
          // Fall through.
        }
      }

      if (!cancelled) setHref(item.dataUrl ?? null);
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [item.dataUrl, item.storageKey, utils.storage.getDownloadUrls]);

  return href;
}

function AttachmentPreview({
  item,
  onDelete,
  deleting,
}: {
  item: AttachmentItem;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const href = useAttachmentHref(item);

  if (!href) {
    return (
      <div className="surface-row flex h-20 w-20 items-center justify-center rounded-lg text-[10px] text-muted">
        …
      </div>
    );
  }

  return (
    <div className="surface-row group relative overflow-hidden rounded-lg">
      {isImageMime(item.mimeType) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={href} target="_blank" rel="noopener noreferrer">
          <img
            src={href}
            alt={item.fileName}
            className="h-20 w-20 object-cover"
            loading="lazy"
            decoding="async"
          />
        </a>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="interactive-hover flex h-20 w-28 flex-col items-center justify-center gap-1 px-2 text-center text-xs text-muted"
        >
          <span className="text-lg">📄</span>
          <span className="line-clamp-2 break-all">{item.fileName}</span>
        </a>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1 text-[10px] text-red-600 opacity-0 shadow ring-1 ring-slate-200 transition group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AttachmentList({
  items,
  onDelete,
  deletingId,
}: AttachmentListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((att) => (
        <li key={att.id}>
          <AttachmentPreview
            item={att}
            onDelete={onDelete ? () => onDelete(att.id) : undefined}
            deleting={deletingId === att.id}
          />
        </li>
      ))}
    </ul>
  );
}
