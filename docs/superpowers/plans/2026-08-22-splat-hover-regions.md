# Intro Splat Hover Regions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Named ellipsoid regions of the intro Buddhabrot cloud light up under the pointer (or tap) with a caption card, and an idle tour cycles the highlights when nobody interacts.

**Architecture:** A pure module `lib/splat-regions.ts` holds the region catalogue and ray/ellipsoid picking. `BuddhabrotCloudCanvas` grows three dyno uniforms in its existing object modifier (glow inside the hovered ellipsoid, gentle dim outside), pointer picking, tap toggling, an idle tour, and a dev-only `?regions=1` calibration mode. `BuddhabrotIntro` renders the caption card from an `onRegionChange` callback.

**Tech Stack:** TypeScript, React 19, three.js (`Raycaster` for ray construction only), `@sparkjsdev/spark` dyno graph (`dynoVec3`, `dynoFloat`, `dynoLiteral`, `length`, `smoothstep`, `mix` verified present in 2.1), `node --test`.

**Spec:** `docs/superpowers/specs/2026-08-22-splat-hover-regions-design.md`

## Global Constraints

- Branch: `splat-compact-hover` (shared with the compact-format plan; this plan executes after it).
- Splat space is `x = Im(z)`, `y = −(Re(z) + 0.5)`, `z = Im(c)` (see `lib/splat-orbit.ts`); all region constants live in that space.
- Region names reuse the intro papers' vocabulary: *tika*, *ushnisha* are already introduced there in italics.
- Hover, tap, and the tour are all disabled while `fading` (the align-to-play transition) and before `splatReady`.
- The idle tour is disabled under `prefers-reduced-motion: reduce`.
- `lib/splat-regions.ts` must not import three.js — plain `{x, y, z}` vectors, Node-testable.
- Run `npm run lint` before every commit. It must pass.
- Imports use the existing `@/*` alias.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/splat-regions.ts` | Create: region catalogue + ray/ellipsoid picking | 1 |
| `tests/unit/splat-regions.test.ts` | Create: picking unit tests | 1 |
| `app/BuddhabrotCloudCanvas.tsx` | Modify: highlight uniforms, hover/tap, tour, calibration | 2, 4, 5 |
| `tests/unit/cloud-ripples.test.ts` | Modify: ripple-at-position refactor assertions | 4 |
| `tests/unit/intro-cloud-modes.test.ts` | Modify: hover wiring assertions | 2 |
| `app/BuddhabrotIntro.tsx` | Modify: caption card | 3 |
| `app/globals.css` | Modify: card, cursor styles | 2, 3 |

---

### Task 1: Region catalogue and picking math

**Files:**
- Create: `lib/splat-regions.ts`
- Create: `tests/unit/splat-regions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Vec3 = { x: number; y: number; z: number }`, `SplatRegion = { id: string; name: string; blurb: string; center: readonly [number, number, number]; radii: readonly [number, number, number]; link?: string }`, `SPLAT_REGIONS: readonly SplatRegion[]`, `regionVolume(region: SplatRegion): number`, `rayEllipsoidEntry(origin: Vec3, direction: Vec3, region: SplatRegion): number | null`, `pickRegion(origin: Vec3, direction: Vec3, regions?: readonly SplatRegion[]): { region: SplatRegion; entry: number } | null`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/splat-regions.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  pickRegion,
  rayEllipsoidEntry,
  regionVolume,
  SPLAT_REGIONS,
  type SplatRegion,
} from "../../lib/splat-regions.ts";

function region(partial: Partial<SplatRegion>): SplatRegion {
  return {
    id: "test", name: "Test", blurb: "", center: [0, 0, 0], radii: [1, 1, 1],
    ...partial,
  } as SplatRegion;
}

test("a ray toward a centered unit sphere enters at distance minus radius", () => {
  const entry = rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, region({}));
  assert.ok(entry !== null && Math.abs(entry - 4) < 1e-9);
});

test("a ray that misses returns null", () => {
  assert.equal(rayEllipsoidEntry({ x: 0, y: 5, z: 5 }, { x: 0, y: 0, z: -1 }, region({})), null);
});

test("a ray pointing away returns null", () => {
  assert.equal(rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 1 }, region({})), null);
});

test("an origin inside the ellipsoid reports entry 0", () => {
  assert.equal(rayEllipsoidEntry({ x: 0.2, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, region({})), 0);
});

test("anisotropic radii stretch the hit test", () => {
  const flat = region({ radii: [2, 0.1, 0.1] });
  assert.ok(rayEllipsoidEntry({ x: 1.5, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, flat) !== null);
  assert.equal(rayEllipsoidEntry({ x: 1.5, y: 0.5, z: 5 }, { x: 0, y: 0, z: -1 }, flat), null);
});

test("degenerate radii and zero direction are safe", () => {
  assert.equal(rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, region({ radii: [0, 1, 1] })), null);
  assert.equal(rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }, region({})), null);
});

test("pickRegion prefers the most specific (smallest) overlapping region", () => {
  const big = region({ id: "big", radii: [1, 1, 1] });
  const small = region({ id: "small", radii: [0.2, 0.2, 0.2] });
  const picked = pickRegion({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, [big, small]);
  assert.equal(picked?.region.id, "small");
  assert.ok(regionVolume(small) < regionVolume(big));
});

test("pickRegion returns null when nothing is hit", () => {
  assert.equal(pickRegion({ x: 0, y: 9, z: 5 }, { x: 0, y: 0, z: -1 }, [region({})]), null);
});

test("the shipped catalogue is well-formed", () => {
  assert.ok(SPLAT_REGIONS.length >= 5);
  const ids = new Set(SPLAT_REGIONS.map((entry) => entry.id));
  assert.equal(ids.size, SPLAT_REGIONS.length);
  for (const entry of SPLAT_REGIONS) {
    assert.ok(entry.name.length > 0 && entry.blurb.length > 0);
    for (const radius of entry.radii) assert.ok(radius > 0);
    for (const coordinate of entry.center) assert.ok(Math.abs(coordinate) < 2.35);
  }
  // The tika sits inside the head, so specificity ordering matters.
  const tika = SPLAT_REGIONS.find((entry) => entry.id === "tika")!;
  const head = SPLAT_REGIONS.find((entry) => entry.id === "head")!;
  assert.ok(regionVolume(tika) < regionVolume(head));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/splat-regions.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/splat-regions.ts`:

```ts
/**
 * Named ellipsoid regions of the intro Buddhabrot splat cloud, in splat
 * space: x = Im(z), y = -(Re(z) + 0.5), z = Im(c). See lib/splat-orbit.ts.
 * Centers and radii are calibrated with the ?regions=1 mode in
 * app/BuddhabrotCloudCanvas.tsx.
 */

export type Vec3 = { x: number; y: number; z: number };

export type SplatRegion = {
  id: string;
  name: string;
  blurb: string;
  center: readonly [number, number, number];
  radii: readonly [number, number, number];
  link?: string;
};

const BUDDHABROT_WIKI = "https://en.wikipedia.org/wiki/Buddhabrot";

export const SPLAT_REGIONS: readonly SplatRegion[] = [
  {
    id: "spire",
    name: "Spire",
    blurb: "The needle — escape paths whose parameters ride the real axis out toward c = −2.",
    center: [0, 1.52, 0],
    radii: [0.16, 0.5, 0.5],
  },
  {
    id: "ushnisha",
    name: "Ushnisha",
    blurb: "The oval crown — orbits that linger longest before escaping stack their final hops here.",
    center: [0, 1.04, 0],
    radii: [0.24, 0.2, 0.6],
    link: BUDDHABROT_WIKI,
  },
  {
    id: "tika",
    name: "Tika",
    blurb: "The forehead mark — a dense knot of near-periodic escapes just above the head.",
    center: [0, 0.86, 0],
    radii: [0.1, 0.09, 0.5],
    link: BUDDHABROT_WIKI,
  },
  {
    id: "head",
    name: "Head",
    blurb: "Escapes seeded around the period-2 disk trace the head's glow.",
    center: [0, 0.62, 0],
    radii: [0.36, 0.3, 0.7],
  },
  {
    id: "shoulders",
    name: "Shoulders",
    blurb: "The folded arms — mid-length orbits sweeping wide of the imaginary axis.",
    center: [0, 0.08, 0],
    radii: [0.95, 0.3, 0.8],
  },
  {
    id: "body",
    name: "Body",
    blurb: "The seated body — the broad bulk of short escape paths around the main cardioid.",
    center: [0, -0.55, 0],
    radii: [0.9, 0.6, 0.95],
  },
];

export function regionVolume(region: SplatRegion): number {
  return region.radii[0] * region.radii[1] * region.radii[2];
}

/**
 * Distance along the ray to the ellipsoid surface, 0 if the origin is
 * inside, null on a miss. Works in the ellipsoid's unit-sphere frame.
 */
export function rayEllipsoidEntry(origin: Vec3, direction: Vec3, region: SplatRegion): number | null {
  const [rx, ry, rz] = region.radii;
  if (!(rx > 0) || !(ry > 0) || !(rz > 0)) return null;
  const ox = (origin.x - region.center[0]) / rx;
  const oy = (origin.y - region.center[1]) / ry;
  const oz = (origin.z - region.center[2]) / rz;
  const dx = direction.x / rx;
  const dy = direction.y / ry;
  const dz = direction.z / rz;
  const a = dx * dx + dy * dy + dz * dz;
  if (a <= 0) return null;
  const b = ox * dx + oy * dy + oz * dz;
  const c = ox * ox + oy * oy + oz * oz - 1;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const far = (-b + root) / a;
  if (far < 0) return null;
  const near = (-b - root) / a;
  return Math.max(0, near);
}

/** Among all regions the ray hits, the most specific (smallest volume) wins. */
export function pickRegion(
  origin: Vec3,
  direction: Vec3,
  regions: readonly SplatRegion[] = SPLAT_REGIONS,
): { region: SplatRegion; entry: number } | null {
  let best: { region: SplatRegion; entry: number } | null = null;
  for (const region of regions) {
    const entry = rayEllipsoidEntry(origin, direction, region);
    if (entry === null) continue;
    if (!best || regionVolume(region) < regionVolume(best.region)) best = { region, entry };
  }
  return best;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Verify lint passes, commit**

Run: `npm run lint` — no errors.

```bash
git add lib/splat-regions.ts tests/unit/splat-regions.test.ts
git commit -m "Add Buddhabrot splat region catalogue and ray picking"
```

---

### Task 2: Highlight rendering and pointer picking

**Files:**
- Modify: `app/BuddhabrotCloudCanvas.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/intro-cloud-modes.test.ts`

**Interfaces:**
- Consumes: `pickRegion`, `SPLAT_REGIONS`, `SplatRegion` from `@/lib/splat-regions` (Task 1)
- Produces: `BuddhabrotCloudCanvas` prop `onRegionChange?: (region: SplatRegion | null) => void`; internal `setHoveredRegion(region: SplatRegion | null, fromTour?: boolean)` reused by Task 4's tour

- [ ] **Step 1: Update the source-shape test first**

In `tests/unit/intro-cloud-modes.test.ts`, add to the first test:

```ts
  assert.match(cloud, /pickRegion/);
  assert.match(cloud, /regionStrength/);
  assert.match(cloud, /onRegionChange/);
