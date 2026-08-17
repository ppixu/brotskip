# Native-pixel Pond and Throw Buffers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Size the GPU canvas to native pixels and accumulate loading/aiming into a pond-locked buffer and each throw into a separate 1px buffer, with the flashlight as a cone mask on the same Buddha, and with zoom removed.

**Architecture:** Keep one orbit engine and one source buffer in `app/MandelbrotSkipping.tsx`. Replace the 2048² view-following atlas with two canvas-sized ping-pong layers (pond world-locked to `TRAIL_BOUNDS`, throw locked to `mathBoundsForView` at release). The display shader composites `pond * pondGain * cone + throw * throwGain + live`. Pure helpers live in `lib/view-map.ts` and `lib/flashlight-probe.ts` so unit tests can lock the contracts without WebGPU.

**Tech Stack:** TypeScript, React 19, WebGPU / WGSL, `node --test` with native type stripping.

**Spec:** `docs/superpowers/specs/2026-08-17-native-pixel-pond-design.md`

## Global Constraints

- Two screen-sized GPU layers, nearest-sampled, 1px points. One orbit engine and one source buffer: pond and throw never iterate in the same frame.
- Framebuffer size is CSS size × `min(devicePixelRatio, 2)`. Recreate layer textures on that size.
- Pond bounds stay `TRAIL_BOUNDS`. Pond fade retention is 1 (pure accumulate). `clear()` must not wipe pond texels.
- Replay opening is the one path that clears the pond textures.
- Drop wheel and `+/-` zoom. Intro stays at `INTRO_VIEW_HALF_Y`; play stays at `VIEW_HALF_Y`. Pan stays.
- When the orbit engine is running, do not draw the cached Buddhabrot into the cone. Cached blit is GPU-fail fallback only.
- Composite `pond * pondGain * cone + throw * throwGain + live`. Intro: pondGain 1, cone 1, throwGain 0. Ready/flying/result: pondGain 0, throwGain 1. Aiming: pondGain 1, cone is the flashlight falloff, throwGain 0.
- Do not change point-list topology. Do not rebuild the cached texture pipeline. Dual-buffer VRAM caps beyond the dpr cap of 2 are out of scope.
- Work lands on `main`. Run `npm run test:unit` and `npm run lint` before every commit. Both must pass. Do not force-push. Do not skip hooks.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/view-map.ts` | `gpuBufferSize`; later retire `focusAtlasBounds` / `atlasNeedsRecenter` / `TRAIL_ATLAS_SIZE` | 1, 5 |
| `lib/flashlight-probe.ts` | `displayLayerGains`, `flashlightConeFalloff`; aiming uses intro atmosphere | 1, 2 |
| `tests/unit/view-map.test.ts` | Native buffer size; drop focus-atlas tests in cleanup | 1, 5 |
| `tests/unit/flashlight-probe.test.ts` | Layer gains, cone falloff, intro-for-aiming atmosphere | 1, 2 |
| `tests/unit/shaders.test.ts` | Engine, display, zoom-gone, flashlight contracts | 3, 4 |
| `app/MandelbrotSkipping.tsx` | Dual native-pixel layers, display shader, phase wiring | 3, 4 |

---

### Task 1: Native buffer size, layer gains, and cone falloff helpers

Independent of WebGPU. Locks the numbers the engine and aiming path will consume.

**Files:**
- Modify: `lib/view-map.ts`
- Modify: `lib/flashlight-probe.ts`
- Test: `tests/unit/view-map.test.ts`
- Test: `tests/unit/flashlight-probe.test.ts`

**Interfaces:**
- Consumes: existing `FLASHLIGHT_HALF_ANGLE`, `FlashlightCone`
- Produces:
  - `GPU_PIXEL_RATIO_CAP = 2`
  - `gpuBufferSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): { width: number; height: number; dpr: number }`
  - `DisplayLayerMode = "intro" | "play" | "aiming"`
  - `displayLayerGains(mode: DisplayLayerMode): { pondGain: number; throwGain: number; coneEnabled: boolean }`
  - `flashlightConeFalloff(x: number, y: number, cone: FlashlightCone, halfAngle?: number, edge?: number): number`

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/view-map.test.ts`:

```ts
import { GPU_PIXEL_RATIO_CAP, gpuBufferSize } from "../../lib/view-map.ts";

test("GPU buffers use CSS size times device pixels, capped at 2", () => {
  assert.equal(GPU_PIXEL_RATIO_CAP, 2);
  assert.deepEqual(gpuBufferSize(800, 600, 1), { width: 800, height: 600, dpr: 1 });
  assert.deepEqual(gpuBufferSize(800, 600, 2), { width: 1600, height: 1200, dpr: 2 });
  assert.deepEqual(gpuBufferSize(800, 600, 3), { width: 1600, height: 1200, dpr: 2 });
  assert.deepEqual(gpuBufferSize(0, 0, 2), { width: 1, height: 1, dpr: 2 });
});
```

Add to `tests/unit/flashlight-probe.test.ts` (keep the existing `cone` fixture):

