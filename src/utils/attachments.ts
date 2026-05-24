const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export function isAllowedAttachmentType(mimeType: string): boolean {
  return ALLOWED_TYPES.has(mimeType);
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  if (!isAllowedAttachmentType(file.type)) {
    throw new Error("Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File must be 5MB or smaller.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