```

Run: `npm run test:unit` — expected: FAIL on the new assertions.

- [ ] **Step 2: Add imports and the prop**

In `app/BuddhabrotCloudCanvas.tsx`, add:

```ts
import { pickRegion, SPLAT_REGIONS, type SplatRegion } from "@/lib/splat-regions";
```

Extend the component signature:

```tsx
export default function BuddhabrotCloudCanvas({
  fading, onLoadProgress, onReady,
  variant = "henon",
  legacySplat = false,
  onRegionChange,
  tune,
}: {
  fading: boolean;
  onLoadProgress?: (progress: number) => void;
  onReady?: () => void;
  variant?: CloudVariant;
  legacySplat?: boolean;
  onRegionChange?: (region: SplatRegion | null) => void;
  tune?: Partial<IntroPlayTune>;
}) {
```

Add `onRegionChange` to the effect dependency array: `[variant, legacySplat, onLoadProgress, onReady, onRegionChange]`. (The parent wraps it in `useCallback` in Task 3; until then it is undefined, which is stable.)

- [ ] **Step 3: Extend the dyno modifier with the highlight**

Replace the body of the existing `splatSizeModifier` `dynoBlock` callback with:

```ts
      ({ gsplat }) => {
        if (!gsplat) throw new Error("No gsplat input");
        const { scales, center, rgb } = dyno.splitGsplat(gsplat).outputs;
        const offset = dyno.mul(dyno.sub(center, regionCenter), regionInvRadii);
        const inside = dyno.smoothstep(
          dyno.dynoLiteral("float", "1.1"),
          dyno.dynoLiteral("float", "0.75"),
          dyno.length(offset),
        );
        const gain = dyno.add(
          dyno.sub(dyno.dynoLiteral("float", "1.0"), dyno.mul(regionStrength, dyno.dynoLiteral("float", "0.18"))),
          dyno.mul(dyno.mul(regionStrength, inside), dyno.dynoLiteral("float", "1.38")),
        );
        return {
          gsplat: dyno.combineGsplat({
            gsplat,
            scales: dyno.mul(scales, splatSize),
            rgb: dyno.mul(rgb, gain),
          }),
        };
      },
```

and declare the three uniforms next to the existing `const splatSize = dyno.dynoFloat(...)`:

```ts
    const regionCenter = dyno.dynoVec3(new THREE.Vector3(0, 0, 0));
    const regionInvRadii = dyno.dynoVec3(new THREE.Vector3(1, 1, 1));
    const regionStrength = dyno.dynoFloat(0);
```

Semantics: with `regionStrength` 0 the gain is exactly 1 everywhere (no visual change); at 1, splats inside the hovered ellipsoid brighten to ~2.2× while the rest dim to 0.82×.

- [ ] **Step 4: Hover state, picking, and easing**

After the uniform declarations, add:

```ts
    const pointerNdc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let hoveredRegion: SplatRegion | null = null;
    let lastInteraction = performance.now();

    function setHoveredRegion(region: SplatRegion | null) {
      if (region === hoveredRegion) return;
      hoveredRegion = region;
      if (region) {
        regionCenter.value.set(region.center[0], region.center[1], region.center[2]);
        regionInvRadii.value.set(1 / region.radii[0], 1 / region.radii[1], 1 / region.radii[2]);
      }
      renderer.domElement.classList.toggle("regionHover", region !== null);
      onRegionChange?.(region);
    }

    function pickAtPointer(event: PointerEvent): SplatRegion | null {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, camera);
      const picked = pickRegion(raycaster.ray.origin, raycaster.ray.direction);
      return picked ? picked.region : null;
    }
