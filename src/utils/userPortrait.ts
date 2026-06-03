type PortraitUser = {
  image?: string | null;
  imageKey?: string | null;
};

/** Resolve S3 key, external OAuth URL, or legacy inline data for avatars. */
export function resolveUserPortrait(user?: PortraitUser | null): {
  objectKey: string | null;
  externalUrl: string | null;
} {
  if (!user) {
    return { objectKey: null, externalUrl: null };
  }

  if (user.imageKey) {
    return { objectKey: user.imageKey, externalUrl: null };
  }

  const image = user.image;
  if (!image) {
    return { objectKey: null, externalUrl: null };
  }

  if (image.startsWith("data:")) {
    return { objectKey: null, externalUrl: image };
  }

  if (image.includes(".amazonaws.com/user-images/")) {
    try {
      const parsed = new URL(image);
      const key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
      if (key.startsWith("user-images/")) {
        return { objectKey: key, externalUrl: null };
      }
    } catch {
      // Fall through to external URL handling.
    }
  }

  return { objectKey: null, externalUrl: image };
}
