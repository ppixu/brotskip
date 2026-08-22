# Compact Intro Splat Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the intro splat download from 4.58 MB SPZ to ~1 MB by shipping a purpose-built compact format (sorted voxel deltas + densities, everything else derived at load), with a debug checkbox that switches back to the untouched legacy SPZ for A/B comparison.

**Architecture:** The C++ generator gains a `--compact-output` flag writing a 24-byte header plus two streams (varint voxel-index deltas, u8 densities). A new pure module `lib/splat-cloud.ts` decodes the format and reproduces the generator's color/alpha/position math. `BuddhabrotCloudCanvas` gains a compact load path (fetch with progress → `DecompressionStream` → decode → `PackedSplats.pushSplat` loop → `SplatMesh({ packedSplats })`) selected by a persisted `legacySplat` tuning flag surfaced as a checkbox in the intro overlay.

**Tech Stack:** TypeScript, React 19, three.js, `@sparkjsdev/spark` 2.1 (`PackedSplats`, `SplatMesh`), C++20 offline generator, `node --test`.

**Spec:** `docs/superpowers/specs/2026-08-22-splat-size-reduction-design.md`

## Global Constraints

- Branch: `splat-compact-hover`. All work lands there.
- `public/true-buddhabrot-4096.spz` and `public/henon-buddhabrot-4096.spz` stay **byte-identical** — the legacy path must keep loading the exact current asset. The generation script must not overwrite them by default.
- The compact format magic is ASCII `BBP1` (little-endian u32 `0x31504242`).
- New asset file: `public/true-buddhabrot-450k.bbp.gz` (gzip -9 of the raw `.bbp`).
- Color/alpha/position formulas in TS must match `tools/true_buddhabrot_splat.cpp` exactly (values verified in unit tests): position `fieldMin + (index + 0.5) / resolution * span`; `warmth = clamp(0.28·yNorm + 0.72·depth, 0, 1)` with `yNorm = yIndex/(res−1)`, `depth = zIndex/(res−1)`; `luminance = 0.34 + 0.66·√density`; `r = clamp(lum·(0.38+0.55·warmth))`, `g = clamp(lum·(0.72+0.20·warmth))`, `b = clamp(lum·(1.04−0.08·warmth))`; `alpha = clamp(0.012 + 0.54·density^1.28, 0.01, 0.55)`; isotropic scale `sigma = (fieldMax−fieldMin)/resolution·0.22`, identity rotation.
- Tuning storage key stays `mandelbrot-skipping:tuning:v8` — the new `legacySplat` boolean defaults to `false` in `sanitizeTuning`, so stored v8 blobs remain valid.
- Run `npm run lint` before every commit. It must pass.
- Imports use the existing `@/*` alias.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/splat-cloud.ts` | Create: pure decode + per-splat attribute math | 1 |
| `tests/unit/splat-cloud.test.ts` | Create: decode/attribute unit tests | 1 |
| `tools/true_buddhabrot_splat.cpp` | Modify: `--compact-output` + `write_compact` | 2 |
| `tools/generate_true_buddhabrot.sh` | Modify: compact output, gzip, guarded SPZ step | 2 |
| `tests/fixtures/tiny-buddhabrot.bbp` | Create: small real generator output | 2 |
| `tests/unit/splat-cloud-fixture.test.ts` | Create: fixture decode invariants | 2 |
| `app/MandelbrotSkipping.tsx` | Modify: `legacySplat` tuning field + prop plumbing | 3 |
| `app/BuddhabrotIntro.tsx` | Modify: debug checkbox, pass-through props | 3 |
| `app/globals.css` | Modify: `.introDebugToggle` styles | 3 |
| `app/BuddhabrotCloudCanvas.tsx` | Modify: compact load path + legacy switch | 4 |
| `tests/unit/intro-cloud-modes.test.ts` | Modify: assert both load paths | 4, 5 |
| `public/true-buddhabrot-450k.bbp.gz` | Create: production asset | 5 |

---

### Task 1: Pure compact-cloud decoder

**Files:**
- Create: `lib/splat-cloud.ts`
- Create: `tests/unit/splat-cloud.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `COMPACT_MAGIC: number`, `CompactCloud = { resolution: number; fieldMin: number; fieldMax: number; sigma: number; count: number; voxels: Uint32Array; densities: Uint8Array }`, `decodeCompactCloud(bytes: Uint8Array): CompactCloud`, `CompactSplat = { x: number; y: number; z: number; r: number; g: number; b: number; alpha: number }`, `compactSplatAt(cloud: CompactCloud, index: number, out: CompactSplat): CompactSplat`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/splat-cloud.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPACT_MAGIC,
  compactSplatAt,
  decodeCompactCloud,
  type CompactSplat,
} from "../../lib/splat-cloud.ts";

