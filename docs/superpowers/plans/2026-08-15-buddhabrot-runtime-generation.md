# Runtime Buddhabrot Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static 1024x1024 Buddhabrot background with a WebGPU-generated 4096x4096 texture built on first launch, shown accumulating full-screen as the opening moment, and cached in IndexedDB.

**Architecture:** Six new plain-TypeScript modules under `lib/` (pure logic is unit-tested; GPU and IndexedDB adapters are thin and untested), one new React overlay component, and targeted edits to `app/MandelbrotSkipping.tsx`. The existing PNG stays as the no-WebGPU fallback.

**Tech Stack:** TypeScript, React 19, WebGPU (WGSL compute), IndexedDB, `node --test` with native type stripping.

**Spec:** `docs/superpowers/specs/2026-08-15-buddhabrot-runtime-generation-design.md`

## Global Constraints

- Branch is `buddhabrot-runtime-generation`. All work lands there.
- Never break play. Every failure path (no WebGPU, IndexedDB unavailable, generation throws) falls back to `public/buddhabrot-density.png` and the game stays playable.
- `public/buddhabrot-density.png` and `scripts/generate-buddhabrot.py` are **retained**, not deleted.
- The colorize shader reproduces `scripts/generate-buddhabrot.py` exactly: `log1p` → normalize between percentile cuts → `pow(x, 1.68)` → alpha `clamp((contrast - 0.018) * 1.55, 0, 1)` with hard zero below `contrast < 0.055` → tint `(8 + c*235, 72 + c*183, 92 + c*143)` on 0-255.
- Buddhabrot sampling parameters match the Python: bounds `xMin -2.2, xMax 1.2, yMin -1.5, yMax 1.5`, max 320 iterations, discard seeds with `escaped_at < 5`.
- Percentiles are the 54th and 99.92nd, over non-empty pixels only.
- Minimum intro duration is 5000 ms, dropped to 0 under `prefers-reduced-motion: reduce`.
- Texture size: 4096 desktop, 2048 when `(pointer: coarse)` matches AND the short screen edge is <= 820 px.
- Imports use the existing `@/*` alias from `tsconfig.json`.
- New code goes in `lib/`, never `build/` (globally ignored by `eslint.config.mjs`).
- Run `npm run lint` before every commit. It must pass.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `app/MandelbrotSkipping.tsx` | Modified: render fixes, device handoff, boot wiring | 1, 5, 7 |
| `app/globals.css` | Modified: intro overlay styles | 7 |
| `app/BuddhabrotIntro.tsx` | Create: full-screen accumulation overlay | 7 |
| `lib/gpu.ts` | Create: acquire adapter/device once, shared | 5 |
| `lib/buddhabrot/pacing.ts` | Create: pure per-frame sample budgeting | 2 |
| `lib/buddhabrot/normalize.ts` | Create: pure histogram → percentile cuts | 3 |
| `lib/buddhabrot/cache.ts` | Create: size tier, cache key, blob store policy | 4 |
| `lib/buddhabrot/shaders.ts` | Create: WGSL for accumulate, histogram, colorize, blit | 6 |
| `lib/buddhabrot/generator.ts` | Create: GPU buffers, chunked stepping, blit, readback | 6 |
| `tests/unit/*.test.ts` | Create: unit tests for the three pure modules | 2, 3, 4 |
| `tests/rendered-html.test.mjs` | Modified: assert intro absent from SSR | 7 |
| `package.json` | Modified: `test:unit` script | 2 |

---

### Task 1: Fix the flashlight resolution defects

Independent of everything else. This alone fixes most of the visible pixelation, so it lands first and can be reviewed on its own.

**Files:**
- Modify: `app/MandelbrotSkipping.tsx` (three edits in the game canvas effect)

**Interfaces:**
- Consumes: nothing
- Produces: nothing (behaviour-only change)

- [ ] **Step 1: Size the flashlight buffer to devicePixelRatio**

In `resize()`, find these two lines:

```ts
      flashlightCanvas.width = Math.ceil(width);
      flashlightCanvas.height = Math.ceil(height);
```

Replace with:

```ts
      flashlightCanvas.width = Math.round(width * dpr);
      flashlightCanvas.height = Math.round(height * dpr);
      flashlightContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
```

This mirrors how `gridCanvas` is already sized three lines above. `flashlightContext` is declared with `getContext("2d")` so it is nullable; the optional call matches the existing `gridContext?.setTransform(...)` idiom.

- [ ] **Step 2: Scale the mask blur by devicePixelRatio**

In `drawFlashlight()`, find:

```ts
        flashlightContext.filter = "blur(14px)";
```

Replace with:

```ts
        flashlightContext.filter = `blur(${14 * dpr}px)`;
```

Canvas 2D filters operate in device pixels and are not affected by the context transform. Without this, doubling the buffer would halve the apparent blur and visibly harden the cone edge.

- [ ] **Step 3: Enable smoothing for the Buddhabrot draw**

In `drawMappedBuddhabrot()`, find:

```ts
      target.imageSmoothingEnabled = false;
```

Replace with:

```ts
      target.imageSmoothingEnabled = true;
```

At default zoom the source is being downscaled, where nearest-neighbour sampling shimmers during panning. Leave the `imageSmoothingEnabled = false` in `drawFlashlight()` alone — after Step 1 that blit is 1:1 and smoothing there would only cost time.

- [ ] **Step 4: Verify lint and the existing test suite pass**

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: the single `server-renders Mandelbrot Skipping` test passes. This change is client-side only, so server HTML is unaffected.

- [ ] **Step 5: Verify visually**

Run: `npm run dev`, open the printed URL on a high-DPI display, drag the white orb backward to aim.
Expected: the Buddhabrot cone is visibly sharper than before — no 2x2 pixel blocks — and the cone edge is still soft, not hard-edged.

- [ ] **Step 6: Commit**

```bash
git add app/MandelbrotSkipping.tsx
git commit -m "Render the flashlight reveal at device pixel ratio"
```