```

Extend `onPointerMove` — after the existing `if (!dragging) return;` early path, restructure to:

```ts
    const onPointerMove = (event: PointerEvent) => {
      lastInteraction = performance.now();
      if (dragging) {
        yaw -= (event.clientX - lastPointerX) * 0.006;
        pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastPointerY) * 0.005, -1.25, 1.25);
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        return;
      }
      if (fadingRef.current || !splatReady || event.pointerType === "touch") return;
      setHoveredRegion(pickAtPointer(event));
    };
```

Add a leave handler beside the other listeners:

```ts
    const onPointerLeave = () => setHoveredRegion(null);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
```

(and remove it in the cleanup alongside the other listener removals).

Tap-to-toggle for touch — extend `onPointerDown` to record the press position, and `onPointerUp` to detect a tap:

```ts
    let pressX = 0;
    let pressY = 0;
```

In `onPointerDown`, after `lastPointerY = event.clientY;` add:

```ts
      pressX = event.clientX;
      pressY = event.clientY;
      lastInteraction = performance.now();
```

Change `onPointerUp` to accept the event and toggle on small movement:

```ts
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.classList.remove("dragging");
      lastInteraction = performance.now();
      if (fadingRef.current || !splatReady || event.pointerType !== "touch") return;
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 5) return;
      const tapped = pickAtPointer(event);
      setHoveredRegion(tapped === hoveredRegion ? null : tapped);
    };
```

(`pointercancel` also points at `onPointerUp`; a cancel event has `pointerType` set the same way and large movement is filtered, so no extra branch is needed.)

- [ ] **Step 5: Ease the strength in the render loop and clear on fade**

In `render()`, in the fading branch (right after `scene.background = null;`), add:

```ts
        setHoveredRegion(null);
