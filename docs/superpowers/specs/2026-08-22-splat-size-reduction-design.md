# Intro Splat Size Reduction — Design

**Goal:** Cut the intro's Gaussian-splat download from 4.6 MB to roughly 1 MB without a visible quality loss or any change to rotate performance.

**Status:** Design for review. Option analysis with a recommendation; the implementation plan follows approval.

## Current state

- `app/BuddhabrotIntro.tsx` renders `BuddhabrotCloudCanvas` with `variant="classic"`, which fetches `public/true-buddhabrot-4096.spz` (4,583,350 bytes) through Spark's `SplatMesh({ url })`.
- `public/henon-buddhabrot-4096.spz` (4,378,012 bytes) is **never fetched at runtime** — "henon" is only the unused default of the `variant` prop. It is dead weight in the repo and the deploy.
- The asset is produced by `tools/true_buddhabrot_splat.cpp`: 16 M sampled `c` parameters, up to 4,096 iterations, escape orbits accumulated into a **896³ sparse voxel grid**, importance-sampled down to **1,000,000 splats**, written as PLY, then converted to SPZ v3 by `@playcanvas/splat-transform`.
- 4.58 MB / 1 M splats ≈ 4.6 bytes per splat after SPZ's internal gzip.

### The key observation

Every splat in this cloud is redundant beyond two numbers:

| SPZ field | Our value | Real information |
|---|---|---|
| position (3 × 24-bit) | voxel center | voxel index (≤ 896³ < 2³²) |
| scales (3 × 8-bit) | identical constant (`log_sigma`) | none |
| rotation (24-bit) | identity for all | none |
| color (24-bit) | pure function of (y, depth, density) | none |
| alpha (8-bit) | pure function of density | none |

The only true payload is **sorted voxel index + density**. Everything else is derivable at load time with the exact formulas already in `true_buddhabrot_splat.cpp` (`normalized_density`, the warmth/luminance color ramp, the alpha clamp, the constant sigma).

## Options

### Option 1 — Fewer splats, no code change

Regenerate with `--max-splats 400000`–`500000`. The importance sampler (`weight = 0.0015 + 0.9985 · density^2.45`) already drops the dimmest filler first, so the visual cost at intro viewing distance is small; a slight `splatSize` tune bump compensates. Expected: **~1.9–2.3 MB**. Rotate performance *improves* (fewer splats to sort and rasterize).

- Cost: one regeneration run, an A/B look.
- Risk: none. Fully reversible.

### Option 2 — Compact custom format, attributes derived at load (recommended, combined with Option 1)

Replace SPZ with a purpose-built binary the C++ tool emits directly:

```
header: magic, version, resolution (u16), field bounds (f32×2),
        exposure (f32), sigma (f32), splat count (u32)
stream A: delta-encoded sorted voxel indices, varint          (~2 B/splat)
stream B: density, u8-quantized normalized density            (1 B/splat)
```

Streams stay separate (not interleaved) so gzip finds structure. The file ships pre-compressed as `.bin.gz` and is inflated in the browser with `DecompressionStream("gzip")` — no reliance on GitHub Pages content negotiation for binary types.

Load path: fetch → inflate → decode in a worker → apply the C++ color/alpha formulas → build a Spark `PackedSplats` → `new SplatMesh({ packedSplats })`. Loading progress keeps working via the fetch reader (content-length known).

Expected sizes:

| Splats | SPZ today | Custom format (gzipped) |
|---|---|---|
| 1,000,000 | 4.58 MB | ~2.0–2.5 MB |
| 450,000 | ~2.1 MB | **~0.9–1.2 MB** |

- Bonus synergy: the decode step leaves voxel positions and densities in JS hands, which the hover/region-highlight feature (separate spec) and future effects can reuse.
- Risk: must verify Spark 2.1 exposes a public path to construct `PackedSplats` programmatically (`pushSplat` or packed-array constructor). Verified as the *first* implementation task; if it turns out private, fall back to generating a minimal SPZ in the browser (SPZ is documented) or to Option 1 alone.

### Option 3 — Runtime generation on intro entry (possible, not recommended now)

A WGSL port of the C++ tool is feasible — the game already runs a 2D WebGPU Buddhabrot generator (`lib/buddhabrot/generator.ts`), and 16 M samples × 4,096 iterations fits a few seconds of GPU time. The blocker is the voxel grid: a dense u32 grid at the offline tool's 896³ needs **2.8 GB**; the practical ceiling is ~320³ (131 MB, desktop only) or 256³ (67 MB). Splat sigma scales with `field / resolution`, so the cloud comes out **2.8–3.5× blobbier** than the shipped asset. Matching current sharpness would need sparse GPU hashing — significant complexity. WebGPU-less browsers still need a shipped fallback, so the download never fully disappears; first visit also gains a generation wait (mitigable with IndexedDB caching, which `lib/buddhabrot/cache.ts` already provides for the 2D texture).

Verdict: real quality loss at feasible resolutions, highest complexity, and it doesn't even delete the asset. Revisit only if the budget must reach zero bytes. A separate idea worth keeping: a *deliberate* "watch the cloud condense" progressive mode as an aesthetic flourish, built on this machinery — out of scope here.

## Recommendation

1. Regenerate at ~450 k splats (Option 1) **and** switch to the compact format (Option 2). Net: 4.58 MB → ~1 MB, one asset, no runtime compute, rotate performance slightly better than today.
2. Keep `tools/true_buddhabrot_splat.cpp` as the single source of truth: it gains a `--compact-output` flag next to the PLY path, so SPZ can still be produced for debugging in external splat viewers.

**Decision (2026-08-22, user):** keep the legacy splats. `public/true-buddhabrot-4096.spz` stays byte-identical and remains loadable behind a persisted "Legacy splat" debug checkbox in the intro overlay, for live A/B against the compact cloud. `public/henon-buddhabrot-4096.spz` also stays on disk (runtime never fetches it). The earlier idea of deleting the henon asset is dropped.

## Error handling

- Fetch/decode failure: fall back to the existing SPZ URL if still deployed, else surface the current load-failure behavior (intro stays on progress bar; Play appears only on `onReady`). Decode is pure and unit-testable, so the risky surface is small.
- `DecompressionStream` is available in all Spark-capable browsers (Chrome 80+, Safari 16.4+, Firefox 113+); no polyfill needed.

## Testing

- Unit: varint/delta round-trip; decoder against a tiny fixture emitted by the C++ tool; color/alpha formula parity against a handful of values printed by the tool.
- Visual: A/B screenshot at intro camera pose — 1 M SPZ vs 450 k compact — reviewed by a human before the swap lands.
- Perf: confirm decode + PackedSplats build stays under ~150 ms on a mid laptop (worker keeps the main thread free regardless).

## Open questions

- Final splat count (400 k vs 500 k) — pick from the A/B.
- Whether to keep an SPZ export path in the shell script for external viewers (cheap, default yes).