---

### Task 2: Unit test infrastructure and the pacing module

**Files:**
- Create: `lib/buddhabrot/pacing.ts`
- Create: `tests/unit/pacing.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: nothing
- Produces: `MIN_DURATION_MS: 5000`, `MAX_DELTA_SECONDS: 0.05`, `DEFAULT_MAX_SAMPLES_PER_FRAME: 2_000_000`, `clampDelta(deltaSeconds: number): number`, `samplesForFrame(deltaSeconds: number, options: PacingOptions): number` where `PacingOptions = { totalSamples: number; minDurationMs?: number; maxSamplesPerFrame?: number }`

- [ ] **Step 1: Add the unit test script**

In `package.json`, replace the `"test"` line:

```json
    "test": "npm run build && node --test tests/rendered-html.test.mjs",
```

with:

```json
    "test": "npm run test:unit && npm run build && node --test tests/rendered-html.test.mjs",
    "test:unit": "node --experimental-strip-types --test tests/unit/*.test.ts",
```

Unit tests run first because they are fast and need no build. `--experimental-strip-types` is required on Node 22.13-22.17 and accepted as a no-op on newer versions, so it is safe across the whole supported range declared in `engines`.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/pacing.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  clampDelta,
  samplesForFrame,
  MAX_DELTA_SECONDS,
  DEFAULT_MAX_SAMPLES_PER_FRAME,
} from "../../lib/buddhabrot/pacing.ts";

test("clampDelta caps a long frame", () => {
  assert.equal(clampDelta(3), MAX_DELTA_SECONDS);
});

test("clampDelta rejects negative and non-finite deltas", () => {
  assert.equal(clampDelta(-1), 0);
  assert.equal(clampDelta(Number.NaN), 0);
});

test("chunks sum to roughly the full budget over the minimum duration", () => {
  const totalSamples = 64_000_000;
  let accumulated = 0;
  for (let frame = 0; frame < 300; frame++) {
    accumulated += samplesForFrame(1 / 60, { totalSamples });
  }
  // 300 frames at 60fps is exactly 5000ms. Allow 1% for per-frame flooring.
  assert.ok(accumulated >= totalSamples * 0.99, `got ${accumulated}`);
  assert.ok(accumulated <= totalSamples * 1.01, `got ${accumulated}`);
});

test("a backgrounded tab cannot dump the remaining budget in one frame", () => {
  const totalSamples = 64_000_000;
  const afterLongStall = samplesForFrame(4, { totalSamples });
  const normalFrame = samplesForFrame(1 / 60, { totalSamples });
  assert.ok(afterLongStall < totalSamples * 0.02, `got ${afterLongStall}`);
  assert.ok(afterLongStall > normalFrame);
});

test("never exceeds the per-frame ceiling", () => {
  const result = samplesForFrame(1 / 60, { totalSamples: 10_000_000_000 });
  assert.equal(result, DEFAULT_MAX_SAMPLES_PER_FRAME);
});

test("always advances by at least one sample", () => {
  assert.ok(samplesForFrame(0, { totalSamples: 64_000_000 }) >= 1);
});

test("a zero minimum duration runs at the ceiling", () => {
  const result = samplesForFrame(1 / 60, { totalSamples: 64_000_000, minDurationMs: 0 });
  assert.equal(result, DEFAULT_MAX_SAMPLES_PER_FRAME);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/buddhabrot/pacing.ts`.

- [ ] **Step 4: Write the implementation**

Create `lib/buddhabrot/pacing.ts`:

```ts
/** Per-frame sample budgeting for the first-launch Buddhabrot build-up. */

/** The build-up is a deliberate opening moment, not a stutter. */
export const MIN_DURATION_MS = 5000;

/**
 * Matches the clamp the game loop already applies. Without it a backgrounded
 * tab returns with a multi-second delta and dumps the whole budget at once.
 */
export const MAX_DELTA_SECONDS = 0.05;

/** Safety net so no single dispatch janks a frame. Rarely binding in practice. */
export const DEFAULT_MAX_SAMPLES_PER_FRAME = 2_000_000;

export type PacingOptions = {
  totalSamples: number;
  minDurationMs?: number;
  maxSamplesPerFrame?: number;
};

export function clampDelta(deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return 0;
  return Math.min(deltaSeconds, MAX_DELTA_SECONDS);
}

export function samplesForFrame(deltaSeconds: number, options: PacingOptions): number {
  const ceiling = options.maxSamplesPerFrame ?? DEFAULT_MAX_SAMPLES_PER_FRAME;
  const minDurationMs = options.minDurationMs ?? MIN_DURATION_MS;
  if (minDurationMs <= 0) return ceiling;
  const share = clampDelta(deltaSeconds) * 1000 / minDurationMs;
  return Math.max(1, Math.min(ceiling, Math.floor(options.totalSamples * share)));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: PASS, 7 tests.

- [ ] **Step 6: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json lib/buddhabrot/pacing.ts tests/unit/pacing.test.ts
git commit -m "Add sample pacing for the Buddhabrot build-up"
```

---

### Task 3: Histogram normalization

