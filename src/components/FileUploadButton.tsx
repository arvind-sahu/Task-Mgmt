import { useRef, useState } from "react";

import { isAllowedAttachmentType } from "~/utils/attachments";
import { uploadFileWithPresignedUrl } from "~/utils/s3Upload";

type FileUploadButtonProps = {
  label?: string;
  disabled?: boolean;
  requestUploadUrl: (input: {
    fileName: string;
    mimeType: string;
    contentLength: number;
  }) => Promise<{ uploadUrl: string; objectKey: string }>;
  onUploaded: (file: {
    fileName: string;
    mimeType: string;
    storageKey: string;
  }) => void | Promise<void>;
};

export function FileUploadButton({
  label = "Add image or PDF",
  disabled,
  requestUploadUrl,
  onUploaded,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isAllowedAttachmentType(file.type)) {
      setError("Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be 5MB or smaller.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const uploaded = await uploadFileWithPresignedUrl(file, requestUploadUrl);
      await onUploaded({
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        storageKey: uploaded.objectKey,
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