```

and just before `updateRipples(now);` add:

```ts
      const strengthTarget = hoveredRegion && !fadingRef.current ? 1 : 0;
      regionStrength.value += (strengthTarget - regionStrength.value) * Math.min(1, delta / 140);
```

- [ ] **Step 6: Cursor style**

Append to `app/globals.css` next to the intro styles:

```css
.introCloudHost canvas.regionHover {
  cursor: pointer;
}
```

- [ ] **Step 7: Verify**

Run: `npm run test:unit` — the intro-cloud-modes assertions pass.
Run: `npm run lint` — no errors.
Run: `npm run dev`: hovering the cloud's head/body brightens an ellipsoidal pocket of splats and dims the rest, with a ~150 ms ease in and out; the cursor becomes a pointer; dragging still orbits with no highlight flicker (hover is suppressed while dragging); nothing highlights during the Play fade. Region *shapes* may sit slightly off the visible anatomy — calibration is Task 5.

- [ ] **Step 8: Commit**

```bash
git add app/BuddhabrotCloudCanvas.tsx app/globals.css tests/unit/intro-cloud-modes.test.ts
git commit -m "Highlight hovered Buddhabrot regions in the intro cloud"
```

---

### Task 3: Caption card in the intro

**Files:**
- Modify: `app/BuddhabrotIntro.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `onRegionChange` prop from Task 2; `SplatRegion` from `@/lib/splat-regions`
- Produces: nothing consumed later

- [ ] **Step 1: Wire the callback and state**

In `app/BuddhabrotIntro.tsx`:

```ts
import { useCallback, useState } from "react";
import type { SplatRegion } from "@/lib/splat-regions";
```

(merge with the existing react import). Inside the component:

```tsx
  const [region, setRegion] = useState<SplatRegion | null>(null);
  const [regionVisible, setRegionVisible] = useState(false);
  const handleRegionChange = useCallback((next: SplatRegion | null) => {
    if (next) {
      setRegion(next);
      setRegionVisible(true);
    } else {
      setRegionVisible(false);
    }
  }, []);
```

Keeping the last region while `regionVisible` is false lets the card fade out with its text intact.

Pass the handler to the canvas:

```tsx
      <BuddhabrotCloudCanvas
        fading={fading}
        variant="classic"
        legacySplat={legacySplat}
        onLoadProgress={handleLoadProgress}
        onReady={handleReady}
        onRegionChange={handleRegionChange}
      />
```

- [ ] **Step 2: Render the card**

Add after the load-progress `introChrome` block:

```tsx
      {region && (
        <aside className={`introRegionCard ${regionVisible ? "visible" : ""}`} aria-live="polite">
          <h3 className="introRegionName">{region.name}</h3>
          <p className="introRegionBlurb">
            {region.blurb}
            {region.link && (
              <>
                {" "}
                <a className="introPaperWiki" href={region.link} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>
                <span className="introPaperWikiBox">↗</span>
              </>
            )}
          </p>
        </aside>
      )}
```

- [ ] **Step 3: Style the card**

Append to `app/globals.css` next to the other intro styles:

```css
.introRegionCard {
  position: absolute;
  left: 18px;
  bottom: 52px;
  z-index: 3;
  max-width: 240px;
  padding: 10px 12px;
  border: 1px solid rgba(140, 220, 255, 0.18);
  border-radius: 6px;
  background: rgba(4, 10, 18, 0.78);
  color: #dffbff;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 200ms ease, transform 200ms ease;
  pointer-events: none;
}
.introRegionCard.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.introRegionName {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.introRegionBlurb {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(223, 251, 255, 0.82);
}
```

If the intro papers occupy the lower-left on narrow screens, nudge with a `@media (max-width: 760px)` block placing the card at `bottom: 84px;` — judge visually.

- [ ] **Step 4: Verify**

Run: `npm run lint` — no errors.
Run: `npm test` — SSR test unchanged and passing (the card renders only client-side after hover).
Run: `npm run dev`: hovering a region fades the card in with the region name and blurb; leaving fades it out without the text blanking; the *ushnisha* and *tika* cards show the Wikipedia link.

- [ ] **Step 5: Commit**

```bash
git add app/BuddhabrotIntro.tsx app/globals.css
git commit -m "Show a caption card for hovered Buddhabrot regions"
```

---