**Files:**
- Create: `lib/buddhabrot/normalize.ts`
- Create: `tests/unit/normalize.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `HISTOGRAM_BINS: 1024`, `HISTOGRAM_MAX_LOG: 20`, `LOW_PERCENTILE: 54`, `HIGH_PERCENTILE: 99.92`, `cutsFromHistogram(histogram: Uint32Array | number[], maxLogDensity?: number): { low: number; high: number }`

**Design note for the implementer:** the histogram uses a *fixed* log scale rather than one derived from the data. `log1p(density)` for any density this generator can produce stays well under 20 (`e^20` is about 4.8e8 hits on a single pixel). Fixing the scale removes a chicken-and-egg problem — you would otherwise need the maximum density on the CPU before you could bin, costing an extra readback per chunk.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/normalize.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { cutsFromHistogram, HISTOGRAM_BINS } from "../../lib/buddhabrot/normalize.ts";

test("finds percentile cuts in a uniform histogram", () => {
  // 100 bins spanning 0..100, one pixel each: the Nth percentile lands on N.
  const histogram = new Uint32Array(100).fill(1);
  const cuts = cutsFromHistogram(histogram, 100);
  assert.ok(Math.abs(cuts.low - 54) < 0.5, `low was ${cuts.low}`);
  assert.ok(Math.abs(cuts.high - 99.92) < 0.5, `high was ${cuts.high}`);
});

test("high cut always exceeds low cut", () => {
  const histogram = new Uint32Array(HISTOGRAM_BINS);
  histogram[7] = 1000;
  const cuts = cutsFromHistogram(histogram);
  assert.ok(cuts.high > cuts.low);
});

test("an empty histogram yields a safe non-degenerate range", () => {
  const cuts = cutsFromHistogram(new Uint32Array(HISTOGRAM_BINS));
  assert.equal(cuts.low, 0);
  assert.ok(cuts.high > cuts.low);
});

test("a non-positive scale yields a safe non-degenerate range", () => {
  const histogram = new Uint32Array(HISTOGRAM_BINS).fill(1);
  const cuts = cutsFromHistogram(histogram, 0);
  assert.equal(cuts.low, 0);
  assert.ok(cuts.high > cuts.low);
});

test("mass concentrated low pulls both cuts low", () => {
  const histogram = new Uint32Array(HISTOGRAM_BINS);
  histogram.fill(0);
  for (let bin = 0; bin < 10; bin++) histogram[bin] = 100;
  const cuts = cutsFromHistogram(histogram, 20);
  assert.ok(cuts.high < 1, `high was ${cuts.high}`);
});

test("accepts a plain array as well as a typed array", () => {
  const cuts = cutsFromHistogram([0, 0, 5, 5], 4);
  assert.ok(Number.isFinite(cuts.low));
  assert.ok(Number.isFinite(cuts.high));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/buddhabrot/normalize.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/buddhabrot/normalize.ts`:

```ts
/**
 * Turns a log-density histogram into the percentile cut points the colorize
 * pass normalizes between. Mirrors the percentile step in
 * scripts/generate-buddhabrot.py, which takes percentiles over occupied
 * pixels only — the histogram likewise counts only pixels with density > 0.
 */

export const HISTOGRAM_BINS = 1024;

/**
 * Fixed upper bound of the log1p scale. Any density this generator produces
 * stays far below e^20, so binning needs no prior knowledge of the maximum.
 */
export const HISTOGRAM_MAX_LOG = 20;

export const LOW_PERCENTILE = 54;
export const HIGH_PERCENTILE = 99.92;

export type PercentileCuts = { low: number; high: number };

function valueAtPercentile(
  histogram: Uint32Array | number[],
  maxLogDensity: number,
  percentile: number,
): number {
  const bins = histogram.length;
  let total = 0;
  for (let bin = 0; bin < bins; bin++) total += histogram[bin];
  if (total === 0) return 0;

  const target = total * percentile / 100;
  let cumulative = 0;
  for (let bin = 0; bin < bins; bin++) {
    const count = histogram[bin];
    if (count > 0 && cumulative + count >= target) {
      // Interpolate inside the bin so the cut moves smoothly between chunks.
      const withinBin = (target - cumulative) / count;
      return (bin + withinBin) / bins * maxLogDensity;
    }
    cumulative += count;
  }
  return maxLogDensity;
}

export function cutsFromHistogram(
  histogram: Uint32Array | number[],
  maxLogDensity: number = HISTOGRAM_MAX_LOG,
): PercentileCuts {
  if (!(maxLogDensity > 0)) return { low: 0, high: 1 };
  const low = valueAtPercentile(histogram, maxLogDensity, LOW_PERCENTILE);
  const high = valueAtPercentile(histogram, maxLogDensity, HIGH_PERCENTILE);
  // A degenerate range would divide by zero in the shader.
  return { low, high: Math.max(high, low + 1e-9) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: PASS, 13 tests total (7 from pacing, 6 from normalize).

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/buddhabrot/normalize.ts tests/unit/normalize.test.ts
git commit -m "Add percentile normalization for Buddhabrot density"
```

---

### Task 4: Texture cache

**Files:**
- Create: `lib/buddhabrot/cache.ts`
- Create: `tests/unit/cache.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `CACHE_VERSION: 1`, `BlobStore` type, `selectTextureSize(view: Viewportish): 2048 | 4096`, `cacheKey(size: number): string`, `readCachedTexture(size: number, store: BlobStore): Promise<Blob | null>`, `writeCachedTexture(size: number, blob: Blob, store: BlobStore): Promise<boolean>`, `indexedDbStore(factory: IDBFactory): BlobStore`

**Design note for the implementer:** IndexedDB access goes behind a two-method `BlobStore` interface. Tests exercise the *policy* (hit, miss, swallowed failure) against a trivial in-memory or throwing store. `indexedDbStore` is a thin untested adapter, in the same category as the WGSL — it is verified by running the app, not by unit tests.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cache.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  cacheKey,
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
  };
}

const failingStore: BlobStore = {
  async get() {
    throw new Error("quota exceeded");
  },
  async put() {
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
  assert.equal(cacheKey(4096), "buddhabrot:v1:4096");
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/buddhabrot/cache.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/buddhabrot/cache.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: PASS, 23 tests total.

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/buddhabrot/cache.ts tests/unit/cache.test.ts
git commit -m "Add IndexedDB cache for the generated Buddhabrot"
```

---

### Task 5: Share one GPUDevice

Pure refactor, no behaviour change. The generator needs the same device the orbit engine uses; today `createOrbitEngine` requests its own and never exposes it.

**Files:**
- Create: `lib/gpu.ts`
- Modify: `app/MandelbrotSkipping.tsx` (`createOrbitEngine` signature and body, the engine `useEffect`)

