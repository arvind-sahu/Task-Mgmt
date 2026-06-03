import { isAllowedAttachmentType } from "~/utils/attachments";

const PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

type PresignUploadInput = {
  fileName: string;
  mimeType: string;
  contentLength: number;
};

type PresignProfileInput = {
  contentType: string;
  contentLength: number;
};

type PresignUploadResult = {
  uploadUrl: string;
  objectKey: string;
};

export async function uploadFileWithPresignedUrl(
  file: File,
  getPresignedUrl: (input: PresignUploadInput) => Promise<PresignUploadResult>,
): Promise<{ objectKey: string; fileName: string; mimeType: string }> {
  if (!isAllowedAttachmentType(file.type)) {
    throw new Error("Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File must be 5MB or smaller.");
  }

  const { uploadUrl, objectKey } = await getPresignedUrl({
    fileName: file.name,
    mimeType: file.type,
    contentLength: file.size,
  });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to storage.");
  }

  return {
    objectKey,
    fileName: file.name,
    mimeType: file.type,
  };
}

export async function uploadProfileImageWithPresignedUrl(
  file: File,
  getPresignedUrl: (input: PresignProfileInput) => Promise<PresignUploadResult>,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error("Please upload an image up to 4MB.");
  }

  const { uploadUrl, objectKey } = await getPresignedUrl({
    contentType: file.type,
    contentLength: file.size,
  });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!response.ok) {
    throw new Error("Failed to upload profile photo.");
  }

  return objectKey;
}
