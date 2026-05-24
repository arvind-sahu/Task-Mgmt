import { useRef, useState } from "react";

import { readFileAsDataUrl } from "~/utils/attachments";

type FileUploadButtonProps = {
  label?: string;
  disabled?: boolean;
  onUploaded: (file: {
    fileName: string;
    mimeType: string;
    dataUrl: string;
  }) => void | Promise<void>;
};

export function FileUploadButton({
  label = "Add image or PDF",
  disabled,
  onUploaded,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await onUploaded({
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => void handleChange(e)}
      />
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
      >
        {loading ? "Uploading…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
