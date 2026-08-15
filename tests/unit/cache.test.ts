import assert from "node:assert/strict";
import test from "node:test";
import {
  cacheKey,
  pruneStaleTextures,
  readCachedTexture,
  selectTextureSize,
  writeCachedTexture,
  type BlobStore,
} from "../../lib/buddhabrot/cache.ts";

function memoryStore(initial: Record<string, Blob> = {}): BlobStore {
  const entries = new Map(Object.entries(initial));
  return {
    async get(key) {
      return entries.get(key) ?? null;
    },
    async put(key, value) {
      entries.set(key, value);
    },
    async keys() {
      return Array.from(entries.keys());
    },
    async delete(key) {
      entries.delete(key);
    },
  };
}

const failingStore: BlobStore = {
  async get() {
    throw new Error("quota exceeded");
  },
  async put() {
    throw new Error("quota exceeded");
  },
  async keys() {
    throw new Error("quota exceeded");
  },
  async delete() {
    throw new Error("quota exceeded");
  },
};

function viewport(coarse: boolean, width: number, height: number) {
  return {
    matchMedia: (query: string) => ({ matches: coarse && query === "(pointer: coarse)" }),
    screen: { width, height },
  };
}

test("a coarse pointer on a small screen selects the smaller tier", () => {
  assert.equal(selectTextureSize(viewport(true, 390, 844)), 2048);
});

test("a coarse pointer on a large screen still selects the full tier", () => {
  assert.equal(selectTextureSize(viewport(true, 1024, 1366)), 4096);
});

test("a fine pointer always selects the full tier", () => {
  assert.equal(selectTextureSize(viewport(false, 390, 844)), 4096);
});

test("cache keys are versioned and size-scoped", () => {
  assert.equal(cacheKey(4096), "buddhabrot:v2:4096");
  assert.notEqual(cacheKey(2048), cacheKey(4096));
});

test("reads a stored blob back", async () => {
  const blob = new Blob(["density"]);
  const store = memoryStore({ [cacheKey(4096)]: blob });
  assert.equal(await readCachedTexture(4096, store), blob);
});

test("a miss returns null", async () => {
  assert.equal(await readCachedTexture(4096, memoryStore()), null);
});

test("a different size does not read another tier's entry", async () => {
  const store = memoryStore({ [cacheKey(4096)]: new Blob(["density"]) });
  assert.equal(await readCachedTexture(2048, store), null);
});

test("a failing read is swallowed and returns null", async () => {
  assert.equal(await readCachedTexture(4096, failingStore), null);
});

test("a successful write reports true", async () => {
  const store = memoryStore();
  assert.equal(await writeCachedTexture(4096, new Blob(["density"]), store), true);
  assert.notEqual(await readCachedTexture(4096, store), null);
});

test("a failing write is swallowed and reports false", async () => {
  assert.equal(await writeCachedTexture(4096, new Blob(["density"]), failingStore), false);
});

test("a prune removes a stale key and keeps the current one", async () => {
  const store = memoryStore({
    "buddhabrot:v0:4096": new Blob(["stale"]),
    [cacheKey(4096)]: new Blob(["current"]),
    "unrelated:key": new Blob(["keep"]),
  });
  await pruneStaleTextures(cacheKey(4096), store);
  assert.equal(await store.get("buddhabrot:v0:4096"), null);
  assert.notEqual(await store.get(cacheKey(4096)), null);
  assert.notEqual(await store.get("unrelated:key"), null);
});

test("a failing prune is swallowed", async () => {
  await assert.doesNotReject(pruneStaleTextures(cacheKey(4096), failingStore));
});