```ts
import {
  displayLayerGains,
  flashlightConeFalloff,
} from "../../lib/flashlight-probe.ts";

test("display layer gains match intro, play, and aiming", () => {
  assert.deepEqual(displayLayerGains("intro"), { pondGain: 1, throwGain: 0, coneEnabled: false });
  assert.deepEqual(displayLayerGains("play"), { pondGain: 0, throwGain: 1, coneEnabled: false });
  assert.deepEqual(displayLayerGains("aiming"), { pondGain: 1, throwGain: 0, coneEnabled: true });
});

test("flashlight cone falloff is 1-ish on the aim ray and 0 outside the cone", () => {
  const onRay = flashlightConeFalloff(100, 80, cone);
  const outside = flashlightConeFalloff(10, 180, cone);
  const far = flashlightConeFalloff(100, -50, cone);
  assert.ok(onRay > 0.3, `on-ray falloff was ${onRay}`);
  assert.equal(outside, 0);
  assert.equal(far, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/unit/view-map.test.ts tests/unit/flashlight-probe.test.ts`

Expected: FAIL with `does not provide an export named 'gpuBufferSize'` (and the same for `displayLayerGains` / `flashlightConeFalloff`).

- [ ] **Step 3: Write minimal implementation**

In `lib/view-map.ts`, next to `TRAIL_ATLAS_SIZE`:

```ts
export const GPU_PIXEL_RATIO_CAP = 2;

export function gpuBufferSize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
  const dpr = Math.min(Math.max(devicePixelRatio, 1), GPU_PIXEL_RATIO_CAP);
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
  };
}
```

In `lib/flashlight-probe.ts`, after `FLASHLIGHT_ATMOSPHERE`:

```ts
export type DisplayLayerMode = "intro" | "play" | "aiming";

export function displayLayerGains(mode: DisplayLayerMode) {
  if (mode === "intro") return { pondGain: 1, throwGain: 0, coneEnabled: false };
  if (mode === "aiming") return { pondGain: 1, throwGain: 0, coneEnabled: true };
  return { pondGain: 0, throwGain: 1, coneEnabled: false };
}

export function flashlightConeFalloff(
  x: number,
  y: number,
  cone: FlashlightCone,
  halfAngle = FLASHLIGHT_HALF_ANGLE,
  edge = 0.04,
) {
  const dx = x - cone.apexX;
  const dy = y - cone.apexY;
  const distance = Math.hypot(dx, dy);
  if (distance > cone.range || distance <= 0) return 0;
  const along = (dx * cone.directionX + dy * cone.directionY) / distance;
  const cosine = Math.min(1, Math.max(-1, along));
  const halfCos = Math.cos(halfAngle);
  const edgeCos = Math.cos(Math.max(0, halfAngle - edge));
  const angular = smoothstep(halfCos, edgeCos, cosine);
  const t = Math.min(1, distance / Math.max(cone.range, 1e-5));
  const radial = mix(0.9, 0.4, smoothstep(0, 0.55, t)) * (1 - smoothstep(0.55, 1, t));
  return angular * radial;
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
```

The WGSL display cone in Task 3 must copy this formula (same `edge` default 0.04, same radial stops 0.9 / 0.4 / 1).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/view-map.ts lib/flashlight-probe.ts tests/unit/view-map.test.ts tests/unit/flashlight-probe.test.ts
git commit -m "$(cat <<'EOF'
Add native GPU buffer size, display-layer gains, and cone falloff helpers.

