import { useEffect, useState, type ReactNode } from "react";

import { resolveCachedImageUrl } from "~/utils/cachedImage";

type CachedAvatarProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
};

/** Avatar image that reuses a locally cached blob after the first successful load. */
export function CachedAvatar({
  src,
  alt,
  className,
  fallback,
}: CachedAvatarProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      return;
    }

    let cancelled = false;
    void resolveCachedImageUrl(src).then((resolved) => {
      if (!cancelled) setDisplaySrc(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || !displaySrc) {
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
