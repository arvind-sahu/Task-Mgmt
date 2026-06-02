const DB_NAME = "tasker-image-cache";
const STORE = "images";
const DB_VERSION = 1;

const memoryUrls = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readBlob(url: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function writeBlob(url: string, blob: Blob): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore quota / private-mode failures — direct URL still works.
  }
}

function rememberBlobUrl(url: string, blob: Blob): string {
  const existing = memoryUrls.get(url);
  if (existing) return existing;
  const objectUrl = URL.createObjectURL(blob);
  memoryUrls.set(url, objectUrl);
  return objectUrl;
}

/**
 * Resolve an avatar URL to a blob URL backed by IndexedDB after the first fetch.
 * Falls back to the original URL when caching is unavailable or blocked by CORS.
 */
export async function resolveCachedImageUrl(url: string): Promise<string> {
  if (!url || typeof window === "undefined") return url;

  const cachedMemory = memoryUrls.get(url);
  if (cachedMemory) return cachedMemory;

  const cachedBlob = await readBlob(url);
  if (cachedBlob) return rememberBlobUrl(url, cachedBlob);

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) return url;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return url;
    void writeBlob(url, blob);
    return rememberBlobUrl(url, blob);
  } catch {
    return url;
  }
}