**Interfaces:**
- Consumes: nothing
- Produces: `GpuContext = { device: any; preferredFormat: string; hasFailed: () => boolean; destroy: () => void }`, `acquireGpu(fail: (message: string) => void): Promise<GpuContext | null>`

- [ ] **Step 1: Create the shared acquisition module**

Create `lib/gpu.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

/**
 * Acquires the adapter and device once. Both the orbit engine and the
 * Buddhabrot generator draw on the same device; requesting a second one
 * would double the driver-side cost for no benefit.
 */
export type GpuContext = {
  device: any;
  preferredFormat: string;
  hasFailed: () => boolean;
  destroy: () => void;
};

export async function acquireGpu(fail: (message: string) => void): Promise<GpuContext | null> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) {
    fail("WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.");
    return null;
  }
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) {
    fail("No GPU adapter found. Throwing still works in reduced visual mode.");
    return null;
  }
  const device = await adapter.requestDevice();
  let failed = false;
  device.addEventListener("uncapturederror", (event: any) => {
    failed = true;
    console.error("WebGPU validation", event.error?.message || event.error);
    fail("Orbit renderer hit a GPU validation error.");
  });
  device.lost.then(() => { failed = true; });
  return {
    device,
    preferredFormat: gpu.getPreferredCanvasFormat(),
    hasFailed: () => failed,
    destroy: () => device.destroy(),
  };
}
```

- [ ] **Step 2: Take the device as a parameter in createOrbitEngine**

In `app/MandelbrotSkipping.tsx`, add the import at the top with the other imports:

```ts
import { acquireGpu, type GpuContext } from "@/lib/gpu";
```

Then replace the opening of `createOrbitEngine` — from the `async function` line through `const canvasFormat = gpu.getPreferredCanvasFormat();` — with:

```ts
async function createOrbitEngine(canvas: HTMLCanvasElement, gpu: GpuContext): Promise<OrbitEngine | null> {
  const device = gpu.device;
  const context = canvas.getContext("webgpu") as any;
  const canvasFormat = gpu.preferredFormat;
```

The `fail` parameter is gone: every failure it used to report now originates in `acquireGpu`. The function stays `async` because the caller awaits it and the signature is part of the existing shape.

- [ ] **Step 3: Route the failure check through the shared context**

In `draw()`, replace:

```ts
    if (disposed || deviceFailed || !textures.length) return;
```

with:

```ts
    if (disposed || gpu.hasFailed() || !textures.length) return;
```

- [ ] **Step 4: Stop the engine from destroying a device it no longer owns**

In the returned `destroy()`, remove this line:

```ts
      device.destroy();
```

Leave every preceding `.destroy()` call on the engine's own buffers and textures. The device is now torn down by whoever called `acquireGpu`.

- [ ] **Step 5: Add the shared acquisition ref**

Alongside the other refs near the top of the component (next to `const engineRef = useRef<OrbitEngine | null>(null);`), add:

```ts
  const gpuPromiseRef = useRef<Promise<GpuContext | null> | null>(null);
```

A *promise* rather than a resolved context: Task 7's boot effect needs the same device, and awaiting one shared promise avoids polling a ref until it fills.

- [ ] **Step 6: Update the engine effect to acquire and own the context**

Replace the whole `useEffect` that calls `createOrbitEngine` with:

```ts
  useEffect(() => {
    const canvas = gpuCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    // Assigned synchronously so the Buddhabrot boot effect can await the
    // same acquisition instead of racing it.
    const acquisition = acquireGpu(setGpuError);
    gpuPromiseRef.current = acquisition;
    acquisition.then(async (acquired) => {
      if (!acquired) return;
      if (cancelled) {
        acquired.destroy();
        return;
      }
      const engine = await createOrbitEngine(canvas, acquired);
      if (cancelled) {
        engine?.destroy();
        return;
      }
      engineRef.current = engine;
      engine?.setView(viewRef.current);
      engine?.setTuning(tuningRef.current);
    }).catch(() => setGpuError("Orbit renderer could not start. Throwing remains playable."));
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
      gpuPromiseRef.current = null;
      void acquisition.then((acquired) => acquired?.destroy()).catch(() => {});
    };
  }, []);
```

- [ ] **Step 7: Verify nothing changed behaviourally**

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: all tests pass.

Run: `npm run dev` and play a throw.
Expected: identical to before — orbit trails render, the pond fades, panning and zooming work. This task adds no visible change; any difference is a regression.

- [ ] **Step 8: Commit**

```bash
git add lib/gpu.ts app/MandelbrotSkipping.tsx
git commit -m "Share one GPUDevice between the orbit engine and future consumers"
```

---

### Task 6: Buddhabrot compute shaders and generator

**Files:**
- Create: `lib/buddhabrot/shaders.ts`
- Create: `lib/buddhabrot/generator.ts`

**Interfaces:**
- Consumes: `GpuContext` from `@/lib/gpu`; `samplesForFrame` from `@/lib/buddhabrot/pacing`; `cutsFromHistogram`, `HISTOGRAM_BINS`, `HISTOGRAM_MAX_LOG` from `@/lib/buddhabrot/normalize`
- Produces: `BuddhabrotGenerator = { step(deltaSeconds: number): void; progress(): number; isComplete(): boolean; blit(context: any): void; toBitmapAndBlob(): Promise<{ bitmap: ImageBitmap; blob: Blob | null }>; destroy(): void }`, `createBuddhabrotGenerator(gpu: GpuContext, options: GeneratorOptions): BuddhabrotGenerator` where `GeneratorOptions = { size: number; totalSamples?: number; minDurationMs?: number }`, `DEFAULT_SAMPLE_BUDGET: Record<number, number>`

**Design note for the implementer:** the colorize shader writes *straight* alpha to the storage texture, and the blit shader premultiplies when drawing to a canvas. WebGPU canvases only offer `alphaMode: "opaque"` or `"premultiplied"`, and the flashlight compositing depends on the image's alpha channel being correct, so getting this backwards produces a washed-out or over-dark reveal.

