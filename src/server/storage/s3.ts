import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const USER_IMAGES_PREFIX = "user-images/";
export const COMPANY_LOGOS_PREFIX = "company-logos/";
export const TASK_ATTACHMENTS_PREFIX = "tasks-attachments/";

export const UPLOAD_URL_TTL_SECONDS = 300;
export const DOWNLOAD_URL_TTL_SECONDS = 3600;

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

let s3Client: S3Client | undefined;

export type PresignedUpload = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: number;
};

export type PresignedDownload = {
  url: string;
  expiresAt: number;
};

export function isS3Configured(): boolean {
  return Boolean(process.env.AWS_S3_BUCKET_NAME);
}

export function getBucketConfig() {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }
  const region = process.env.AWS_S3_REGION ?? "ap-south-1";
  return { bucket, region };
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    const { region } = getBucketConfig();
    const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;
    // Default SDK checksums embed x-amz-checksum-* in presigned PUT URLs; browser
    // fetch PUTs do not send those headers, which breaks uploads (CORS / signature).
    s3Client = new S3Client({
      region,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }
  return s3Client;
}

export function extensionFromMime(mimeType: string): string {
  return MIME_EXTENSION[mimeType] ?? "bin";
}

export function userImageKey(userId: string, mimeType: string): string {
  const ext = extensionFromMime(mimeType);
  return `${USER_IMAGES_PREFIX}${userId}/${Date.now()}.${ext}`;
}

export function companyLogoKey(companyId: string, mimeType: string): string {
  const ext = extensionFromMime(mimeType);
  return `${COMPANY_LOGOS_PREFIX}${companyId}/${Date.now()}.${ext}`;
}

export function taskAttachmentKey(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${TASK_ATTACHMENTS_PREFIX}${userId}/${Date.now()}-${safeName}`;
}

export function buildObjectUrl(key: string): string {
  const { bucket, region } = getBucketConfig();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function extractKeyFromObjectUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const { bucket, region } = getBucketConfig();
    const expectedHost = `${bucket}.s3.${region}.amazonaws.com`;
    if (parsed.hostname !== expectedHost) return null;
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    return key || null;
  } catch {
    return null;
  }
}

export function isUserImageKeyForUser(key: string, userId: string): boolean {
  return key.startsWith(`${USER_IMAGES_PREFIX}${userId}/`);
}

export function isTaskAttachmentKeyForUser(key: string, userId: string): boolean {
  return key.startsWith(`${TASK_ATTACHMENTS_PREFIX}${userId}/`);
}

export function isAllowedUserImageKey(key: string): boolean {
  return key.startsWith(USER_IMAGES_PREFIX);
}

export function isCompanyLogoKeyForCompany(key: string, companyId: string): boolean {
  return key.startsWith(`${COMPANY_LOGOS_PREFIX}${companyId}/`);
}

export function isAllowedCompanyLogoKey(key: string): boolean {
  return key.startsWith(COMPANY_LOGOS_PREFIX);
}

export function isAllowedTaskAttachmentKey(key: string): boolean {
  return key.startsWith(TASK_ATTACHMENTS_PREFIX);
}

/** @deprecated Prefer key-based checks */
export function isAllowedUserImageUrl(url: string): boolean {
  const key = extractKeyFromObjectUrl(url);
  return key ? isAllowedUserImageKey(key) : false;
}

/** @deprecated Prefer key-based checks */
export function isAllowedTaskAttachmentUrl(url: string): boolean {
  const key = extractKeyFromObjectUrl(url);
  return key ? isAllowedTaskAttachmentKey(key) : false;
}

export function resolveLegacyUserImageKey(user: {
  image?: string | null;
  imageKey?: string | null;
}): string | null {
  if (user.imageKey) return user.imageKey;
  if (user.image && isAllowedUserImageUrl(user.image)) {
    return extractKeyFromObjectUrl(user.image);
  }
  return null;
}

export function resolveLegacyAttachmentKey(att: {
  storageKey?: string | null;
  dataUrl?: string | null;
}): string | null {
  if (att.storageKey) return att.storageKey;
  if (att.dataUrl && isAllowedTaskAttachmentUrl(att.dataUrl)) {
    return extractKeyFromObjectUrl(att.dataUrl);
  }
  return null;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<PresignedUpload> {
  const { bucket } = getBucketConfig();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
  return {
    uploadUrl,
    objectKey: key,
    expiresAt: Date.now() + UPLOAD_URL_TTL_SECONDS * 1000,
  };
}

export async function createPresignedDownloadUrl(
  key: string,
): Promise<PresignedDownload> {
  const { bucket } = getBucketConfig();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const url = await getSignedUrl(getS3Client(), command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });
  return {
    url,
    expiresAt: Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000,
  };
}

export async function createPresignedDownloadUrls(
  keys: string[],
): Promise<Record<string, PresignedDownload>> {
  const uniqueKeys = [...new Set(keys)];
  const entries = await Promise.all(
    uniqueKeys.map(async (key) => [key, await createPresignedDownloadUrl(key)] as const),
  );
  return Object.fromEntries(entries);
}

export async function deleteObjectByKey(key: string): Promise<void> {
  const { bucket } = getBucketConfig();
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

/** @deprecated Use deleteObjectByKey */
export async function deleteObjectByUrl(url: string): Promise<void> {
  const key = extractKeyFromObjectUrl(url);
  if (!key) return;
  await deleteObjectByKey(key);
}

export async function uploadDataUrlToS3(
  dataUrl: string,
  key: string,
): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match?.[1] || !match[2]) {
    throw new Error("Invalid image data");
  }

  const contentType = match[1];
  const body = Buffer.from(match[2], "base64");
  const { bucket } = getBucketConfig();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return key;
}