### Task 4: Idle tour

**Files:**
- Modify: `app/BuddhabrotCloudCanvas.tsx`
- Modify: `tests/unit/cloud-ripples.test.ts`

**Interfaces:**
- Consumes: `setHoveredRegion`, `lastInteraction` from Task 2; `SPLAT_REGIONS` from Task 1
- Produces: `spawnRippleAt(now: number, position: THREE.Vector3, quaternion: THREE.Quaternion)` extracted from `spawnRipple`

- [ ] **Step 1: Update the ripple source-shape test first**

In `tests/unit/cloud-ripples.test.ts`, replace these two assertions:

```ts
  assert.match(source, /group\.position\.copy\(sample\.center\)/);
  assert.match(source, /group\.quaternion\.copy\(sample\.quaternion\)/);
```

with:

```ts
  assert.match(source, /spawnRippleAt\(now, sample\.center, sample\.quaternion\)/);
  assert.match(source, /group\.position\.copy\(position\)/);
  assert.match(source, /group\.quaternion\.copy\(quaternion\)/);
```

Run: `npm run test:unit` — expected: FAIL (source not yet refactored).

- [ ] **Step 2: Extract `spawnRippleAt`**

In `app/BuddhabrotCloudCanvas.tsx`, split `spawnRipple`:

```ts
    function spawnRippleAt(now: number, position: THREE.Vector3, quaternion: THREE.Quaternion) {
      const group = new THREE.Group();
      group.position.copy(position);
      group.quaternion.copy(quaternion);
      group.quaternion.multiply(new THREE.Quaternion().random());
      // ... unchanged ring + beacon construction through ripples.push(...)
    }

    function spawnRipple(now: number) {
      const sample = pickVisibleSplat();
      if (!sample) return;
      spawnRippleAt(now, sample.center, sample.quaternion);
    }
```

(the ring/beacon body moves verbatim into `spawnRippleAt`; `spawnRipple` keeps its call sites).

- [ ] **Step 3: Add the tour**

Next to the hover state from Task 2, add:

```ts
    const IDLE_TOUR_AFTER_MS = 9_000;
    const TOUR_DWELL_MS = 6_000;
    let tourIndex = -1;
    let tourActive = false;
    let nextTourStepAt = 0;
    const tourPosition = new THREE.Vector3();
    const tourQuaternion = new THREE.Quaternion();

    function stopTour() {
      if (!tourActive) return;
      tourActive = false;
      setHoveredRegion(null);
    }

    function updateTour(now: number) {
      if (reduceMotion || fadingRef.current || !splatReady || dragging) {
        stopTour();
        return;
      }
      if (now - lastInteraction < IDLE_TOUR_AFTER_MS) {
        stopTour();
        return;
      }
      if (tourActive && now < nextTourStepAt) return;
      tourActive = true;
      nextTourStepAt = now + TOUR_DWELL_MS;
      tourIndex = (tourIndex + 1) % SPLAT_REGIONS.length;
      const region = SPLAT_REGIONS[tourIndex];
      setHoveredRegion(region);
      tourPosition.set(region.center[0], region.center[1], region.center[2]);
      spawnRippleAt(now, tourPosition, tourQuaternion.identity());
    }
```

Interaction handling: `lastInteraction` is already stamped in `onPointerMove`, `onPointerDown`, and `onPointerUp` (Task 2). A pointer hover pick after the tour stops naturally replaces the tour's highlight because both go through `setHoveredRegion`.

Call it in `render()`, just before the `strengthTarget` easing added in Task 2:

```ts
      updateTour(now);
```

- [ ] **Step 4: Verify**

Run: `npm run test:unit` — cloud-ripples assertions pass again.
Run: `npm run lint` — no errors.
Run: `npm run dev`: leave the intro untouched for ~9 s — regions begin lighting up one at a time every 6 s, each with a ripple at its center and its caption card; moving the mouse stops the tour immediately and hover takes over; with `prefers-reduced-motion: reduce` (emulate via DevTools rendering tab) the tour never starts.

- [ ] **Step 5: Commit**

```bash
git add app/BuddhabrotCloudCanvas.tsx tests/unit/cloud-ripples.test.ts
git commit -m "Tour Buddhabrot regions while the intro sits idle"
```

---