EOF
)"
```

---

### Task 2: Aiming uses the intro atmosphere, not the sparse flashlight recipe

Constants and types only. Engine wiring still comes in Task 4; this task makes the aiming recipe identical to loading so later spawn code cannot pick the cheap path.

**Files:**
- Modify: `lib/flashlight-probe.ts`
- Test: `tests/unit/flashlight-probe.test.ts`

**Interfaces:**
- Consumes: `INTRO_ATMOSPHERE`, `OrbitAtmosphere` from Task 1 file
- Produces: `OrbitAtmosphere` without `atlasFollowView`. `FLASHLIGHT_ATMOSPHERE` deleted. Aiming will import `INTRO_ATMOSPHERE`. `FLASHLIGHT_SOURCE_DOTS`, `FLASHLIGHT_MAX_DEPTH`, `FLASHLIGHT_SOURCE_CAP`, and `FLASHLIGHT_SPAWN_MS` deleted. Keep `FLASHLIGHT_HALF_ANGLE`, `FLASHLIGHT_EDGE_BLUR_PX`, `FLASHLIGHT_PLANNED_SKIPS`, `sampleRayInCone`, and `pointInFlashlightCone` (cone geometry and GPU-fail blur still need them).

- [ ] **Step 1: Write the failing tests**

Replace the atmosphere assertions in `tests/unit/flashlight-probe.test.ts` (`intro and flashlight atmospheres...`) with:

```ts
test("intro and play atmospheres drop flashlight-specific iteration, and aiming reuses intro", () => {
  assert.equal(PLAY_ATMOSPHERE.drawLines, true);
  assert.equal(PLAY_ATMOSPHERE.grayscale, false);
  assert.equal(PLAY_ATMOSPHERE.hiddenSteps, 0);
  assert.equal(INTRO_ATMOSPHERE.drawLines, false);
  assert.equal(INTRO_ATMOSPHERE.grayscale, true);
  assert.ok(PLAY_ATMOSPHERE.energy <= 0.012);
  assert.ok(PLAY_ATMOSPHERE.energy < INTRO_ATMOSPHERE.energy * 0.12);
  assert.ok((PLAY_ATMOSPHERE.atlasGain ?? 1) >= 0.8);
  assert.ok((INTRO_ATMOSPHERE.atlasGain ?? 1) >= 0.9);
  assert.equal("atlasFollowView" in PLAY_ATMOSPHERE, false);
  assert.equal("atlasFollowView" in INTRO_ATMOSPHERE, false);
  assert.ok(INTRO_ATMOSPHERE.energy >= 0.24);
  assert.ok((INTRO_ATMOSPHERE.liveGain ?? 1) <= 0.2);
  assert.ok((INTRO_ATMOSPHERE.contrast ?? 0.72) >= 1.1);
  assert.ok((PLAY_ATMOSPHERE.liveGain ?? 1) >= 0.9);
  assert.ok(INTRO_ATMOSPHERE.hiddenSteps <= 1);
});
```

Change the budget test from flashlight source caps to:

```ts
test("flashlight is a cone mask, not a cheaper iterator", () => {
  assert.ok(FLASHLIGHT_EDGE_BLUR_PX >= 24);
  assert.ok(FLASHLIGHT_HALF_ANGLE > 0);
});
```

Remove `FLASHLIGHT_ATMOSPHERE`, `FLASHLIGHT_MAX_DEPTH`, `FLASHLIGHT_SOURCE_CAP`, and `FLASHLIGHT_SOURCE_DOTS` from the test imports.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/flashlight-probe.test.ts`

Expected: FAIL on `assert.equal("atlasFollowView" in PLAY_ATMOSPHERE, false)` (still `true`).

- [ ] **Step 3: Write minimal implementation**

In `lib/flashlight-probe.ts`:

1. Delete these exports: `FLASHLIGHT_SOURCE_DOTS`, `FLASHLIGHT_MAX_DEPTH`, `FLASHLIGHT_SOURCE_CAP`, `FLASHLIGHT_SPAWN_MS`, `FLASHLIGHT_ATMOSPHERE`.
2. Remove `atlasFollowView` from `OrbitAtmosphere` and from `PLAY_ATMOSPHERE` / `INTRO_ATMOSPHERE`.

Leave `atlasGain` on the atmospheres; display pond/throw gains are phase uniforms, but intro contrast still uses the existing energy/liveGain/contrast fields.

- [ ] **Step 4: Run tests**

Run: `npm run test:unit`

Expected: `flashlight-probe` tests PASS. `shaders.test.ts` may FAIL because `app/MandelbrotSkipping.tsx` still imports the deleted names — that is Task 3/4. If unit tests abort on compile of MandelbrotSkipping, make the smallest compile fix: keep the deleted names as unused local constants in `MandelbrotSkipping.tsx` **only if** tests import the app file and crash. Prefer updating the MandelbrotSkipping imports to `INTRO_ATMOSPHERE` for aiming in Task 4; for this task, if `shaders.test.ts` reads the app source and still matches `FLASHLIGHT_ATMOSPHERE`, leave that test failing until Task 4.

If `npm run test:unit` fails only in `flashlight-probe` after the type change because other tests import `FLASHLIGHT_ATMOSPHERE` from the lib, update those imports. `shaders.test.ts` reads the app file as text and will not fail this task's typecheck.

- [ ] **Step 5: Commit**

```bash
git add lib/flashlight-probe.ts tests/unit/flashlight-probe.test.ts
git commit -m "$(cat <<'EOF'
Drop the sparse flashlight iterator so aiming can reuse the intro atmosphere.

EOF
)"
```

If MandelbrotSkipping no longer typechecks because it imported deleted symbols, include a compile-only import fix in this commit (switch those imports to `INTRO_ATMOSPHERE` / drop unused flashlight spawn constants) but do not change spawn or zoom behavior yet.

---

### Task 3: Dual native-pixel pond and throw layers in the orbit engine

This is the GPU change. Loading should already look sharp after this task even if aiming/zoom wiring is still old.

**Files:**
- Modify: `app/MandelbrotSkipping.tsx` (`OrbitEngine` type, `displayShader`, `createOrbitEngine`)
- Test: `tests/unit/shaders.test.ts`