- [ ] **Step 1: Write the shaders**

Create `lib/buddhabrot/shaders.ts`:

```ts
import { HISTOGRAM_BINS, HISTOGRAM_MAX_LOG } from "./normalize";

/** Matches BUDDHABROT_BOUNDS in app/MandelbrotSkipping.tsx and the Python script. */
export const BOUNDS = { xMin: -2.2, xMax: 1.2, yMin: -1.5, yMax: 1.5 };
export const MAX_ITERATIONS = 320;
export const MIN_ESCAPE_STEP = 5;

export const accumulateShader = /* wgsl */ `
struct Params {
  size: u32,
  seedBase: u32,
  sampleCount: u32,
  maxIterations: u32,
  bounds: vec4f,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> density: array<atomic<u32>>;

fn hash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn nextFloat(state: ptr<function, u32>) -> f32 {
  *state = hash(*state);
  return f32(*state) / 4294967296.0;
}

@compute @workgroup_size(64)
fn accumulate(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.sampleCount) { return; }
  var state = hash(id.x ^ hash(params.seedBase));
  let cr = mix(params.bounds.x, params.bounds.y, nextFloat(&state));
  let ci = mix(params.bounds.z, params.bounds.w, nextFloat(&state));

  var zr = 0.0;
  var zi = 0.0;
  var escapedAt = 0u;
  for (var step = 1u; step <= params.maxIterations; step++) {
    let nextR = zr * zr - zi * zi + cr;
    let nextI = 2.0 * zr * zi + ci;
    zr = nextR;
    zi = nextI;
    if (zr * zr + zi * zi > 4.0) { escapedAt = step; break; }
  }
  if (escapedAt < ${MIN_ESCAPE_STEP}u) { return; }

  let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
  let sizeF = f32(params.size);
  zr = 0.0;
  zi = 0.0;
  for (var step = 1u; step <= escapedAt; step++) {
    let nextR = zr * zr - zi * zi + cr;
    let nextI = 2.0 * zr * zi + ci;
    zr = nextR;
    zi = nextI;
    if (zr < params.bounds.x || zr >= params.bounds.y) { continue; }
    if (zi < params.bounds.z || zi >= params.bounds.w) { continue; }
    let px = u32((zr - params.bounds.x) / span.x * sizeF);
    let py = u32((params.bounds.w - zi) / span.y * sizeF);
    if (px < params.size && py < params.size) {
      atomicAdd(&density[py * params.size + px], 1u);
    }
  }
}
`;

export const histogramShader = /* wgsl */ `
struct Params { pixelCount: u32, pad0: u32, pad1: u32, pad2: u32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> density: array<u32>;
@group(0) @binding(2) var<storage, read_write> histogram: array<atomic<u32>>;

@compute @workgroup_size(64)
fn histogram(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.pixelCount) { return; }
  let value = density[id.x];
  // Percentiles are taken over occupied pixels only, matching the Python.
  if (value == 0u) { return; }
  let light = log(1.0 + f32(value));
  let scaled = light / ${HISTOGRAM_MAX_LOG}.0 * ${HISTOGRAM_BINS}.0;
  let bin = min(${HISTOGRAM_BINS}u - 1u, u32(max(scaled, 0.0)));
  atomicAdd(&histogram[bin], 1u);
}
`;

export const colorizeShader = /* wgsl */ `
struct Params { size: u32, pad: u32, low: f32, high: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> density: array<u32>;
@group(0) @binding(2) var output: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn colorize(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.size || id.y >= params.size) { return; }
  let value = density[id.y * params.size + id.x];
  let light = log(1.0 + f32(value));
  let normalized = clamp((light - params.low) / max(params.high - params.low, 1e-9), 0.0, 1.0);
  let contrast = pow(normalized, 1.68);
  var alpha = clamp((contrast - 0.018) * 1.55, 0.0, 1.0);
  if (contrast < 0.055) { alpha = 0.0; }
  let color = vec3f(
    (8.0 + contrast * 235.0) / 255.0,
    (72.0 + contrast * 183.0) / 255.0,
    (92.0 + contrast * 143.0) / 255.0,
  );
  textureStore(output, vec2i(id.xy), vec4f(color, alpha));
}
`;

export const blitShader = /* wgsl */ `
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  let points = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(points[index], 0.0, 1.0);
  out.uv = points[index] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  let sampled = textureSample(source, sourceSampler, in.uv);
  // Canvas contexts are configured premultiplied; the storage texture is not.
  return vec4f(sampled.rgb * sampled.a, sampled.a);
}
`;
```

- [ ] **Step 2: Write the generator**