### Task 5: Calibration mode and final region constants

**Files:**
- Modify: `app/BuddhabrotCloudCanvas.tsx` (dev-only calibration)
- Modify: `lib/splat-regions.ts` (calibrated constants)

**Interfaces:**
- Consumes: everything above
- Produces: final `SPLAT_REGIONS` numbers

- [ ] **Step 1: Add the calibration mode**

In the effect in `app/BuddhabrotCloudCanvas.tsx`, near the top (after `reduceMotion`):

```ts
    const calibrateRegions = new URLSearchParams(window.location.search).has("regions");
```

After the splat mesh is added to the scene (in the `createSplatMesh().then(...)` chain — or after `scene.add(splat)` in the pre-compact layout), add wireframes when calibrating:

```ts
      if (calibrateRegions) {
        for (const region of SPLAT_REGIONS) {
          const wire = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0x65b9ff, wireframe: true, transparent: true, opacity: 0.22 }),
          );
          wire.position.set(region.center[0], region.center[1], region.center[2]);
          wire.scale.set(region.radii[0], region.radii[1], region.radii[2]);
          scene.add(wire);
        }
      }
```

(The wireframes are debug-only scene children; they are removed with the scene on unmount, so no dedicated cleanup is needed beyond `renderer.dispose()` — but if lint or leaks bother you, collect them in an array and dispose geometry/material in the cleanup.)

In `onPointerUp`, before the touch-tap branch, add click logging when calibrating:

```ts
      if (calibrateRegions && Math.hypot(event.clientX - pressX, event.clientY - pressY) <= 5) {
        const packed = splat?.packedSplats;
        if (packed) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointerNdc.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(pointerNdc, camera);
          const { origin, direction } = raycaster.ray;
          const count = packed.getNumSplats();
          let best: { point: THREE.Vector3; score: number } | null = null;
          const toSplat = new THREE.Vector3();
          for (let index = 0; index < count; index += 7) {
            const sample = packed.getSplat(index);
            if (sample.opacity < 0.12) continue;
            toSplat.copy(sample.center).sub(origin);
            const along = toSplat.dot(direction);
            if (along <= 0) continue;
            const offAxis = toSplat.addScaledVector(direction, -along).length();
            const score = offAxis + along * 0.01;
            if (offAxis < 0.06 && (!best || score < best.score)) {
              best = { point: sample.center.clone(), score };
            }
          }
          if (best) {
            console.log(`[regions] splat-space hit: [${best.point.x.toFixed(3)}, ${best.point.y.toFixed(3)}, ${best.point.z.toFixed(3)}]`);
          }
        }
      }
```

- [ ] **Step 2: Calibrate**

Run: `npm run dev`, open the intro with `?regions=1`. The six wireframe ellipsoids overlay the cloud. Click the visible anatomy features (spire tip, crown, forehead knot, head, shoulder sweep, body bulk) from a front-ish camera angle and from a side angle; read the logged splat-space points.

Update the `center`/`radii` constants in `lib/splat-regions.ts` so each wireframe wraps its feature snugly. Keep the tika smaller than the head (the catalogue test enforces the volume ordering).

- [ ] **Step 3: Verify the calibrated result**

Reload with and without `?regions=1`: wireframes match features; hover highlights read as "that part of the Buddha lit up", not as a floating blob; the tour's six stops all land on visible anatomy.

Run: `npm run lint` — no errors.
Run: `npm test` — full suite passes.

- [ ] **Step 4: Commit**

```bash
git add app/BuddhabrotCloudCanvas.tsx lib/splat-regions.ts
git commit -m "Calibrate hover regions with a dev overlay"
```

---

## Notes for the reviewer

- **Not covered by automated tests:** the dyno highlight graph, pointer picking against the live camera, and the calibration overlay — all verified by the manual steps, matching the repo's policy for GPU/browser adapters.
- **Overlap policy:** smallest-volume region wins (the *tika* sits inside the head); enforced by a unit test on the catalogue.
- **Interaction priority:** dragging beats hover; hover beats tour; the tour only runs after 9 s of idle and never under reduced motion.
- **Dependency:** executes after the compact-format plan on the shared branch; Task 5's click logging references `splat?.packedSplats`, which exists in both the legacy and compact paths.