**Interfaces:**
- Consumes: `gpuBufferSize` from Task 1; `displayLayerGains`, `flashlightConeFalloff` formula from Tasks 1–2; `mathBoundsForView`, `TRAIL_BOUNDS`
- Produces `OrbitEngine` methods:
  - `setLayer(layer: "pond" | "throw"): void` — next compute/splat goes to that layer only
  - `setDisplay(display: { pondGain: number; throwGain: number; cone: FlashlightCone | null; cssWidth: number; cssHeight: number }): void`
  - `beginThrow(view: ViewTransform, cssWidth: number, cssHeight: number, rotateRight: boolean): void` — `throwBounds = mathBoundsForView(...)`, clear throw textures, zero sources, `setLayer("throw")`
  - `clearPond(): void` — clear pond textures only
  - `clear(): void` — zero sources and clear throw textures; **must not** clear pond
  - existing `spawn`, `spawnAppend`, `setView`, `setTuning`, `setAtmosphere`, `freeze`, `setSuspended`, `destroy`

- [ ] **Step 1: Write the failing tests**

Replace the tests `"play follows a view-local atlas..."` and `"orbit trails accumulate..."` / `"loading Buddhabrot is vertical..."` assertions that mention `TRAIL_ATLAS_SIZE`, `atlasFollowView`, `atlasNeedsRecenter`, `focusAtlasBounds`, `MIN_VIEW_HALF_Y`, and `atlasGain` display index with:

```ts
test("orbit trails accumulate in native-pixel pond and throw layers", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /gpuBufferSize\(/);
  assert.match(source, /magFilter: "nearest"/);
  assert.match(source, /minFilter: "nearest"/);
  assert.match(source, /setLayer/);
  assert.match(source, /beginThrow/);
  assert.match(source, /clearPond/);
  assert.match(source, /pondGain/);
  assert.match(source, /throwGain/);
  assert.match(source, /pond \* pondGain \* cone/);
  assert.doesNotMatch(source, /atlasFollowView/);
  assert.doesNotMatch(source, /atlasNeedsRecenter/);
  assert.doesNotMatch(source, /focusAtlasBounds/);
  assert.doesNotMatch(source, /TRAIL_ATLAS_SIZE/);
  assert.doesNotMatch(source, /const MIN_VIEW_HALF_Y/);
  assert.match(source, /reprojectScreenPoint/);
  assert.match(source, /zoomPixelScale/);
  assert.doesNotMatch(source, /cameraPausedUntil/);
  assert.match(source, /incomingLength <= 0\.12 && length\(z - previousZ\) <= 0\.12/);
});

test("loading Buddhabrot is vertical, high-res, and pond-led instead of sparkly live dust", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /const DEFAULT_TUNING: Tuning = \{[\s\S]*?rotateRight: true/);
  assert.match(source, /const POINT_BUDGET = 400_000/);
  assert.match(source, /const INTRO_SOURCE_CAP = 4096/);
  assert.match(source, /mandelbrot-skipping:tuning:v4/);
  assert.match(source, /displayView\[6\] = liveGain/);
  assert.match(source, /displayView\[7\] = contrast/);
  assert.match(source, /pow\(clamp\(mapped, vec3f\(0\.0\), vec3f\(1\.0\)\), vec3f\(contrast\)\) \* pondGain \* cone/);
  assert.match(source, /liveMapped[\s\S]*?\* liveGain/);
  assert.match(source, /pointEnergy = atmosphere\.energy/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/unit/shaders.test.ts`

Expected: FAIL — `gpuBufferSize(` / `magFilter: "nearest"` not found.

- [ ] **Step 3: Write the engine implementation**

**3a. Expand `OrbitEngine` and imports**

In `app/MandelbrotSkipping.tsx` imports, add `gpuBufferSize` from `@/lib/view-map` and `displayLayerGains`, `type FlashlightCone` from `@/lib/flashlight-probe`. Remove `TRAIL_ATLAS_SIZE`, `atlasNeedsRecenter`, `focusAtlasBounds`. Keep `mathBoundsForView`, `TRAIL_BOUNDS`, `zoomPixelScale`, `reprojectScreenPoint`.

Replace the `OrbitEngine` type with:

```ts
type OrbitEngine = {
  spawn: (points: Array<{ x: number; y: number }>, skipIndex: number, cap?: number) => void;
  spawnAppend: (points: Array<{ x: number; y: number }>, skipIndex: number, cap?: number) => number;
  setView: (view: ViewTransform) => void;
  setTuning: (tuning: Tuning) => void;
  setAtmosphere: (atmosphere: OrbitAtmosphere) => void;
  setLayer: (layer: "pond" | "throw") => void;
  setDisplay: (display: {
    pondGain: number;
    throwGain: number;
    cone: FlashlightCone | null;
    cssWidth: number;
    cssHeight: number;
  }) => void;
  beginThrow: (view: ViewTransform, cssWidth: number, cssHeight: number, rotateRight: boolean) => void;
  clearPond: () => void;
  clear: () => void;
  freeze: () => void;
  setSuspended: (suspended: boolean) => void;
  destroy: () => void;
};
```

**3b. Replace `displayShader` `DisplayView` and `displayFs`**

`displayViewBuffer` size becomes **128** bytes (32 floats). Sampler is created as `{ magFilter: "nearest", minFilter: "nearest" }`.