Create `lib/buddhabrot/generator.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import type { GpuContext } from "@/lib/gpu";
import { cutsFromHistogram, HISTOGRAM_BINS } from "./normalize";
import { samplesForFrame } from "./pacing";
import {
  accumulateShader,
  blitShader,
  BOUNDS,
  colorizeShader,
  histogramShader,
  MAX_ITERATIONS,
} from "./shaders";

/** Well above the Python script's 1.2M, so the result is cleaner as well as larger. */
export const DEFAULT_SAMPLE_BUDGET: Record<number, number> = {
  2048: 16_000_000,
  4096: 64_000_000,
};

export type GeneratorOptions = {
  size: number;
  totalSamples?: number;
  minDurationMs?: number;
};

export type BuddhabrotGenerator = {
  step: (deltaSeconds: number) => void;
  progress: () => number;
  isComplete: () => boolean;
  blit: (context: any) => void;
  toBitmapAndBlob: () => Promise<{ bitmap: ImageBitmap; blob: Blob | null }>;
  destroy: () => void;
};

export function createBuddhabrotGenerator(
  gpu: GpuContext,
  options: GeneratorOptions,
): BuddhabrotGenerator {
  const device = gpu.device;
  const usage = (globalThis as any).GPUBufferUsage;
  const textureUsage = (globalThis as any).GPUTextureUsage;
  const { size } = options;
  const pixelCount = size * size;
  const totalSamples = options.totalSamples ?? DEFAULT_SAMPLE_BUDGET[size] ?? 16_000_000;

  const densityBuffer = device.createBuffer({
    size: pixelCount * 4,
    usage: usage.STORAGE | usage.COPY_DST,
  });
  const histogramBuffer = device.createBuffer({
    size: HISTOGRAM_BINS * 4,
    usage: usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
  });
  const histogramReadback = device.createBuffer({
    size: HISTOGRAM_BINS * 4,
    usage: usage.COPY_DST | usage.MAP_READ,
  });
  const accumulateParams = device.createBuffer({ size: 32, usage: usage.UNIFORM | usage.COPY_DST });
  const histogramParams = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const colorizeParams = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });

  const texture = device.createTexture({
    size: [size, size],
    format: "rgba8unorm",
    usage: textureUsage.STORAGE_BINDING | textureUsage.TEXTURE_BINDING | textureUsage.COPY_SRC,
  });
  const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

  const accumulatePipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: device.createShaderModule({ code: accumulateShader }), entryPoint: "accumulate" },
  });
  const histogramPipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: device.createShaderModule({ code: histogramShader }), entryPoint: "histogram" },
  });
  const colorizePipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: device.createShaderModule({ code: colorizeShader }), entryPoint: "colorize" },
  });
  const blitModule = device.createShaderModule({ code: blitShader });
  const blitPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: blitModule, entryPoint: "vs" },
    fragment: {
      module: blitModule,
      entryPoint: "fs",
      targets: [{ format: gpu.preferredFormat }],
    },
    primitive: { topology: "triangle-list" },
  });

  const accumulateBind = device.createBindGroup({
    layout: accumulatePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: accumulateParams } },
      { binding: 1, resource: { buffer: densityBuffer } },
    ],
  });
  const histogramBind = device.createBindGroup({
    layout: histogramPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: histogramParams } },
      { binding: 1, resource: { buffer: densityBuffer } },
      { binding: 2, resource: { buffer: histogramBuffer } },
    ],
  });
  const colorizeBind = device.createBindGroup({
    layout: colorizePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: colorizeParams } },
      { binding: 1, resource: { buffer: densityBuffer } },
      { binding: 2, resource: texture.createView() },
    ],
  });
  const blitBind = device.createBindGroup({
    layout: blitPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
    ],
  });

  device.queue.writeBuffer(histogramParams, 0, new Uint32Array([pixelCount, 0, 0, 0]));

  let emitted = 0;
  let chunkIndex = 0;
  let destroyed = false;
  let readbackInFlight = false;
  // Bootstrap cuts for the very first chunk, before any histogram has landed.
  let cuts = { low: 0, high: 1 };

  function writeAccumulateParams(sampleCount: number) {
    const header = new ArrayBuffer(32);
    new Uint32Array(header, 0, 4).set([size, chunkIndex + 1, sampleCount, MAX_ITERATIONS]);
    new Float32Array(header, 16, 4).set([BOUNDS.xMin, BOUNDS.xMax, BOUNDS.yMin, BOUNDS.yMax]);
    device.queue.writeBuffer(accumulateParams, 0, header);
  }

  function writeColorizeParams() {
    const header = new ArrayBuffer(16);
    new Uint32Array(header, 0, 2).set([size, 0]);
    new Float32Array(header, 8, 2).set([cuts.low, cuts.high]);
    device.queue.writeBuffer(colorizeParams, 0, header);
  }

  async function readHistogram() {
    if (readbackInFlight || destroyed) return;
    readbackInFlight = true;
    try {
      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(histogramBuffer, 0, histogramReadback, 0, HISTOGRAM_BINS * 4);
      device.queue.submit([encoder.finish()]);
      await histogramReadback.mapAsync((globalThis as any).GPUMapMode.READ);
      if (destroyed) return;
      cuts = cutsFromHistogram(new Uint32Array(histogramReadback.getMappedRange().slice(0)));
      histogramReadback.unmap();
    } catch {
      // Keep the previous cuts. A missed readback costs one chunk of exposure lag.
    } finally {
      readbackInFlight = false;
    }
  }

  return {
    step(deltaSeconds) {
      if (destroyed || gpu.hasFailed() || emitted >= totalSamples) return;
      const requested = samplesForFrame(deltaSeconds, {
        totalSamples,
        minDurationMs: options.minDurationMs,
      });
      const sampleCount = Math.min(requested, totalSamples - emitted);
      writeAccumulateParams(sampleCount);
      writeColorizeParams();
      device.queue.writeBuffer(histogramBuffer, 0, new Uint32Array(HISTOGRAM_BINS));

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(accumulatePipeline);
      pass.setBindGroup(0, accumulateBind);
      pass.dispatchWorkgroups(Math.ceil(sampleCount / 64));
      pass.setPipeline(histogramPipeline);
      pass.setBindGroup(0, histogramBind);
      pass.dispatchWorkgroups(Math.ceil(pixelCount / 64));
      pass.setPipeline(colorizePipeline);
      pass.setBindGroup(0, colorizeBind);
      pass.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8));
      pass.end();
      device.queue.submit([encoder.finish()]);

      emitted += sampleCount;
      chunkIndex += 1;
      // Deliberately not awaited: the next chunk uses whatever cuts have landed.
      void readHistogram();
    },
    progress() {
      return Math.min(1, emitted / totalSamples);
    },
    isComplete() {
      return emitted >= totalSamples;
    },
    blit(context) {
      if (destroyed || gpu.hasFailed()) return;
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        }],
      });
      pass.setPipeline(blitPipeline);
      pass.setBindGroup(0, blitBind);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    },
    async toBitmapAndBlob() {
      const canvas = new OffscreenCanvas(size, size);
      const context = canvas.getContext("webgpu") as any;
      context.configure({
        device,
        format: gpu.preferredFormat,
        alphaMode: "premultiplied",
      });
      this.blit(context);
      // createImageBitmap reads the canvas without emptying it, unlike
      // transferToImageBitmap, so the same canvas still yields the blob.
      const bitmap = await createImageBitmap(canvas);
      let blob: Blob | null = null;
      try {
        blob = await canvas.convertToBlob({ type: "image/png" });
      } catch {
        blob = null;
      }
      return { bitmap, blob };
    },
    destroy() {
      destroyed = true;
      texture.destroy();
      densityBuffer.destroy();
      histogramBuffer.destroy();
      histogramReadback.destroy();
      accumulateParams.destroy();
      histogramParams.destroy();
      colorizeParams.destroy();
    },
  };
}
```

