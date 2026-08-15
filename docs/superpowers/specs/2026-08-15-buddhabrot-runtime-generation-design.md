# Runtime Buddhabrot generation

Date: 2026-08-15

## Problem

The flashlight reveal draws `public/buddhabrot-density.png`, a 1024x1024 RGBA
texture (976 KB) produced offline by `scripts/generate-buddhabrot.py`. It looks
pixelated on high-DPI displays. Two independent causes:

1. **The flashlight buffer ignores `devicePixelRatio`.** In `resize()`,
   `gridCanvas` is sized `width * dpr` but `flashlightCanvas` is sized
   `Math.ceil(width)`. `drawFlashlight()` then blits that 1x buffer through a
   `dpr`-scaled context with `imageSmoothingEnabled = false`, so on a 2x display
   every flashlight pixel becomes a hard 2x2 block. This happens regardless of
   source texture quality.
2. **The source texture is too small for the area it covers.** The image is
   mapped across `BUDDHABROT_BOUNDS` (3.4 x 3.0 in the complex plane), which at
   the default view (`halfY = 0.8`) spans roughly 1.9x the viewport height, and
   far more once zoomed. Zoom reaches `MIN_VIEW_HALF_Y = 0.035`, about 23x
   tighter than default.

Fixing only one of these leaves the problem visible.

## Goals

- Generate a high-resolution Buddhabrot in the browser on first launch and cache
  it for later launches.
- Show the accumulation building on screen as the first-load experience. The
  accumulation *is* the loading screen; there is no second one, and no spinner.
- The build-up lasts at least 5 seconds so it reads as a deliberate opening
  moment rather than a stutter.
- Sharp at the default aiming zoom on high-DPI displays.

## Non-goals

- Sharpness at deep zoom. No fixed-size texture can cover a 23x zoom range;
  view-dependent regeneration is explicitly out of scope.
- Changing the visual style of the background itself. The generated image must
  read like the current one, only larger and cleaner. (The sampling change under
  "Render fixes" is a sharpness fix, not a restyle.)
- Server-side generation, or any network fetch beyond the existing static PNG.

## Decisions

| Question | Decision |
|---|---|
| Sharpness target | Default zoom. One generous cached texture. |
| First-load presentation | Full-screen accumulation that gates play, minimum 5 s. |
| Generation backend | WebGPU compute only. Shipped PNG is the fallback. |
| Resolution | 4096² desktop, 2048² on small touch devices. |

WebGPU-only was chosen over also writing a CPU worker fallback because a worker
is a second full implementation of the accumulator, serving users who are
already missing the game's primary visual (orbit trails also require WebGPU).
The existing PNG is a cheap, honest floor for that case.

## Architecture

New modules, plain TypeScript with no React or DOM dependencies except where
noted, so they are unit-testable under `node --test`:

| File | Responsibility |
|---|---|
| `lib/gpu.ts` | Acquire adapter and device once; shared by engine and generator |
| `lib/buddhabrot/shaders.ts` | WGSL for accumulate, histogram, colorize |
| `lib/buddhabrot/generator.ts` | Owns GPU buffers; `step(dt)` runs one chunk; exposes `progress` and the output texture |
| `lib/buddhabrot/normalize.ts` | Pure: histogram to percentile cut points |
| `lib/buddhabrot/pacing.ts` | Pure: `samplesForFrame(dt, total, minDurationMs)` |
| `lib/buddhabrot/cache.ts` | IndexedDB get/put of a PNG blob |
| `app/BuddhabrotIntro.tsx` | Full-screen overlay: WebGPU canvas plus DOM progress text |

`lib/` matches the existing top-level convention (`db/`, `worker/`, `build/`).
It avoids `app/`, where directories are route-adjacent, and avoids `build/`,
which `eslint.config.mjs` ignores globally. Imports use the existing `@/*`
alias.

### Device sharing

`createOrbitEngine` currently calls `adapter.requestDevice()` internally and
never exposes the device. Generation needs the same device. Lift acquisition
into `lib/gpu.ts` and pass the device into both consumers rather than requesting
a second one.

## Generation

Three compute passes per chunk.

**1. Accumulate.** One thread per seed, workgroup size 64. Uniformly sample `c`
within `BUDDHABROT_BOUNDS`, iterate `z = z² + c` to escape with a 320-iteration
cap, discard seeds with `escaped_at < 5`, then replay the orbit and `atomicAdd`
into a `u32` density buffer. Per-thread RNG seeded from `(threadId, chunkIndex)`
so successive chunks draw fresh samples. These parameters match
`generate-buddhabrot.py` exactly.

**2. Histogram.** 1024 bins of `log1p(density)` over non-empty pixels, via
atomics.

**3. Colorize.** Read back the 4 KB histogram, compute the 54th and 99.92nd
percentile cut points on the CPU, pass them back as uniforms, write RGBA8.

The colorize shader ports the Python normalization one-to-one: `log1p`,
normalize between the percentile cuts, raise to `1.68`, alpha ramp
`clip((contrast - 0.018) * 1.55, 0, 1)` with a hard zero below `contrast <
0.055`, and the same tint `(8 + c*235, 72 + c*183, 92 + c*143)`.

Histogram readback is asynchronous and the colorize pass uses the previous
chunk's cut points, avoiding a pipeline stall. The one-chunk lag is invisible.

Because the histogram is recomputed every chunk, exposure tracks live density:
early frames are sparse but correctly exposed noise, and structure condenses out
of it. The image never starts black and pops.

### Pacing

Per frame, `samplesThisFrame = total * dt / 5000`, clamped to a per-frame ceiling
so no single dispatch janks the frame. Sample budget is roughly 64M seeds at
4096² and 16M at 2048², well above the Python script's 1.2M, so the result is
cleaner as well as larger.