```wgsl
struct DisplayView {
  center: vec2f,
  viewHalf: vec2f,
  rotateRight: f32,
  pad: f32,
  liveGain: f32,
  contrast: f32,
  pondBounds: vec4f,
  throwBounds: vec4f,
  pondGain: f32,
  throwGain: f32,
  coneEnabled: f32,
  coneHalfAngle: f32,
  coneApex: vec2f,
  coneDirection: vec2f,
  coneRange: f32,
  coneEdge: f32,
  viewport: vec2f,
}
```

CPU write order for the 32-float `displayView` array (must match the struct; `vec4f` fields are 16-byte aligned):

```
[0]=centerX [1]=centerY [2]=viewHalfX [3]=viewHalfY
[4]=rotateRight [5]=lineGain (drawLines ? 1 : 0) [6]=liveGain [7]=contrast
[8..11]=pondBounds xMin xMax yMin yMax
[12..15]=throwBounds xMin xMax yMin yMax
[16]=pondGain [17]=throwGain [18]=coneEnabled [19]=coneHalfAngle
[20]=coneApexX [21]=coneApexY [22]=coneDirectionX [23]=coneDirectionY
[24]=coneRange [25]=coneEdge [26]=cssWidth [27]=cssHeight
```

Bindings: `0 pondTexture`, `1 throwTexture`, `2 throwLineTexture`, `3 liveTexture`, `4 liveLineTexture`, `5 sampler`, `6 displayViewBuffer`. Update `displayPipeline` bind group accordingly. Pond has **no** line texture.

Inside `displayFs`, sample pond with `pondBounds` (same atlas UV math as today), throw with `throwBounds`. Cone:

```wgsl
fn coneMask(uv: vec2f, display: DisplayView) -> f32 {
  if (display.coneEnabled < 0.5) { return 1.0; }
  let px = uv * display.viewport;
  let delta = px - display.coneApex;
  let distance = length(delta);
  if (distance <= 0.0 || distance > display.coneRange) { return 0.0; }
  let along = dot(delta / distance, display.coneDirection);
  let halfCos = cos(display.coneHalfAngle);
  let edgeCos = cos(max(display.coneHalfAngle - display.coneEdge, 0.0));
  let angular = smoothstep(halfCos, edgeCos, along);
  let t = clamp(distance / max(display.coneRange, 1e-5), 0.0, 1.0);
  let radial = mix(0.9, 0.4, smoothstep(0.0, 0.55, t)) * (1.0 - smoothstep(0.55, 1.0, t));
  return angular * radial;
}
```

Tone-map pond and throw the same way today's atlas is tone-mapped (`raw * 3.6`, `raw / (1 + raw)`, `pow(..., contrast)`). Final color:

```wgsl
let cone = coneMask(in.uv, display);
let pond = glow * display.pondGain * cone;
let thrown = (throwGlow + throwLines * lineGain) * display.throwGain;
return vec4f(pond + thrown + live + liveLines, 1.0);
```

Include the exact substring `pond * pondGain * cone` in a WGSL comment above the return if the expression is split across locals, so the unit test matches.

**3c. Replace atlas textures with pond + throw**

Delete `makeAtlas`, `atlasTextures`, `atlasLineTextures`, `atlasFollowView`, `atlasBounds` as the single window, `lockWorldAtlas`, `adoptFocusAtlas`, `maybeRecenterAtlas`.

Engine state:

```ts
let layer: "pond" | "throw" = "pond";
let pondBounds = { ...TRAIL_BOUNDS };
let throwBounds = { ...TRAIL_BOUNDS };
let pondTextures: any[] = [];      // 2 x rgba16float, canvas size
let throwTextures: any[] = [];     // 2 x rgba16float, canvas size
let throwLineTextures: any[] = []; // 2 x rgba8unorm, canvas size
let pondIndex = 0;
let throwIndex = 0;
let pondGain = 1;
let throwGain = 0;
let cone: FlashlightCone | null = null;
let cssWidth = 1;
let cssHeight = 1;
```

`makeScreen(format)` already exists — use it for pond, throw, throw lines, and live.

`resize()`:

```ts
function resize() {
  const rect = canvas.getBoundingClientRect();
  const buffer = gpuBufferSize(rect.width, rect.height, globalThis.devicePixelRatio || 1);
  cssWidth = Math.max(1, rect.width);
  cssHeight = Math.max(1, rect.height);
  if (pondTextures.length && buffer.width === width && buffer.height === height) return;
  width = buffer.width;
  height = buffer.height;
  canvas.width = width;
  canvas.height = height;
  for (const texture of [...pondTextures, ...throwTextures, ...throwLineTextures, liveTexture, liveLineTexture]) {
    texture?.destroy();
  }
  pondTextures = [0, 1].map(() => makeScreen("rgba16float"));
  throwTextures = [0, 1].map(() => makeScreen("rgba16float"));
  throwLineTextures = [0, 1].map(() => makeScreen("rgba8unorm"));
  liveTexture = makeScreen("rgba16float");
  liveLineTexture = makeScreen("rgba8unorm");
  // rebuild fade binds for pond, throw, throw-lines; display binds
  const encoder = device.createCommandEncoder({ label: "orbit-resize" });
  clearTextures(encoder, pondTextures);
  clearTextures(encoder, throwTextures);
  clearTextures(encoder, throwLineTextures);
  clearTextures(encoder, [liveTexture, liveLineTexture]);
  device.queue.submit([encoder.finish()]);
  pondIndex = 0;
  throwIndex = 0;
}
```