/** Test-only encoder mirroring write_compact in tools/true_buddhabrot_splat.cpp. */
function encode(header: { resolution: number; fieldMin: number; fieldMax: number; sigma: number },
  entries: Array<{ voxel: number; density: number }>): Uint8Array {
  const bytes: number[] = [];
  const pushU32 = (value: number) => {
    bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  };
  const pushF32 = (value: number) => {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    for (let i = 0; i < 4; i++) bytes.push(view.getUint8(i));
  };
  const pushVarint = (value: number) => {
    while (value >= 0x80) {
      bytes.push((value & 0x7f) | 0x80);
      value = Math.floor(value / 128);
    }
    bytes.push(value);
  };
  pushU32(COMPACT_MAGIC);
  pushU32(header.resolution);
  pushU32(entries.length);
  pushF32(header.fieldMin);
  pushF32(header.fieldMax);
  pushF32(header.sigma);
  let previous = 0;
  entries.forEach((entry, index) => {
    pushVarint(index === 0 ? entry.voxel : entry.voxel - previous);
    previous = entry.voxel;
  });
  for (const entry of entries) bytes.push(entry.density);
  return new Uint8Array(bytes);
}

const HEADER = { resolution: 8, fieldMin: -2.35, fieldMax: 2.35, sigma: 0.129 };

test("decodes header and round-trips sorted voxel ids", () => {
  const entries = [
    { voxel: 3, density: 10 },
    { voxel: 200, density: 128 },
    { voxel: 511, density: 255 },
  ];
  const cloud = decodeCompactCloud(encode(HEADER, entries));
  assert.equal(cloud.resolution, 8);
  assert.equal(cloud.count, 3);
  assert.ok(Math.abs(cloud.fieldMin - -2.35) < 1e-6);
  assert.ok(Math.abs(cloud.fieldMax - 2.35) < 1e-6);
  assert.ok(Math.abs(cloud.sigma - 0.129) < 1e-6);
  assert.deepEqual([...cloud.voxels], [3, 200, 511]);
  assert.deepEqual([...cloud.densities], [10, 128, 255]);
});

test("handles multi-byte varint deltas", () => {
  const entries = [
    { voxel: 5, density: 1 },
    { voxel: 5 + 300, density: 2 },
    { voxel: 5 + 300 + 700_000_000, density: 3 },
  ];
  const cloud = decodeCompactCloud(encode(HEADER, entries));
  assert.deepEqual([...cloud.voxels], [5, 305, 700_000_305]);
});

test("rejects a wrong magic", () => {
  const bytes = encode(HEADER, [{ voxel: 1, density: 1 }]);
  bytes[0] = 0x00;
  assert.throws(() => decodeCompactCloud(bytes), /BBP1/);
});

test("rejects a truncated voxel stream", () => {
  const bytes = encode(HEADER, [{ voxel: 1, density: 1 }, { voxel: 400, density: 2 }]);
  assert.throws(() => decodeCompactCloud(bytes.slice(0, 25)), /truncated/);
});

test("rejects a truncated density stream", () => {
  const bytes = encode(HEADER, [{ voxel: 1, density: 1 }, { voxel: 2, density: 2 }]);
  assert.throws(() => decodeCompactCloud(bytes.slice(0, bytes.length - 1)), /truncated/);
});

test("positions land at voxel centers inside the field", () => {
  // resolution 8, field -2.35..2.35, voxel = z*64 + y*8 + x with x=1, y=2, z=3.
  const cloud = decodeCompactCloud(encode(HEADER, [{ voxel: 3 * 64 + 2 * 8 + 1, density: 255 }]));
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  compactSplatAt(cloud, 0, out);
  const span = 4.7;
  assert.ok(Math.abs(out.x - (-2.35 + 1.5 / 8 * span)) < 1e-6);
  assert.ok(Math.abs(out.y - (-2.35 + 2.5 / 8 * span)) < 1e-6);
  assert.ok(Math.abs(out.z - (-2.35 + 3.5 / 8 * span)) < 1e-6);
});

test("attribute math matches the generator formulas", () => {
  // yIndex 2, zIndex 3, resolution 8 -> yNorm 2/7, depth 3/7; density 128/255.
  const cloud = decodeCompactCloud(encode(HEADER, [{ voxel: 3 * 64 + 2 * 8 + 1, density: 128 }]));
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  compactSplatAt(cloud, 0, out);
  const normalized = 128 / 255;
  const warmth = Math.min(1, Math.max(0, 0.28 * (2 / 7) + 0.72 * (3 / 7)));
  const luminance = 0.34 + 0.66 * Math.sqrt(normalized);
  assert.ok(Math.abs(out.r - Math.min(1, luminance * (0.38 + 0.55 * warmth))) < 1e-9);
  assert.ok(Math.abs(out.g - Math.min(1, luminance * (0.72 + 0.20 * warmth))) < 1e-9);
  assert.ok(Math.abs(out.b - Math.min(1, luminance * (1.04 - 0.08 * warmth))) < 1e-9);
  assert.ok(Math.abs(out.alpha - (0.012 + 0.54 * Math.pow(normalized, 1.28))) < 1e-9);
});

