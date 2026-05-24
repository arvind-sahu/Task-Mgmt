import { isImageMime } from "~/utils/attachments";

export type AttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
};

type AttachmentListProps = {
  items: AttachmentItem[];
  onDelete?: (id: string) => void;
  deletingId?: string | null;
};

export function AttachmentList({
  items,
  onDelete,
  deletingId,
}: AttachmentListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((att) => (
        <li
          key={att.id}
          className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          {isImageMime(att.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={att.dataUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={att.dataUrl}
                alt={att.fileName}
                className="h-20 w-20 object-cover"
              />
            </a>
          ) : (
            <a
              href={att.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-20 w-28 flex-col items-center justify-center gap-1 px-2 text-center text-xs text-slate-600 hover:bg-slate-50"
            >
              <span className="text-lg">📄</span>
              <span className="line-clamp-2 break-all">{att.fileName}</span>
            </a>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(att.id)}
              disabled={deletingId === att.id}
              className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1 text-[10px] text-red-600 opacity-0 shadow ring-1 ring-slate-200 transition group-hover:opacity-100"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