Resize wiping pond is accepted (window size change). Fade retention for pond and throw **points** stays `1`. Throw **lines** still use `lineFadeRetention(dt, linePersist)`.

**3d. `writeParams` and `draw`**

`writeParams(buffer, atlasMode)` keeps uploading `params.bounds` from the **active layer**: pond → `pondBounds`, throw → `throwBounds`. Viewport floats stay native `width`/`height` so 1px points match the backing store.

`draw()`:

1. Compute into the shared vertex buffer as today.
2. Fade + splat **only** the active layer (pond or throw). Do not ping-pong the idle layer.
3. If `layer === "throw"` and `drawLines`, fade + splat throw line textures.
4. Live points/lines still draw to screen-sized live textures as today.
5. Display samples `pondTextures[pondIndex]`, `throwTextures[throwIndex]`, `throwLineTextures[throwIndex]`, live, live lines.
6. After a pond splat, `pondIndex = 1 - pondIndex`. After a throw splat, `throwIndex = 1 - throwIndex`.

**3e. Engine methods**

```ts
setLayer(next) { layer = next; },
setDisplay(next) {
  pondGain = next.pondGain;
  throwGain = next.throwGain;
  cone = next.cone;
  cssWidth = next.cssWidth;
  cssHeight = next.cssHeight;
},
beginThrow(nextView, nextCssWidth, nextCssHeight, nextRotateRight) {
  view = { ...nextView };
  throwBounds = mathBoundsForView(nextView, nextCssWidth, nextCssHeight, nextRotateRight);
  layer = "throw";
  this.clear(); // sources + throw textures only
},
clearPond() {
  if (!pondTextures.length) return;
  const encoder = device.createCommandEncoder({ label: "orbit-clear-pond" });
  clearTextures(encoder, pondTextures);
  device.queue.submit([encoder.finish()]);
},
clear() {
  paused = false;
  sourceCount = 0;
  nextSource = 0;
  device.queue.writeBuffer(stateBuffer, 0, new Uint8Array(MAX_SOURCES * 48));
  if (!throwTextures.length) return;
  const encoder = device.createCommandEncoder({ label: "orbit-clear-throw" });
  clearTextures(encoder, throwTextures);
  clearTextures(encoder, throwLineTextures);
  clearTextures(encoder, [liveTexture, liveLineTexture].filter(Boolean));
  device.queue.submit([encoder.finish()]);
},
```

`setAtmosphere` no longer reads `atlasFollowView`. `setView` only stores the view (no recenter). `destroy` destroys pond, throw, throw-line, and live textures.

Default display on engine create: `displayLayerGains("intro")`, `layer = "pond"`, `pondBounds = { ...TRAIL_BOUNDS }`.

When writing cone uniforms: if `cone` is null or `coneEnabled` is false, write `coneEnabled = 0` and dummy apex/direction. If present, write CSS-pixel apex, direction, range, `coneEdge = 0.04`, `coneHalfAngle = FLASHLIGHT_HALF_ANGLE` unless the cone object is enough. Import `FLASHLIGHT_HALF_ANGLE` for the uniform default.

- [ ] **Step 4: Run tests**

Run: `npm run test:unit && npm run lint`

Expected: the new shaders tests PASS. Remaining flashlight/zoom tests in `shaders.test.ts` may still FAIL until Task 4 — if they do, only Task 3's new tests plus Task 1–2 tests must pass. If the whole `test:unit` script fails on old flashlight assertions, update those assertions in Task 4 in the same sitting only if you also implement Task 4; otherwise keep Task 3's commit green by **not** deleting `spawnFlashlightPoints` yet (Task 4 does that). For this task, it is OK to leave `spawnFlashlightPoints` in the file so existing flashlight tests still pass.

- [ ] **Step 5: Commit**

```bash
git add app/MandelbrotSkipping.tsx tests/unit/shaders.test.ts
git commit -m "$(cat <<'EOF'
Accumulate orbits in native-pixel pond and throw layers instead of a 2048 atlas.

EOF
)"
```

---

### Task 4: Drop zoom, aim through the live pond cone, keep pond across Play

Wires phases onto the engine from Task 3.

**Files:**
- Modify: `app/MandelbrotSkipping.tsx` (game loop: zoom, flashlight, spawn, clear, opening)
- Test: `tests/unit/shaders.test.ts`

**Interfaces:**
- Consumes: `OrbitEngine.setLayer`, `setDisplay`, `beginThrow`, `clearPond`, `clear`; `displayLayerGains`; `INTRO_ATMOSPHERE`; `spawnIntroBackgroundOrbits`
- Produces: no zoom; aiming iterates the pond with the intro recipe; Play hides pond; replay opening clears pond; GPU-fail path still blits the cached Buddha