test("alpha clamps to the generator bounds", () => {
  const cloud = decodeCompactCloud(encode(HEADER, [
    { voxel: 1, density: 0 },
    { voxel: 2, density: 255 },
  ]));
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  assert.ok(compactSplatAt(cloud, 0, out).alpha >= 0.01);
  assert.ok(compactSplatAt(cloud, 1, out).alpha <= 0.55);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/splat-cloud.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/splat-cloud.ts`:

```ts
/**
 * Decoder for the compact Buddhabrot splat cloud ("BBP1") written by
 * tools/true_buddhabrot_splat.cpp --compact-output. The file carries only
 * sorted voxel indices (varint deltas) and u8 densities; position, color,
 * alpha, and scale are derived here with the generator's exact formulas.
 */

export const COMPACT_MAGIC = 0x31504242; // ASCII "BBP1", little-endian.

export type CompactCloud = {
  resolution: number;
  fieldMin: number;
  fieldMax: number;
  sigma: number;
  count: number;
  voxels: Uint32Array;
  densities: Uint8Array;
};

export type CompactSplat = {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
};

const HEADER_BYTES = 24;

export function decodeCompactCloud(bytes: Uint8Array): CompactCloud {
  if (bytes.byteLength < HEADER_BYTES) throw new Error("not a BBP1 compact splat cloud");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== COMPACT_MAGIC) throw new Error("not a BBP1 compact splat cloud");
  const resolution = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const fieldMin = view.getFloat32(12, true);
  const fieldMax = view.getFloat32(16, true);
  const sigma = view.getFloat32(20, true);
  if (!(resolution > 0) || !(fieldMax > fieldMin) || !(sigma > 0)) {
    throw new Error("corrupt BBP1 header");
  }
  const voxels = new Uint32Array(count);
  let offset = HEADER_BYTES;
  let previous = 0;
  for (let index = 0; index < count; index++) {
    let value = 0;
    let shift = 0;
    for (;;) {
      if (offset >= bytes.byteLength) throw new Error("truncated voxel stream");
      const byte = bytes[offset++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    previous = index === 0 ? value : previous + value;
    voxels[index] = previous;
  }
  if (offset + count > bytes.byteLength) throw new Error("truncated density stream");
  const densities = bytes.slice(offset, offset + count);
  return { resolution, fieldMin, fieldMax, sigma, count, voxels, densities };
}

export function compactSplatAt(cloud: CompactCloud, index: number, out: CompactSplat): CompactSplat {
  const { resolution, fieldMin, fieldMax } = cloud;
  const plane = resolution * resolution;
  const voxel = cloud.voxels[index];
  const zIndex = Math.floor(voxel / plane);
  const remainder = voxel % plane;
  const yIndex = Math.floor(remainder / resolution);
  const xIndex = remainder % resolution;
  const span = fieldMax - fieldMin;
  out.x = fieldMin + (xIndex + 0.5) / resolution * span;
  out.y = fieldMin + (yIndex + 0.5) / resolution * span;
  out.z = fieldMin + (zIndex + 0.5) / resolution * span;
  const normalized = cloud.densities[index] / 255;
  const denominator = Math.max(1, resolution - 1);
  const warmth = Math.min(1, Math.max(0, 0.28 * (yIndex / denominator) + 0.72 * (zIndex / denominator)));
  const luminance = 0.34 + 0.66 * Math.sqrt(normalized);
  out.r = Math.min(1, Math.max(0, luminance * (0.38 + 0.55 * warmth)));
  out.g = Math.min(1, Math.max(0, luminance * (0.72 + 0.20 * warmth)));
  out.b = Math.min(1, Math.max(0, luminance * (1.04 - 0.08 * warmth)));
  out.alpha = Math.min(0.55, Math.max(0.01, 0.012 + 0.54 * Math.pow(normalized, 1.28)));
  return out;
}
```

Note the varint accumulation uses `value += (byte & 0x7f) * 2 ** shift` (not `|=`) so indices up to 896³ ≈ 7.19e8 never hit 32-bit signed shift overflow.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: PASS (all existing tests plus the new splat-cloud tests).

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/splat-cloud.ts tests/unit/splat-cloud.test.ts
git commit -m "Add compact Buddhabrot splat cloud decoder"
```

---

### Task 2: Generator compact output + fixture

**Files:**
- Modify: `tools/true_buddhabrot_splat.cpp`
- Modify: `tools/generate_true_buddhabrot.sh`
- Create: `tests/fixtures/tiny-buddhabrot.bbp`
- Create: `tests/unit/splat-cloud-fixture.test.ts`

**Interfaces:**
- Consumes: `decodeCompactCloud`, `compactSplatAt` from Task 1
- Produces: generator flag `--compact-output <path>`; fixture file consumed by the fixture test; shell script producing `public/true-buddhabrot-450k.bbp.gz`

- [ ] **Step 1: Add the compact writer to the C++ tool**

In `tools/true_buddhabrot_splat.cpp`:

Add to `struct Options` (after the `output` member):

```cpp
  std::filesystem::path compact_output;
```

Add these two functions immediately after `write_ply` (before `parse_options`):

```cpp
void append_varint(std::ofstream& output, uint32_t value) {
  while (value >= 0x80) {
    output.put(static_cast<char>(static_cast<uint8_t>(value) | 0x80u));
    value >>= 7;
  }
  output.put(static_cast<char>(static_cast<uint8_t>(value)));
}

// Compact "BBP1" cloud: header, varint voxel-index deltas, u8 densities.
// Decoded by lib/splat-cloud.ts, which derives color/alpha/position/scale.
void write_compact(const Options& options, const std::vector<Candidate>& splats) {
  std::filesystem::create_directories(options.compact_output.parent_path());
  std::ofstream output(options.compact_output, std::ios::binary);
  if (!output) throw std::runtime_error("could not open compact output");
  const uint32_t magic = 0x31504242u;  // "BBP1"
  const uint32_t resolution = options.resolution;
  const uint32_t count = static_cast<uint32_t>(splats.size());
  const float field_min = static_cast<float>(FIELD_MIN);
  const float field_max = static_cast<float>(FIELD_MAX);
  const float sigma = static_cast<float>((FIELD_MAX - FIELD_MIN) / options.resolution * 0.22);
  output.write(reinterpret_cast<const char*>(&magic), 4);
  output.write(reinterpret_cast<const char*>(&resolution), 4);
  output.write(reinterpret_cast<const char*>(&count), 4);
  output.write(reinterpret_cast<const char*>(&field_min), 4);
  output.write(reinterpret_cast<const char*>(&field_max), 4);
  output.write(reinterpret_cast<const char*>(&sigma), 4);
  uint32_t previous = 0;
  for (size_t index = 0; index < splats.size(); ++index) {
    append_varint(output, index == 0 ? splats[index].voxel : splats[index].voxel - previous);
    previous = splats[index].voxel;
  }
  for (const Candidate& splat : splats) {
    const float density = std::clamp(splat.density, 0.0f, 1.0f);
    output.put(static_cast<char>(static_cast<uint8_t>(std::lround(density * 255.0f))));
  }
}
```

In `parse_options`, add the flag next to `--output`:

```cpp
    else if (argument == "--compact-output") options.compact_output = next();
```

In `main`, after the existing `write_ply(options, candidates);` line, add:

```cpp
    if (!options.compact_output.empty()) write_compact(options, candidates);
```

The candidates are already sorted by voxel ascending at that point (the `std::sort` above `write_ply`), which the delta encoding requires.

- [ ] **Step 2: Update the generation script**

Replace the body of `tools/generate_true_buddhabrot.sh` from the binary invocation down with:

```bash
"$build_dir/true_buddhabrot_splat" \
  --samples "${BUDDHABROT_SAMPLES:-16000000}" \
  --iterations "${BUDDHABROT_ITERATIONS:-4096}" \
  --resolution "${BUDDHABROT_RESOLUTION:-896}" \
  --min-escape "${BUDDHABROT_MIN_ESCAPE:-8}" \
  --max-splats "${BUDDHABROT_MAX_SPLATS:-450000}" \
  --output "$build_dir/splat.ply" \
  --compact-output "$build_dir/splat.bbp"

gzip -9 -c "$build_dir/splat.bbp" > "$repo_dir/public/true-buddhabrot-450k.bbp.gz"

# The legacy SPZ in public/ must stay byte-identical for the debug A/B switch.
# Regenerate it only on explicit request.
if [ "${BUDDHABROT_WRITE_SPZ:-0}" = "1" ]; then
  npx --yes @playcanvas/splat-transform \
    "$build_dir/splat.ply" \
    --filter-nan \
    "$repo_dir/public/true-buddhabrot-4096.spz" \
    --spz-version 3 \
    -w
fi

du -h "$build_dir/splat.ply" "$build_dir/splat.bbp" "$repo_dir/public/true-buddhabrot-450k.bbp.gz"
```

Note the default `--max-splats` drops from 1,000,000 to 450,000 per the spec.

- [ ] **Step 3: Compile and run a tiny smoke generation for the fixture**

```bash
mkdir -p outputs/true-buddhabrot tests/fixtures
clang++ -O3 -std=c++20 -pthread tools/true_buddhabrot_splat.cpp -o outputs/true-buddhabrot/true_buddhabrot_splat
outputs/true-buddhabrot/true_buddhabrot_splat \
  --samples 300000 --iterations 512 --resolution 96 --max-splats 5000 \
  --output outputs/true-buddhabrot/tiny.ply \
  --compact-output tests/fixtures/tiny-buddhabrot.bbp
```

Expected: stderr reports qualified paths and "wrote 5000 true Buddhabrot splats" (or fewer if under 5000 voxels qualify); `tests/fixtures/tiny-buddhabrot.bbp` exists and is roughly 8–20 KB.

- [ ] **Step 4: Write the fixture test**

Create `tests/unit/splat-cloud-fixture.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compactSplatAt, decodeCompactCloud, type CompactSplat } from "../../lib/splat-cloud.ts";

const bytes = new Uint8Array(readFileSync(new URL("../fixtures/tiny-buddhabrot.bbp", import.meta.url)));

test("decodes a real generator artifact", () => {
  const cloud = decodeCompactCloud(bytes);
  assert.equal(cloud.resolution, 96);
  assert.ok(cloud.count > 100, `count was ${cloud.count}`);
  assert.equal(cloud.voxels.length, cloud.count);
  assert.equal(cloud.densities.length, cloud.count);
  for (let index = 1; index < cloud.count; index++) {
    assert.ok(cloud.voxels[index] > cloud.voxels[index - 1], `voxels not strictly increasing at ${index}`);
  }
  assert.ok(cloud.voxels[cloud.count - 1] < 96 ** 3);
});

test("every derived splat stays inside the field with sane attributes", () => {
  const cloud = decodeCompactCloud(bytes);
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  for (let index = 0; index < cloud.count; index++) {
    compactSplatAt(cloud, index, out);
    for (const value of [out.x, out.y, out.z]) {
      assert.ok(value > cloud.fieldMin && value < cloud.fieldMax);
    }
    for (const value of [out.r, out.g, out.b]) {
      assert.ok(value >= 0 && value <= 1);
    }
    assert.ok(out.alpha >= 0.01 && out.alpha <= 0.55);
  }
});
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:unit`
Expected: PASS including both new fixture tests.

- [ ] **Step 6: Start the full production generation in the background**

```bash
bash tools/generate_true_buddhabrot.sh
```

This is the 16 M-sample, 896³ run — minutes of CPU. Start it now (in the background if orchestrating) so its output is ready by Task 5. It writes `public/true-buddhabrot-450k.bbp.gz` and touches nothing in `public/` besides that file.

- [ ] **Step 7: Verify lint and commit**

Run: `npm run lint`
Expected: no errors.

```bash
git add tools/true_buddhabrot_splat.cpp tools/generate_true_buddhabrot.sh tests/fixtures/tiny-buddhabrot.bbp tests/unit/splat-cloud-fixture.test.ts
git commit -m "Emit the compact BBP1 cloud from the Buddhabrot generator"
```

---

### Task 3: `legacySplat` tuning flag and intro debug checkbox

**Files:**
- Modify: `app/MandelbrotSkipping.tsx` (Tuning type, defaults, sanitize, intro JSX)
- Modify: `app/BuddhabrotIntro.tsx` (checkbox + props)
- Modify: `app/globals.css` (toggle styles)

**Interfaces:**
- Consumes: existing `updateTuning(partial)` helper and `tuning` state in `MandelbrotSkipping`
- Produces: `Tuning.legacySplat: boolean`; `BuddhabrotIntro` props `legacySplat: boolean` and `onLegacySplatChange: (value: boolean) => void`; `BuddhabrotIntro` forwards `legacySplat` to `BuddhabrotCloudCanvas` (prop lands in Task 4 — until then the intro holds it without passing it on, so this task compiles standalone)

- [ ] **Step 1: Extend the Tuning type and defaults**

In `app/MandelbrotSkipping.tsx`, in `type Tuning`, after `doublePixels: boolean;` add:

```ts
  legacySplat: boolean;
```

In `DEFAULT_TUNING`, after `doublePixels: false,` add:

```ts
  legacySplat: false,
```

- [ ] **Step 2: Sanitize it**

In `sanitizeTuning`, after `const doublePixels = value?.doublePixels === true;` add:

```ts
  const legacySplat = value?.legacySplat === true;
```

and add `legacySplat` to the returned object:

```ts
  return { sourceDots, maxDepth, acceleration, linePersist, previewOrbits, previewIterations, skipColors, coordinateAxes, rotateRight, doublePixels, legacySplat };
```

- [ ] **Step 3: Pass it to the intro**

In the JSX where the intro renders (`{intro && (<BuddhabrotIntro ...`), add the two props:

```tsx
        {intro && (
          <BuddhabrotIntro
            fading={introFading}
            playerName={playerName}
            onPlayerNameChange={renameCurrent}
            onPlay={finishOpening}
            legacySplat={tuning.legacySplat}
            onLegacySplatChange={(value) => updateTuning({ legacySplat: value })}
          />
        )}
```

- [ ] **Step 4: Render the checkbox in the intro overlay**

In `app/BuddhabrotIntro.tsx`, extend the props:

```tsx
export default function BuddhabrotIntro({
  fading, onPlay, playerName, onPlayerNameChange, legacySplat, onLegacySplatChange,
}: {
  fading: boolean;
  onPlay?: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  legacySplat: boolean;
  onLegacySplatChange: (value: boolean) => void;
}) {
```

Add the toggle just before the closing `</div>` of the overlay (after the Play button block):

```tsx
      <label className="introDebugToggle">
        <input
          type="checkbox"
          checked={legacySplat}
          aria-label="Load the legacy SPZ splat cloud instead of the compact format"
          onChange={(event) => onLegacySplatChange(event.target.checked)}
        />
        Legacy splat
      </label>
```

- [ ] **Step 5: Style it**

Append to `app/globals.css`, next to the other `.intro*` rules:

```css
.introDebugToggle {
  position: absolute;
  right: 14px;
  bottom: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(223, 251, 255, 0.5);
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
  user-select: none;
}
.introDebugToggle input {
  accent-color: #65b9ff;
}
```

If `.introPlay` or the name entry already occupies the bottom-right corner, anchor bottom-left instead (`left: 14px; right: auto;`) — check visually in Step 6.

- [ ] **Step 6: Verify**

Run: `npm run lint` — no errors.
Run: `npm test` — the SSR test still passes (the intro is client-only, so server HTML is unchanged).
Run: `npm run dev`, load the intro: the "Legacy splat" checkbox renders unobtrusively, toggles, and persists across reloads (check `mandelbrot-skipping:tuning:v8` in localStorage gains `"legacySplat":true`). It has no visual effect yet — the switch lands in Task 4.

- [ ] **Step 7: Commit**

```bash
git add app/MandelbrotSkipping.tsx app/BuddhabrotIntro.tsx app/globals.css
git commit -m "Add a persisted legacy-splat debug toggle to the intro"
```

---

### Task 4: Compact load path in the cloud canvas

**Files:**
- Modify: `app/BuddhabrotCloudCanvas.tsx`
- Modify: `app/BuddhabrotIntro.tsx` (forward the prop)
- Modify: `tests/unit/intro-cloud-modes.test.ts`

**Interfaces:**
- Consumes: `decodeCompactCloud`, `compactSplatAt`, `CompactCloud`, `CompactSplat` from `@/lib/splat-cloud`; `PackedSplats` from `@sparkjsdev/spark`; `legacySplat` prop from Task 3
- Produces: `BuddhabrotCloudCanvas` prop `legacySplat?: boolean` (default false); compact asset URL `true-buddhabrot-450k.bbp.gz`

- [ ] **Step 1: Update the source-shape test first**

In `tests/unit/intro-cloud-modes.test.ts`, inside the existing first test, add these assertions after the current ones:

```ts
  assert.match(cloud, /true-buddhabrot-450k\.bbp\.gz/);
  assert.match(cloud, /DecompressionStream\("gzip"\)/);
  assert.match(cloud, /pushSplat/);
  assert.match(cloud, /legacySplat/);
  assert.match(cloud, /decodeCompactCloud/);
```

Run: `npm run test:unit` — expected: FAIL on the new assertions (source unchanged so far).

- [ ] **Step 2: Add the loader and the branch**

In `app/BuddhabrotCloudCanvas.tsx`:

Add imports:

```ts
import { PackedSplats } from "@sparkjsdev/spark";
import { compactSplatAt, decodeCompactCloud, type CompactCloud, type CompactSplat } from "@/lib/splat-cloud";
```

(`SparkRenderer, SplatMesh, dyno` are already imported from the same module — merge into that import statement.)

Add the prop:

```tsx
export default function BuddhabrotCloudCanvas({
  fading, onLoadProgress, onReady,
  variant = "henon",
  legacySplat = false,
  tune,
}: {
  fading: boolean;
  onLoadProgress?: (progress: number) => void;
  onReady?: () => void;
  variant?: CloudVariant;
  legacySplat?: boolean;
  tune?: Partial<IntroPlayTune>;
}) {
```

Add the fetch/decode helper above the component (module scope, after `makeBeaconTexture`):

```ts
/** Fetch + gunzip + decode the compact cloud, reporting download progress. */
async function loadCompactCloud(url: string, onProgress?: (progress: number) => void): Promise<CompactCloud> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`compact cloud fetch failed: ${response.status}`);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress?.(Math.min(1, received / total));
  }
  const raw = new Uint8Array(await new Blob(chunks).arrayBuffer());
  // A proxy may already have transparently gunzipped the response.
  const isRaw = raw.length >= 4 && raw[0] === 0x42 && raw[1] === 0x42 && raw[2] === 0x50 && raw[3] === 0x31;
  if (isRaw) return decodeCompactCloud(raw);
  const inflated = await new Response(
    new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip")),
  ).arrayBuffer();
  return decodeCompactCloud(new Uint8Array(inflated));
}

function packCompactCloud(cloud: CompactCloud): PackedSplats {
  return new PackedSplats({
    maxSplats: cloud.count,
    construct: (splats) => {
      const center = new THREE.Vector3();
      const scales = new THREE.Vector3(cloud.sigma, cloud.sigma, cloud.sigma);
      const quaternion = new THREE.Quaternion();
      const color = new THREE.Color();
      const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
      for (let index = 0; index < cloud.count; index++) {
        compactSplatAt(cloud, index, out);
        center.set(out.x, out.y, out.z);
        color.setRGB(out.r, out.g, out.b);
        splats.pushSplat(center, scales, quaternion, out.alpha, color);
      }
    },
  });
}
```

- [ ] **Step 3: Restructure splat creation to support the async path**

Inside the effect, replace the block from `const assetName = classic ? ...` through `scene.add(splat);` (including `splat.opacity = 0.82;`) with:

```ts
    const useCompact = classic && !legacySplat;
    const assetName = classic ? "true-buddhabrot-4096.spz" : "henon-buddhabrot-4096.spz";
    const compactName = "true-buddhabrot-450k.bbp.gz";
    let splat: SplatMesh | null = null;
    let splatLoadFailed = false;

    const splatSize = dyno.dynoFloat(tuneRef.current.splatSize);
    const splatSizeModifier = dyno.dynoBlock(
      { gsplat: dyno.Gsplat },
      { gsplat: dyno.Gsplat },
      ({ gsplat }) => {
        if (!gsplat) throw new Error("No gsplat input");
        const { scales } = dyno.splitGsplat(gsplat).outputs;
        return {
          gsplat: dyno.combineGsplat({
            gsplat,
            scales: dyno.mul(scales, splatSize),
          }),
        };
      },
    );

    async function createSplatMesh(): Promise<SplatMesh> {
      if (useCompact) {
        const url = new URL(compactName, window.location.href).href;
        const cloud = await loadCompactCloud(url, onLoadProgress);
        return new SplatMesh({ packedSplats: packCompactCloud(cloud), objectModifier: splatSizeModifier });
      }
      const url = new URL(assetName, window.location.href).href;
      return new SplatMesh({
        url,
        lod: false,
        objectModifier: splatSizeModifier,
        onProgress: (event) => {
          if (event.lengthComputable && event.total > 0) {
            onLoadProgress?.(THREE.MathUtils.clamp(event.loaded / event.total, 0, 1));
          }
        },
      });
    }

    createSplatMesh().then((mesh) => {
      if (disposed) {
        mesh.dispose();
        return;
      }
      mesh.opacity = 0.82;
      splat = mesh;
      scene.add(mesh);
      return mesh.initialized;
    }).then((mesh) => {
      if (!mesh || disposed) return;
      splatReady = true;
      nextRippleAt = performance.now() + 420;
      nextCometAt = performance.now() + 900;
      onLoadProgress?.(1);
      onReady?.();
      setReady(true);
    }).catch(() => {
      splatLoadFailed = true;
      if (!disposed) setReady(false);
    });
```

Then remove the now-duplicated original `splat.initialized.then(...)` block near the end of the effect (its logic moved into the chain above).

- [ ] **Step 4: Null-guard the splat references**

The rest of the effect touches `splat` in four places; guard each:

- `pickVisibleSplat()`: change the first line to `const packed = splat?.packedSplats;` (the existing `if (!packed) return null;` already covers the rest).
- In `render()`, the fading branch sets `splat.scale.z = introPlayFlatten(...)` and the else branch `splat.scale.z = 1;` — wrap both as `if (splat) splat.scale.z = ...`.
- In the cleanup: `scene.remove(splat)` → `if (splat) scene.remove(splat);` and inside `disposeCloud`, `splat.dispose();` → `splat?.dispose();`.
- `splatLoadFailed` is intentionally unused beyond suppressing retries — if lint flags it, drop the variable and keep the `catch` body as `if (!disposed) setReady(false);`.

Add `legacySplat` to the effect dependency array: `[variant, legacySplat, onLoadProgress, onReady]`. Toggling the checkbox mid-intro remounts the scene and reloads the other asset — intended debug behavior.

- [ ] **Step 5: Forward the prop from the intro**

In `app/BuddhabrotIntro.tsx`, pass it through:

```tsx
      <BuddhabrotCloudCanvas
        fading={fading}
        variant="classic"
        legacySplat={legacySplat}
        onLoadProgress={handleLoadProgress}
        onReady={handleReady}
      />
```

- [ ] **Step 6: Temporary asset for local verification**

The production asset lands in Task 5. For now generate a quick low-sample stand-in so the path is exercisable:

```bash
outputs/true-buddhabrot/true_buddhabrot_splat \
  --samples 2000000 --iterations 1024 --resolution 448 --max-splats 450000 \
  --output outputs/true-buddhabrot/dev.ply \
  --compact-output outputs/true-buddhabrot/dev.bbp
gzip -9 -c outputs/true-buddhabrot/dev.bbp > public/true-buddhabrot-450k.bbp.gz
```

Do NOT commit this stand-in; Task 5 replaces it with the real asset.

- [ ] **Step 7: Verify**

Run: `npm run test:unit` — the modified intro-cloud-modes test now passes.
Run: `npm run lint` — no errors.
Run: `npm run dev`:
- Default: intro loads the compact cloud, progress bar fills, cloud renders and rotates, drag orbits, ripples and comets appear, Play works.
- Toggle "Legacy splat": scene reloads with the original SPZ; both variants look like the same object (the stand-in is lower fidelity — final comparison happens in Task 5).
- Check DevTools Network: compact path fetches only `true-buddhabrot-450k.bbp.gz`; legacy path fetches only `true-buddhabrot-4096.spz`.
- Color parity: if the compact cloud's tint visibly differs from legacy, replace `color.setRGB(out.r, out.g, out.b)` with `color.setRGB(out.r, out.g, out.b, THREE.SRGBColorSpace)` in `packCompactCloud` and recompare — keep whichever matches the legacy look.

- [ ] **Step 8: Commit**

```bash
git add app/BuddhabrotCloudCanvas.tsx app/BuddhabrotIntro.tsx tests/unit/intro-cloud-modes.test.ts
git commit -m "Load the intro cloud from the compact BBP1 format with a legacy switch"
```

---

### Task 5: Production asset, size verification, full suite

**Files:**
- Create (replace stand-in): `public/true-buddhabrot-450k.bbp.gz`
- Modify: `tests/unit/intro-cloud-modes.test.ts` (asset existence + size ceiling)
- Modify: `docs/superpowers/specs/2026-08-22-splat-size-reduction-design.md` (record final numbers)

**Interfaces:**
- Consumes: the background generation started in Task 2 Step 6
- Produces: the shipping asset

- [ ] **Step 1: Confirm the full generation finished and install the asset**

The Task 2 background run already wrote `public/true-buddhabrot-450k.bbp.gz`. Confirm:

```bash
ls -la public/true-buddhabrot-450k.bbp.gz outputs/true-buddhabrot/splat.bbp
```

Expected: the `.gz` is roughly 0.8–1.4 MB. If the background run has not finished, wait for it before continuing.

- [ ] **Step 2: Add asset guards to the test**

In `tests/unit/intro-cloud-modes.test.ts`, add to the first test:

```ts
  const compactUrl = new URL("../../public/true-buddhabrot-450k.bbp.gz", import.meta.url);
  assert.ok(existsSync(compactUrl));
  assert.ok(statSync(compactUrl).size < 1_600_000, "compact asset larger than budget");
```

and extend the fs import: `import { existsSync, readFileSync, statSync } from "node:fs";`

Run: `npm run test:unit` — expected: PASS.

- [ ] **Step 3: Visual A/B against the legacy cloud**

Run: `npm run dev`. In the intro, flip "Legacy splat" off/on several times at the same camera angle. Expected: the compact cloud is not noticeably sparser or dimmer at intro viewing distance; rotation is at least as smooth (fewer splats). If the compact cloud looks thin, regenerate with `BUDDHABROT_MAX_SPLATS=550000 bash tools/generate_true_buddhabrot.sh` and re-check (the test budget of 1.6 MB accommodates this).

- [ ] **Step 4: Record the final numbers in the spec**

In `docs/superpowers/specs/2026-08-22-splat-size-reduction-design.md`, append a short "## Outcome" section stating the shipped splat count, the `.bbp.gz` byte size, and that the legacy SPZ remains for the debug switch.

- [ ] **Step 5: Full suite**

Run: `npm run lint` — no errors.
Run: `npm test` — unit tests, build, and SSR test all pass.

- [ ] **Step 6: Commit**

```bash
git add public/true-buddhabrot-450k.bbp.gz tests/unit/intro-cloud-modes.test.ts docs/superpowers/specs/2026-08-22-splat-size-reduction-design.md
git commit -m "Ship the compact 450k intro splat cloud"
```

---

## Notes for the reviewer

- **Kept deliberately:** both legacy `.spz` files in `public/`. The user asked for the old splat to remain available behind the debug checkbox; the unused henon file also stays untouched.
- **Not covered by automated tests:** `loadCompactCloud` and `packCompactCloud` (browser adapters over fetch/DecompressionStream/Spark) — verified by the manual steps in Tasks 4–5, same policy as the existing WGSL and IndexedDB adapters.
- **Likely tuning point:** the smoothing of splat count vs. size (`BUDDHABROT_MAX_SPLATS`); the A/B checkbox exists precisely to settle it by eye.
