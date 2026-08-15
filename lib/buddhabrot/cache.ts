/**
 * Persists the generated Buddhabrot as a PNG blob so the build-up runs once
 * per device. Every failure is swallowed: the worst case is a memory-only
 * texture for this session and a regeneration next launch.
 */

/** Bump whenever the shaders or tuning change, retiring stale images. */
export const CACHE_VERSION = 1;

const DATABASE_NAME = "mandelbrot-skipping";
const STORE_NAME = "textures";

export type BlobStore = {
  get(key: string): Promise<Blob | null>;
  put(key: string, value: Blob): Promise<void>;
};

export type Viewportish = {
  matchMedia: (query: string) => { matches: boolean };
  screen: { width: number; height: number };
};

export function selectTextureSize(view: Viewportish): 2048 | 4096 {
  const coarsePointer = view.matchMedia("(pointer: coarse)").matches;
  const shortEdge = Math.min(view.screen.width, view.screen.height);
  return coarsePointer && shortEdge <= 820 ? 2048 : 4096;
}

export function cacheKey(size: number): string {
  return `buddhabrot:v${CACHE_VERSION}:${size}`;
}

export async function readCachedTexture(size: number, store: BlobStore): Promise<Blob | null> {
  try {
    return await store.get(cacheKey(size));
  } catch {
    return null;
  }
}

export async function writeCachedTexture(
  size: number,
  blob: Blob,
  store: BlobStore,
): Promise<boolean> {
  try {
    await store.put(cacheKey(size), blob);
    return true;
  } catch {
    return false;
  }
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

/** Thin adapter. Verified by running the app, not by unit tests. */
export function indexedDbStore(factory: IDBFactory): BlobStore {
  return {
    async get(key) {
      const database = await openDatabase(factory);
      try {
        return await new Promise<Blob | null>((resolve, reject) => {
          const request = database.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME).get(key);
          request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    },
    async put(key, value) {
      const database = await openDatabase(factory);
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).put(value, key);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    },
  };
}