- [ ] **Step 1: Write the failing tests**

Replace `"flashlight shows a dim cached Buddhabrot..."` with:

```ts
test("flashlight is a GPU cone on the live pond; cached blit is GPU-fail only", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /drawMappedBuddhabrot/);
  assert.match(source, /readCachedTexture/);
  assert.match(source, /FLASHLIGHT_EDGE_BLUR_PX/);
  assert.match(source, /createConicGradient/);
  assert.match(source, /spawnIntroBackgroundOrbits/);
  assert.match(source, /displayLayerGains\("aiming"\)/);
  assert.match(source, /displayLayerGains\("play"\)/);
  assert.match(source, /displayLayerGains\("intro"\)/);
  assert.match(source, /setLayer\("pond"\)/);
  assert.match(source, /beginThrow\(/);
  assert.match(source, /clearPond\(/);
  assert.doesNotMatch(source, /spawnFlashlightPoints/);
  assert.doesNotMatch(source, /FLASHLIGHT_ATMOSPHERE/);
  assert.doesNotMatch(source, /FLASHLIGHT_SOURCE_CAP/);
  assert.doesNotMatch(source, /function zoomAt/);
  assert.doesNotMatch(source, /addEventListener\("wheel"/);
  assert.doesNotMatch(source, /event\.key === "\+"/);
  assert.doesNotMatch(source, /spawnFlashlightSkips/);
  assert.doesNotMatch(source, /traceFlashlightCone\(ctx, geometry\);\s*ctx\.stroke\(\)/);
  assert.doesNotMatch(source, /rgba\(224, 244, 255/);
});
```

Keep the opening-throws test as-is except it may still mention `FLASHLIGHT_ATMOSPHERE` — remove that match; keep `INTRO_ATMOSPHERE` and `setAtmosphere`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/shaders.test.ts`

Expected: FAIL on `spawnFlashlightPoints` still present / `function zoomAt` still present.

- [ ] **Step 3: Wire the game loop**

**Drop zoom**

- Delete `MIN_VIEW_HALF_Y`, `MAX_VIEW_HALF_Y`, `zoomAt`, `onWheel`, and the `+/-` / `=` / `_` branches in `onKeyDown`.
- Remove the `wheel` listener add/remove.
- Keep pan (`pointerMode === "pan"` + `applyView`). Keep `reprojectScreenPoint` / `zoomPixelScale` for throw physics (`pondScale()`).

**Display uniforms follow phase**

Add a helper next to `flashlightGeometry`:

```ts
function syncOrbitDisplay() {
  const engine = engineRef.current;
  if (!engine) return;
  const mode = introActiveRef.current ? "intro" : phase === "aiming" ? "aiming" : "play";
  const gains = displayLayerGains(mode);
  engine.setDisplay({
    ...gains,
    cone: gains.coneEnabled ? flashlightGeometry() : null,
    cssWidth: width,
    cssHeight: height,
  });
}
```

Call `syncOrbitDisplay()` at the start of `render()` (cone must track the pull every frame).

**Opening / Play / replay**

- After engine create, if intro: `setLayer("pond")`, `setAtmosphere(INTRO_ATMOSPHERE)`, display intro gains. Else play gains, layer `"throw"`.
- `finishOpening`: `setAtmosphere(PLAY_ATMOSPHERE)`, `setLayer("throw")`, display play gains, `applyView` to play pond, `restartRef` (which `clear()`s throw+sources, **not** pond). Do **not** call `clearPond`.
- `replayOpening`: `clearPond()`, `clear()`, `setLayer("pond")`, `setAtmosphere(INTRO_ATMOSPHERE)`, intro view, `restartRef`.

**Aiming**

- `onPointerDown` aim branch: `setLayer("pond")`, `setAtmosphere(INTRO_ATMOSPHERE)`, `setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH })`. Do **not** clear the pond. Do **not** call `spawnFlashlightPoints`.
- Delete `spawnFlashlightPoints` and its call from `loop`.
- Change `spawnIntroBackgroundOrbits` guard from `if (!introActiveRef.current || introFadingRef.current) return;` to:

```ts
const aiming = phase === "aiming" && !introActiveRef.current;
if ((!introActiveRef.current && !aiming) || introFadingRef.current) return;
```

Keep `introNebulaSeed`, `spawnAppend`, `INTRO_MAX_DEPTH`, `INTRO_SOURCE_CAP`, `INTRO_ATMOSPHERE`, `INTRO_BACKGROUND_SPAWN_MS`, `INTRO_NEBULA_SEEDS_PER_WAVE`.

**Throw**

- `launchRock` when not intro: `beginThrow(viewRef.current, width, height, tuningRef.current.rotateRight)`, then `setTuning(tuningRef.current)`, `setAtmosphere(PLAY_ATMOSPHERE)`, `setLayer("throw")` (beginThrow already sets throw). Remove the extra `clear()` before that — `beginThrow` clears throw+sources.
- Cancel-aim / short-pull abort: `clear()` (throw+sources), `setAtmosphere(PLAY_ATMOSPHERE)`, `setLayer("throw")`. Pond stays.

**Flashlight overlay**

In `drawFlashlight`, wrap the cached blit:

```ts
if (!engineRef.current && buddhabrotSource && flashlightContext) {
  // existing drawMappedBuddhabrot + conic/radial mask
}
```

When the engine exists, the 2D canvas draws no Buddha; the GPU cone is the picture. Keep `createConicGradient` in the fallback block so the GPU-fail path still has a soft edge (`FLASHLIGHT_EDGE_BLUR_PX`).

- [ ] **Step 4: Run tests**

Run: `npm run test:unit && npm run lint`

Expected: PASS

Manual check after deploy: loading Buddha is sharp at display resolution; Play hides it without wiping; aiming shows that same Buddha in the cone and keeps filling; a throw paints a sharp colored orbit; wheel does nothing.

- [ ] **Step 5: Commit**

```bash
git add app/MandelbrotSkipping.tsx tests/unit/shaders.test.ts
git commit -m "$(cat <<'EOF'
Drop zoom and aim through a live pond cone, keeping the loading Buddha across Play.

