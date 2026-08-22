# Intro Splat Hover Regions — Design

**Goal:** Make named areas of the intro's 3D Buddhabrot cloud respond to the pointer — hover (or tap) highlights the region inside the splat cloud and shows a short caption — and let the intro highlight regions on its own while idle.

**Status:** Design for review. Implementation plan follows approval.

## Current state

- `app/BuddhabrotCloudCanvas.tsx` renders the cloud with Spark (`SplatMesh` + `SparkRenderer`), orbit-drag camera (yaw/pitch/distance around a target), slow auto-rotate, ripples anchored to random visible splats, and comets along real escape orbits.
- A `dyno` object modifier already exists (`splatSizeModifier`) with a per-frame-updated `dynoFloat` uniform — the exact pattern region highlighting needs.
- Splat space: `x = Im(z)`, `y = −(Re(z) + 0.5)`, `z = Im(c)` over the ±2.35 field (`lib/splat-orbit.ts`, `tools/true_buddhabrot_splat.cpp`).
- The intro papers already name Buddhabrot anatomy in italics: *tika* (forehead mark), *ushnisha* (crown). Region names should reuse this vocabulary.

## Design

### Region model — `lib/splat-regions.ts` (new, pure, unit-tested)

```ts
export type SplatRegion = {
  id: string;            // "ushnisha", "tika", "head", "shoulders", "body", "spire"
  name: string;          // display name
  blurb: string;         // one sentence for the caption card
  center: [number, number, number];  // splat space
  radii: [number, number, number];   // axis-aligned ellipsoid radii
  link?: string;         // optional "read more" URL
};

export function pickRegion(
  origin: Vec3, direction: Vec3, regions: readonly SplatRegion[],
): { region: SplatRegion; distance: number } | null;
```

`pickRegion` is a ray/ellipsoid intersection (scale the ray into the unit-sphere frame of each ellipsoid, solve the quadratic, return the nearest hit). Pure math, no three.js dependency, fully unit-testable.

Initial region list (six): **Ushnisha** (crown), **Tika** (forehead mark), **Head** (escapes near the period-2 disk), **Shoulders**, **Body / lotus**, **Spire** (the needle toward Re(c) = −2). Blurbs are one sentence each, in the intro papers' register, e.g. *"The bright crown — orbits that linger longest before escaping stack their final hops here."*

Region coordinates are **calibrated, not guessed**: a dev-only mode (see Tooling) logs splat-space hit points, and the constants get authored from those logs.

### Hit testing — in `BuddhabrotCloudCanvas`

- On `pointermove` while not dragging: unproject the pointer through the camera (`THREE.Raycaster` for ray construction only), call `pickRegion`, store the result in a ref (for the render loop) and React state (for the caption).
- Drag vs hover: pointer capture already distinguishes them — hover logic runs only when `dragging` is false. A click that moved less than ~4 px acts as a tap: on touch devices tap toggles the region, tapping empty space clears it.
- Hover is disabled while `fading` (the align-to-play transition) and clears any active highlight.
- Cursor switches to `pointer` while over a region.

### Highlight rendering — extend the existing dyno modifier

Add three uniforms next to `splatSize`: `regionCenter` (vec3), `regionInvRadii` (vec3), `regionStrength` (float, eased 0→1 over ~200 ms in the render loop, matching how `splatSize.value` is already written per frame).

Per splat, in the modifier: `d = length((center − regionCenter) * regionInvRadii)`, `inside = smoothstep(1.1, 0.75, d)`, then

- inside: color × (1 + 1.2 · strength · inside) — an additive-feeling glow;
- outside: color × (1 − 0.18 · strength) — a gentle dim so the region reads without a hard edge.

No scale or position changes, so nothing disturbs Spark's sorting behavior beyond what `splatSize` already does.

### Caption card — in `BuddhabrotIntro`

A small paper-styled card (`introRegionCard`) in the cloud's lower-left: region name, one-sentence blurb, optional ↗ link, `aria-live="polite"`. Fades in/out ~200 ms. `BuddhabrotCloudCanvas` gains an `onRegionChange?: (region: SplatRegion | null) => void` prop; the intro owns the card so the canvas stays presentation-free.

### Idle tour — "highlight certain areas" without a pointer

After ~9 s with no pointer interaction (and not `reduceMotion`, not `fading`): cycle through the regions every ~6 s — same highlight uniforms, same caption card, plus one ripple spawned at the region center to draw the eye. Any pointer interaction cancels the tour and restarts the idle timer. This also serves touch users who never hover.

### Tooling — region calibration (dev only)

Behind a `?regions=1` query flag: clicking the cloud raycasts against `splat.packedSplats` samples along the pointer ray (reusing the `pickVisibleSplat` sampling approach, filtered to opacity ≥ 0.12) and logs the splat-space hit point plus current camera pose to the console. Region constants in `lib/splat-regions.ts` get authored from these logs. The flag also draws wireframe ellipsoids (`THREE.SphereGeometry` scaled by radii) for visual confirmation. Ships in the bundle but inert without the flag.

## Error handling

- No regions hit → `pickRegion` returns null → highlight eases out, caption fades; no failure modes beyond that.
- If the splat asset fails to load the canvas never reports ready and hover simply never engages (state can't be reached).

## Testing

- Unit (`tests/unit/splat-regions.test.ts`): ray hits centered ellipsoid; ray misses; nearest-of-two ordering; ray origin inside an ellipsoid still reports the hit; degenerate radii guarded.
- Manual: hover each region on desktop (highlight + caption + cursor), tap-toggle on touch, drag still orbits without flicker, idle tour cycles and cancels on interaction, `prefers-reduced-motion` disables the tour, fading clears everything.
- SSR test: intro markup additions stay out of server HTML (existing `rendered-html.test.mjs` pattern).

## Out of scope

- Per-splat region IDs baked into the asset (the ellipsoid shader test is cheap and asset-independent; revisit only if region shapes ever need to be non-ellipsoidal).
- Keyboard traversal of regions (possible later: arrow keys cycle the tour).

## Dependency note

Independent of the splat-size-reduction work — the dyno modifier and hit testing don't care how the splats arrived. If both land, the compact-format decode (which keeps densities in JS) opens the door to density-aware region shapes later.
