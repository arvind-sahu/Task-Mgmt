import { useRef, useState } from "react";

import { api } from "~/utils/api";
import { uploadProfileImageWithPresignedUrl } from "~/utils/s3Upload";

type CompanyLogoUploadProps = {
  companyName: string;
  initialLogoUrl?: string | null;
  onLogoChange: (logoUrl: string | null) => void;
};

export function CompanyLogoUpload({
  companyName,
  initialLogoUrl,
  onLogoChange,
}: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialLogoUrl ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getUploadUrl = api.company.getLogoUploadUrl.useMutation();
  const confirmLogo = api.company.confirmCompanyLogo.useMutation();
  const storageConfigured = api.storage.status.useQuery();

  async function handleFile(file: File) {
    setError(null);
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setUploading(true);
    try {
      const objectKey = await uploadProfileImageWithPresignedUrl(file, (input) =>
        getUploadUrl.mutateAsync(input),
      );
      const { logoUrl } = await confirmLogo.mutateAsync({ objectKey });
      onLogoChange(logoUrl);
      setPreviewUrl(logoUrl);
    } catch (err) {
      setPreviewUrl(initialLogoUrl ?? null);
      onLogoChange(initialLogoUrl ?? null);
      setError(
        err instanceof Error ? err.message : "Could not upload company logo.",
      );
    } finally {
      URL.revokeObjectURL(local);
      setUploading(false);
    }
  }

  const s3Ready = storageConfigured.data?.configured ?? false;

  return (
    <div>
      <span className="label">Company logo</span>
      <p className="mt-0.5 text-xs text-slate-500">Optional — PNG or JPG, up to 4MB.</p>
      <div className="mt-3 flex items-center gap-4">
        <div
          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border text-2xl font-bold text-indigo-600"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-muted)" }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={`${companyName} logo`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>{companyName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            disabled={!s3Ready || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={!s3Ready || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : previewUrl ? "Change logo" : "Upload logo"}
          </button>
          {!s3Ready && (
            <p className="text-xs text-amber-700">
              Logo upload requires S3 storage. You can add a logo later in company
              settings.
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