- [ ] **Step 3: Verify it compiles and lints**

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: all tests pass. Nothing imports the generator yet, so this only proves it type-checks and does not break the build.

- [ ] **Step 4: Commit**

```bash
git add lib/buddhabrot/shaders.ts lib/buddhabrot/generator.ts
git commit -m "Add WebGPU Buddhabrot compute generator"
```

---

### Task 7: Intro overlay and boot wiring

**Files:**
- Create: `app/BuddhabrotIntro.tsx`
- Modify: `app/globals.css` (append overlay styles)
- Modify: `app/MandelbrotSkipping.tsx` (source ref, boot effect, JSX, keyboard gate)
- Modify: `tests/rendered-html.test.mjs` (assert intro absent from SSR)

**Interfaces:**
- Consumes: `createBuddhabrotGenerator`, `DEFAULT_SAMPLE_BUDGET` from `@/lib/buddhabrot/generator`; `indexedDbStore`, `readCachedTexture`, `selectTextureSize`, `writeCachedTexture` from `@/lib/buddhabrot/cache`; `GpuContext` from `@/lib/gpu`
- Produces: `BuddhabrotIntro` default export taking `{ gpu: GpuContext; size: number; reduceMotion: boolean; onReady: (bitmap: ImageBitmap, blob: Blob | null) => void; onDismiss: () => void }`

- [ ] **Step 1: Write the overlay component**

Create `app/BuddhabrotIntro.tsx`:

```tsx
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useEffect, useRef, useState } from "react";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import type { GpuContext } from "@/lib/gpu";

const FADE_MS = 600;

export default function BuddhabrotIntro({
  gpu, size, reduceMotion, onReady, onDismiss,
}: {
  gpu: GpuContext;
  size: number;
  reduceMotion: boolean;
  onReady: (bitmap: ImageBitmap, blob: Blob | null) => void;
  onDismiss: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("webgpu") as any;
    if (!context) {
      onDismiss();
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    context.configure({ device: gpu.device, format: gpu.preferredFormat, alphaMode: "premultiplied" });

    const generator = createBuddhabrotGenerator(gpu, {
      size,
      // Reduced motion opts out of spectacle, so drop the five second floor.
      minDurationMs: reduceMotion ? 0 : undefined,
    });

    let frame = 0;
    let lastTime = performance.now();
    let finished = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;

    function loop(now: number) {
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;
      generator.step(elapsed);
      generator.blit(context);
      setProgress(generator.progress());
      if (generator.isComplete() && !finished) {
        finished = true;
        generator.toBitmapAndBlob().then(({ bitmap, blob }) => {
          onReady(bitmap, blob);
          setFading(true);
          dismissTimer = setTimeout(onDismiss, FADE_MS);
        }).catch(() => onDismiss());
        return;
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(dismissTimer);
      generator.destroy();
    };
  }, [gpu, size, reduceMotion, onReady, onDismiss]);

  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <canvas ref={canvasRef} className="introCanvas" aria-hidden="true" />
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        <span className="liveProgress"><i style={{ width: `${Math.max(2, progress * 100)}%` }} /></span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the overlay styles**

Append to `app/globals.css`, immediately before the `@media (max-width: 760px)` block:

```css
.introOverlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  background: #09212c;
  transition: opacity 600ms ease;
}
.introOverlay.fading { opacity: 0; pointer-events: none; }
.introCanvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
.introChrome {
  position: relative;
  z-index: 1;
  width: min(320px, 62vw);
  text-align: center;
}
.introTitle {
  display: block;
  color: #dffbff;
  font-size: 11px;
  letter-spacing: .22em;
  text-transform: uppercase;
}
```

`.introCanvas` deliberately omits the `image-rendering: pixelated` that `.gpuCanvas` and `.gameCanvas` carry — the whole point is that this one is smooth.

- [ ] **Step 3: Add the imports, refs, and boot state**

Add these imports at the top of `app/MandelbrotSkipping.tsx`:

```ts
import BuddhabrotIntro from "./BuddhabrotIntro";
import {
  indexedDbStore,
  readCachedTexture,
  selectTextureSize,
  writeCachedTexture,
} from "@/lib/buddhabrot/cache";
```

Alongside the other refs near the top of the component, add:

```ts
  const buddhabrotSourceRef = useRef<CanvasImageSource | null>(null);
  const invalidateFlashlightRef = useRef<() => void>(() => {});
  const introActiveRef = useRef(false);
  const [intro, setIntro] = useState<{ gpu: GpuContext; size: number; reduceMotion: boolean } | null>(null);
```

`invalidateFlashlightRef` follows the existing `restartRef` pattern in this component: the game effect owns the closure variable, and outside code pokes it through a ref.

- [ ] **Step 4: Replace the hardcoded image with a swappable source**

In `app/MandelbrotSkipping.tsx`, inside the game canvas effect, find:

```ts
    const buddhabrotImage = new Image();
    let buddhabrotReady = false;
    let flashlightDirty = true;

    buddhabrotImage.decoding = "async";
    buddhabrotImage.onload = () => {
      buddhabrotReady = true;
      flashlightDirty = true;
    };
    buddhabrotImage.src = "buddhabrot-density.png";
```

Replace with:

```ts
    let flashlightDirty = true;

    invalidateFlashlightRef.current = () => { flashlightDirty = true; };
