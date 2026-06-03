type PresignedDownload = {
  url: string;
  expiresAt: number;
};

const urlCache = new Map<string, PresignedDownload>();
const pendingKeys = new Set<string>();
const waiters = new Map<string, Array<(value: PresignedDownload | null) => void>>();

let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchPromise: Promise<void> | null = null;

type FetchDownloadUrls = (input: {
  keys: string[];
}) => Promise<{ urls: Record<string, PresignedDownload> }>;

function isFresh(entry: PresignedDownload): boolean {
  return entry.expiresAt > Date.now() + 60_000;
}

function notifyWaiters(key: string, value: PresignedDownload | null) {
  const callbacks = waiters.get(key) ?? [];
  waiters.delete(key);
  for (const callback of callbacks) {
    callback(value);
  }
}

async function flushBatch(fetchDownloadUrls: FetchDownloadUrls) {
  const keys = [...pendingKeys];
  pendingKeys.clear();

  if (keys.length === 0) return;

  try {
    for (let offset = 0; offset < keys.length; offset += 50) {
      const chunk = keys.slice(offset, offset + 50);
      const result = await fetchDownloadUrls({ keys: chunk });
      for (const key of chunk) {
        const entry = result.urls[key] ?? null;
        if (entry) urlCache.set(key, entry);
        notifyWaiters(key, entry);
      }
    }
  } catch {
    for (const key of keys) {
      notifyWaiters(key, null);
    }
  }
}

function scheduleBatch(fetchDownloadUrls: FetchDownloadUrls) {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    batchPromise = flushBatch(fetchDownloadUrls).finally(() => {
      batchPromise = null;
      if (pendingKeys.size > 0) scheduleBatch(fetchDownloadUrls);
    });
  }, 16);
}

export function peekObjectUrl(objectKey: string | null | undefined): string | null {
  if (!objectKey) return null;
  const cached = urlCache.get(objectKey);
  return cached && isFresh(cached) ? cached.url : null;
}

export function requestObjectUrl(
  objectKey: string,
  fetchDownloadUrls: FetchDownloadUrls,
): Promise<string | null> {
  const cached = urlCache.get(objectKey);
  if (cached && isFresh(cached)) {
    return Promise.resolve(cached.url);
  }

  return new Promise((resolve) => {
    const queue = waiters.get(objectKey) ?? [];
    queue.push((entry) => resolve(entry?.url ?? null));
    waiters.set(objectKey, queue);
    pendingKeys.add(objectKey);
    scheduleBatch(fetchDownloadUrls);
    void batchPromise;
  });
}

export function primeObjectUrls(
  urls: Record<string, PresignedDownload | undefined>,
): void {
  for (const [key, entry] of Object.entries(urls)) {
    if (entry) urlCache.set(key, entry);
  }
}

export function invalidateObjectUrl(objectKey: string): void {
  urlCache.delete(objectKey);
}
