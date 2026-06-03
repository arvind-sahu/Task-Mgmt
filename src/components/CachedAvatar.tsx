import { useEffect, useState, type ReactNode } from "react";

import { api } from "~/utils/api";
import { resolveCachedImageUrl } from "~/utils/cachedImage";
import { requestObjectUrl } from "~/utils/objectUrls";
import { resolveUserPortrait } from "~/utils/userPortrait";

type CachedAvatarProps = {
  /** @deprecated Prefer `user` with imageKey/externalUrl resolution */
  src?: string | null;
  user?: {
    image?: string | null;
    imageKey?: string | null;
  } | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
};

/** Avatar image — resolves private S3 keys via batched presigned GET URLs. */
export function CachedAvatar({
  src,
  user,
  alt,
  className,
  fallback,
}: CachedAvatarProps) {
  const utils = api.useUtils();
  const portrait = user ? resolveUserPortrait(user) : null;
  const objectKey = portrait?.objectKey ?? null;
  const externalUrl = portrait?.externalUrl ?? src ?? null;

  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (objectKey) {
        const url = await requestObjectUrl(objectKey, (input) =>
          utils.storage.getDownloadUrls.fetch(input),
        );
        if (cancelled) return;
        if (url) {
          const cached = await resolveCachedImageUrl(url);
          if (!cancelled) setDisplaySrc(cached);
        } else if (!cancelled) {
          setDisplaySrc(null);
        }
        return;
      }

      if (externalUrl) {
        const cached = await resolveCachedImageUrl(externalUrl);
        if (!cancelled) setDisplaySrc(cached);
        return;
      }

      if (!cancelled) setDisplaySrc(null);
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [objectKey, externalUrl, utils.storage.getDownloadUrls]);

  if (!displaySrc) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