```

Then in `drawMappedBuddhabrot()`, replace:

```ts
      target.drawImage(buddhabrotImage, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
```

with:

```ts
      const source = buddhabrotSourceRef.current;
      if (!source) return;
      target.drawImage(source, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
```

And in `drawFlashlight()`, replace:

```ts
      if (!geometry || !buddhabrotReady || !flashlightContext) return;
```

with:

```ts
      if (!geometry || !buddhabrotSourceRef.current || !flashlightContext) return;
```

Finally, in the effect's cleanup, remove this line (the image no longer exists):

```ts
      buddhabrotImage.onload = null;
```

- [ ] **Step 5: Gate the keyboard while the intro is up**

At the top of `onKeyDown`, add:

```ts
      if (introActiveRef.current) return;
```

The overlay covers the canvas so pointer input is already blocked; this closes the keyboard path, which listens on `window`.

- [ ] **Step 6: Add the boot effect**

Add this effect after the engine effect:

```ts
  useEffect(() => {
    let cancelled = false;

    function adoptSource(source: CanvasImageSource) {
      if (cancelled) return;
      buddhabrotSourceRef.current = source;
      invalidateFlashlightRef.current();
    }

    function fallbackToStaticImage() {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => adoptSource(image);
      image.src = "buddhabrot-density.png";
    }

    async function boot() {
      const size = selectTextureSize(window);
      const store = indexedDbStore(window.indexedDB);
      const cached = await readCachedTexture(size, store);
      if (cancelled) return;
      if (cached) {
        adoptSource(await createImageBitmap(cached));
        return;
      }
      // Await the same acquisition the engine effect started, rather than
      // requesting a second device or polling for the first.
      const gpu = await (gpuPromiseRef.current ?? Promise.resolve(null));
      if (cancelled) return;
      if (!gpu || gpu.hasFailed()) {
        fallbackToStaticImage();
        return;
      }
      introActiveRef.current = true;
      setIntro({
        gpu,
        size,
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    }

    boot().catch(fallbackToStaticImage);
    return () => { cancelled = true; };
  }, []);

  const handleIntroReady = useCallback((bitmap: ImageBitmap, blob: Blob | null) => {
    buddhabrotSourceRef.current = bitmap;
    invalidateFlashlightRef.current();
    if (!blob) return;
    // Fire and forget: encoding is slow and play has already started.
    void writeCachedTexture(selectTextureSize(window), blob, indexedDbStore(window.indexedDB));
  }, []);

  const handleIntroDismiss = useCallback(() => {
    introActiveRef.current = false;
    setIntro(null);
    if (!buddhabrotSourceRef.current) {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        buddhabrotSourceRef.current = image;
        invalidateFlashlightRef.current();
      };
      image.src = "buddhabrot-density.png";
    }
  }, []);
```

`handleIntroDismiss` covers the case where generation threw before producing a bitmap: the overlay closes and the static PNG takes over, so the reveal still works.

- [ ] **Step 7: Render the overlay**

In the returned JSX, inside `<section className="playfield">`, after the two existing canvases, add:

```tsx
        {intro && (
          <BuddhabrotIntro
            gpu={intro.gpu}
            size={intro.size}
            reduceMotion={intro.reduceMotion}
            onReady={handleIntroReady}
            onDismiss={handleIntroDismiss}
          />
        )}
```

`intro` starts `null`, so nothing renders during server rendering.

- [ ] **Step 8: Assert the overlay is absent from server HTML**

In `tests/rendered-html.test.mjs`, add to the existing assertions, after the `assert.doesNotMatch(html, /waterGrain|resultCard|gameTitle|hudPill/);` line:

```js
  assert.doesNotMatch(html, /introOverlay|introCanvas/);
```

- [ ] **Step 9: Run the full suite**

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: all unit tests pass and the SSR test passes including the new assertion.

- [ ] **Step 10: Verify the first launch**

Run: `npm run dev`, open the URL in a fresh profile or after clearing site data.
Expected: the overlay appears immediately, the Buddhabrot visibly accumulates from sparse noise into dense structure over at least 5 seconds with the progress line filling, then the overlay fades and the stone becomes grabbable. Aiming reveals a sharp Buddhabrot in the cone.

- [ ] **Step 11: Verify the second launch**

Reload the page.
Expected: no overlay, no wait, and aiming immediately reveals the same sharp Buddhabrot. Confirm in DevTools that IndexedDB database `mandelbrot-skipping` holds one `textures` entry keyed `buddhabrot:v1:4096`.

- [ ] **Step 12: Verify the fallback path**

In DevTools, delete the IndexedDB database, then disable WebGPU (Chrome: `chrome://flags` → Unsafe WebGPU disabled, or run a browser without WebGPU support) and reload.
Expected: no overlay, no wait, the "WebGPU is unavailable" notice appears in the score rail, and aiming still reveals the original 1024x1024 Buddhabrot. The game is playable throughout.

- [ ] **Step 13: Commit**

```bash
git add app/BuddhabrotIntro.tsx app/MandelbrotSkipping.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Generate the Buddhabrot on first launch with a full-screen build-up"
```

---

## Notes for the reviewer

- **Not covered by automated tests:** the WGSL shaders and `indexedDbStore`. Both are verified by the manual steps in Task 7. This is called out in the spec as a known gap.
- **Tuning constant most likely to need adjustment:** `DEFAULT_SAMPLE_BUDGET` in `lib/buddhabrot/generator.ts`. If a mid-range GPU cannot clear 64M seeds within 5 seconds the intro overruns rather than janking, but the number may want lowering after testing on real hardware.
- **Accepted limitation:** the intro canvas sizes itself once at mount and does not respond to a window resize during the build-up. The blit is a fullscreen triangle, so a mid-intro resize stretches rather than breaks, and the window is at most five seconds. Not worth a `ResizeObserver`.
- **Deliberately out of scope:** adding `npm test` to `.github/workflows/deploy-pages.yml`. The workflow currently only builds. Worth doing, but it is a separate change.
