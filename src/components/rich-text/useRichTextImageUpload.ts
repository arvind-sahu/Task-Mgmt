import { api } from "~/utils/api";
import { uploadFileWithPresignedUrl } from "~/utils/s3Upload";
import { requestObjectUrl } from "~/utils/objectUrls";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function useRichTextImageUpload() {
  const utils = api.useUtils();
  const getUploadUrl = api.attachment.getUploadUrl.useMutation();
  const storageStatus = api.storage.status.useQuery();

  const resolveImageUrl = async (storageKey: string) => {
    return await requestObjectUrl(storageKey, (input) =>
      utils.storage.getDownloadUrls.fetch(input),
    );
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files can be embedded in the editor.");
    }

    if (storageStatus.data?.configured) {
      try {
        const uploaded = await uploadFileWithPresignedUrl(file, (input) =>
          getUploadUrl.mutateAsync(input),
        );
        const previewUrl = await resolveImageUrl(uploaded.objectKey);
        if (!previewUrl) {
          throw new Error("Image uploaded but preview URL could not be loaded.");
        }
        return {
          storageKey: uploaded.objectKey,
          previewUrl,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Image upload failed.";
        throw new Error(message);
      }
    }

    const previewUrl = await readFileAsDataUrl(file);
    return {
      storageKey: "",
      previewUrl,
    };
  };

  return { uploadImage, resolveImageUrl };
}