`dt` is clamped the same way the game loop clamps it (`Math.min(0.05, delta)`).
Without this, a backgrounded tab returns with a multi-second delta and dumps the
entire remaining budget into one dispatch.

The 5-second minimum is a floor, not a deadline. A slow GPU simply runs longer.
Generation is driven by `requestAnimationFrame`, so a backgrounded tab pauses
and resumes rather than racing ahead. Texture size is fixed and independent of
viewport size, so resizing mid-generation is harmless.

Under `prefers-reduced-motion: reduce` the 5-second floor is dropped: generation
runs at full speed (typically under a second) and the overlay dismisses as soon
as it completes. The point of the floor is spectacle, and spectacle is what that
preference opts out of.

### Memory

At 4096²: density buffer is 67 MB (`4096² x u32`), output texture 67 MB RGBA8.
Both sit under the default WebGPU limits (`maxStorageBufferBindingSize` 128 MiB,
`maxBufferSize` 256 MiB, `maxTextureDimension2D` 8192). The 2048² tier is 17 MB
each.

## Intro presentation

`BuddhabrotIntro.tsx` renders a full-screen overlay above both existing canvases:
a WebGPU canvas showing the colorized texture as it accumulates. On completion
the overlay fades out via CSS opacity and unmounts, and the stone becomes
grabbable.

Chrome over the image is deliberately minimal: the game title and a thin
progress line reusing the existing `.liveProgress` treatment from
`globals.css`. No percentage readout, no spinner, no status copy. The image
building is the feedback; anything more competes with it.

The intro cannot be skipped. It runs once per cache tier, and dismissing it
early would leave no texture to reveal.

The overlay mounts only after the client confirms both a cache miss and WebGPU
availability. Initial state renders nothing, so server-rendered HTML is
unchanged and the existing SSR test continues to pass.

## Cache

IndexedDB database `mandelbrot-skipping`, object store `textures`, key
`buddhabrot:v1:<size>`, value a PNG `Blob`. The version segment bumps whenever
shaders or tuning change, retiring stale images without a migration path. The
size segment means a device that changes tier regenerates once and retains both.

Write path: after the intro fades, render the final texture to an
`OffscreenCanvas`, then call `createImageBitmap(canvas)` for display and
`canvas.convertToBlob()` for storage. Note `transferToImageBitmap()` must not be
used here: it empties the canvas, losing the blob. A 4096² PNG encode takes
roughly 1-3 s and runs after play has already started, so it never blocks.

Every IndexedDB failure (private browsing, quota, blocked) is swallowed. Worst
case the texture is memory-only for the session and the next launch regenerates.

### Size tier

`(pointer: coarse)` and a short screen edge of 820 px or less selects 2048²,
otherwise 4096². A single tunable constant.

## Fallback chain

Evaluated in order at boot:

| Case | Behaviour |
|---|---|
| Cache hit | `createImageBitmap(blob)`, instant. No intro, no wait. |
| Miss, WebGPU available | Generate with intro, minimum 5 s, then cache. |
| No WebGPU | Load `public/buddhabrot-density.png` as today. No intro, no wait. |
| Generation throws | Fall back to the PNG. No intro. |

The player never sees an error state and is never blocked. `public/buddhabrot-density.png`
and `scripts/generate-buddhabrot.py` are both retained as the floor.

## Render fixes

The new texture is wasted without these three changes in the flashlight path:

1. Size `flashlightCanvas` to `width * dpr` and apply a matching `setTransform`
   on `flashlightContext`, mirroring `gridCanvas`. This is the actual retina
   defect.
2. Scale the mask blur to `blur(${14 * dpr}px)`. Canvas 2D filters operate in
   device pixels, so once the buffer is 2x, an unscaled 14 px blur would read
   half as soft and visibly change the cone edge.
3. Set `imageSmoothingEnabled = true` in `drawMappedBuddhabrot`. At default zoom
   a 4096² source is being downscaled, where nearest-neighbour sampling shimmers
   during panning. The `flashlightCanvas` blit becomes 1:1 after change 1, so
   smoothing there is unnecessary and stays off.

`buddhabrotImage: HTMLImageElement` becomes
`buddhabrotSource: ImageBitmap | HTMLImageElement | null`. `drawImage` accepts
both, so call sites are unaffected.

## Testing

Unit tests under `node --test`, matching the existing runner:

- `normalize.ts`: percentile derivation from a histogram. The most likely place
  for a subtle error, and pure, so it is tested directly.
- `pacing.ts`: chunks sum to the budget, total elapsed never falls below 5 s, no
  single frame exceeds the ceiling.
- `cache.ts`: hit, miss, and put-failure-is-swallowed, against a stub IndexedDB.

The existing `tests/rendered-html.test.mjs` continues to pass unchanged, plus one
new assertion that intro markup is absent from server-rendered HTML.

### Known gap

The WGSL shaders have no automated test. Shaders do not run under node.
Correctness there is verified by eye in the browser against the current PNG.

## Risks

- **Visual drift.** If the colorize port is not faithful, the background changes
  character rather than just sharpening. Mitigated by porting the Python
  normalization literally and comparing against the existing PNG.
- **First-load cost on mid-range GPUs.** The 5 s floor assumes the GPU clears
  64M seeds comfortably. If it cannot, the intro overruns. The pacing formula
  degrades gracefully (longer, not janky), but the budget constant may need
  tuning after real-device testing.
- **Cache size.** A 4096² PNG is expected in the 8-15 MB range. Well within
  typical IndexedDB quota, but quota failures are swallowed rather than
  surfaced, so a persistently failing write silently costs a regeneration every
  launch.