EOF
)"
```

---

### Task 5: Retire the view-following atlas helpers

**Files:**
- Modify: `lib/view-map.ts`
- Test: `tests/unit/view-map.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `focusAtlasBounds`, `atlasNeedsRecenter`, `FOCUS_ATLAS_MARGIN`, `ATLAS_RECENTER_TEXEL_PX`, and `TRAIL_ATLAS_SIZE` are gone. `TRAIL_BOUNDS`, `mathBoundsForView`, `complexToAtlasUv`, `gpuBufferSize` stay.

- [ ] **Step 1: Write the failing tests**

Delete these tests from `tests/unit/view-map.test.ts`:

- `"the trail atlas is 2048 so hops fill shapes instead of dust"`
- `"a focus atlas covers about twice the current view..."`
- `"a focus atlas recenters after a deep zoom..."`

Remove `TRAIL_ATLAS_SIZE`, `atlasNeedsRecenter`, `focusAtlasBounds` from imports.

Add:

```ts
test("view-map no longer exports a fixed atlas size or a view-following window", () => {
  const source = readFileSync(new URL("../../lib/view-map.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /TRAIL_ATLAS_SIZE/);
  assert.doesNotMatch(source, /focusAtlasBounds/);
  assert.doesNotMatch(source, /atlasNeedsRecenter/);
});
```

Add `import { readFileSync } from "node:fs";` at the top of that test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/view-map.test.ts`

Expected: FAIL — `TRAIL_ATLAS_SIZE` still in the file.

- [ ] **Step 3: Delete the dead API**

From `lib/view-map.ts` remove `TRAIL_ATLAS_SIZE`, `FOCUS_ATLAS_MARGIN`, `ATLAS_RECENTER_TEXEL_PX`, `focusAtlasBounds`, and `atlasNeedsRecenter`. Keep `mathBoundsForView` and `TRAIL_BOUNDS`.

Grep the repo for `TRAIL_ATLAS_SIZE`, `focusAtlasBounds`, `atlasNeedsRecenter`, `atlasFollowView`, `FLASHLIGHT_ATMOSPHERE`. They must not remain outside superseded spec docs.

- [ ] **Step 4: Run tests**

Run: `npm run test:unit && npm run lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/view-map.ts tests/unit/view-map.test.ts
git commit -m "$(cat <<'EOF'
Remove the view-following atlas helpers now that pond and throw are native-pixel.

EOF
)"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Framebuffer CSS × min(dpr, 2); nearest sampling; 1px points | 1, 3 |
| Pond canvas-sized, `TRAIL_BOUNDS`, fade retention 1 | 3 |
| Loading: intro seeds, spawnAppend, INTRO_MAX_DEPTH, INTRO_SOURCE_CAP, intro atmosphere | 2, 4 |
| Play: keep pond texels; `clear()` does not wipe pond; pond gain 0 | 3, 4 |
| Aiming: splat pond, cone via display uniforms, resume intro spawn | 2, 3, 4 |
| Replay opening clears pond | 4 |
| Throw layer locked with `mathBoundsForView`; clear throw on each shot | 3, 4 |
| Drop wheel and +/- zoom; intro/play halfY unchanged; pan stays | 4 |
| Retire `atlasFollowView`, `focusAtlasBounds`, recenter-on-zoom | 2, 3, 5 |
| Cached Buddha is GPU-fail fallback only | 4 |
| Composite formula intro/play/aiming | 1, 3, 4 |
| Non-goals (clipmaps, deep zoom, point-list topology, cached pipeline rebuild) | not implemented |

**Placeholder scan:** none. **Type names:** `setLayer`, `setDisplay`, `beginThrow`, `clearPond`, `displayLayerGains`, `gpuBufferSize`, `flashlightConeFalloff` are consistent across tasks.
