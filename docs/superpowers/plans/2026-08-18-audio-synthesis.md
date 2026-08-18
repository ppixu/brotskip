# Audio Synthesis System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline synth in `app/MandelbrotSkipping.tsx` with a `lib/audio/` module offering two complete, user-toggleable sound engines (Melodic and Resonant) driven by live orbit-shape statistics.

**Architecture:** A shared engine shell (AudioContext, master bus with generated-IR reverb, lookahead scheduler, mode crossfade) hosts two engines. A feature pipeline converts `orbitScores` into per-glyph-group statistics plus coverage-milestone events; the Melodic engine renders them as quantized generative music (glyph instrument patches, arpeggio streams, milestone chord swells over a macro-controlled wavetable bed), the Resonant engine as physical modal-resonator banks whose mode ratios derive from each glyph's geometry.

**Tech Stack:** TypeScript, raw Web Audio API (no dependencies, no sample assets), node:test unit tests, React 19 component integration.

**Spec:** `docs/superpowers/specs/2026-08-18-audio-synthesis-design.md`. One approved refinement: the component passes raw orbit snapshots to `GameAudio.update(orbits, phase, nowMs)` and the facade owns the feature tracker internally (the spec's `update(frame, phase)` shape moved one level down).

## Global Constraints

- No new npm dependencies. Web Audio API only. No audio sample files — every buffer (noise, impulse response) is generated in code.
- Files in `lib/` that unit tests can reach must use relative imports **with the `.ts` extension** (`./theory.ts`), because tests run under `node --experimental-strip-types`. App files keep using the `@/lib/...` alias.
- Every `lib/audio/*` module must be import-safe in Node: no top-level `AudioContext`, `window`, or DOM usage. Browser globals may only be referenced inside function bodies.
- All public `GameAudio` methods are no-throw: bodies wrapped in try/catch, failures degrade to silence.
- Pitched material goes through `degreeToFrequency`; sustained tones cap at 2500 Hz (`MAX_SUSTAINED_HZ`), transient partials at 6000 Hz.
- Scales are consonant-only: major pentatonic, minor pentatonic, dorian, lydian, mixolydian.
- `TUNING_KEY` stays `"mandelbrot-skipping:tuning:v4"`; new tuning fields get defaults in `sanitizeTuning`.
- Unit tests use `node:test` + `node:assert/strict`, run via `node --experimental-strip-types --test tests/unit/<file>.test.ts`. Test imports are relative with `.ts` extension (see `tests/unit/cache.test.ts` for the pattern).
- `app/MandelbrotSkipping.tsx` is actively edited by other sessions — **locate every edit point by symbol name or anchor text, never by line number**, and run `git pull`/`git status` before starting a task that touches it.
- Commit messages: sentence-case imperative summary ending with a period (match `git log` style).
- TypeScript: avoid enums and other non-erasable syntax (strip-types compatibility).

## File Structure

- Create: `lib/orbit-shape.ts` — shared coverage-grid shape statistics (extracted from the component).
- Create: `lib/audio/theory.ts` — scales, palette seeding, degree→Hz, chords.
- Create: `lib/audio/features.ts` — feature tracker (orbits → `FeatureFrame`) + milestone detector.
- Create: `lib/audio/engine.ts` — engine shell: master bus, reverb, scheduler, crossfade; pure helpers.
- Create: `lib/audio/melodic.ts` — Melodic engine (bed, glyph patches, arps, swells).
- Create: `lib/audio/modal.ts` — Resonant engine (modal banks, exciters).
- Create: `lib/audio/index.ts` — `GameAudio` facade.
- Modify: `app/MandelbrotSkipping.tsx` — remove inline synth (~350 lines), wire the facade, extend tuning + panel.
- Test: `tests/unit/orbit-shape.test.ts`, `tests/unit/audio-theory.test.ts`, `tests/unit/audio-features.test.ts`, `tests/unit/audio-engine.test.ts`, `tests/unit/audio-melodic.test.ts`, `tests/unit/audio-modal.test.ts`, `tests/unit/audio-index.test.ts`.

---

### Task 1: Extract orbit shape statistics into lib/orbit-shape.ts

**Files:**
- Create: `lib/orbit-shape.ts`
- Modify: `app/MandelbrotSkipping.tsx` (remove local `orbitShape`, `COVERAGE_GRID`, `COVERAGE_WORDS`, `FULL_GRID_VARIANCE`; import them)
- Test: `tests/unit/orbit-shape.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `COVERAGE_GRID: 32`, `COVERAGE_WORDS: number`, `FULL_GRID_VARIANCE: number`, `type OrbitShapeSums = { distinct: number; sumX: number; sumY: number; sumXX: number; sumYY: number; sumXY: number }`, `type OrbitShapeStats = { area; coverage; spread; elongation; orientation; density; centroidX; centroidY: number }`, `orbitShape(orbit: OrbitShapeSums): OrbitShapeStats`. Tasks 3+ and the component both import these.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/orbit-shape.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { COVERAGE_GRID, orbitShape } from "../../lib/orbit-shape.ts";

test("empty sums produce all-zero stats", () => {
  const stats = orbitShape({ distinct: 0, sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0 });
  assert.deepEqual(stats, {
    area: 0, coverage: 0, spread: 0, elongation: 0,
    orientation: 0, density: 0, centroidX: 0, centroidY: 0,
  });
});

test("two horizontally separated cells form a fully elongated shape", () => {
  // Cells (10,16) and (20,16): meanX=15, meanY=16, varX=25, varY=0, cov=0.
  const stats = orbitShape({ distinct: 2, sumX: 30, sumY: 32, sumXX: 500, sumYY: 512, sumXY: 480 });
  assert.equal(stats.area, 0);
  assert.equal(stats.elongation, 1);
  assert.equal(stats.orientation, 0);
  assert.equal(stats.density, 1);
  assert.ok(Math.abs(stats.centroidX - (15 / (COVERAGE_GRID - 1) * 2 - 1)) < 1e-12);
  assert.ok(Math.abs(stats.centroidY - (16 / (COVERAGE_GRID - 1) * 2 - 1)) < 1e-12);
});

test("coverage grows with distinct cell count", () => {
  const few = orbitShape({ distinct: 4, sumX: 60, sumY: 64, sumXX: 1000, sumYY: 1024, sumXY: 960 });
  const many = orbitShape({ distinct: 400, sumX: 6000, sumY: 6400, sumXX: 100000, sumYY: 102400, sumXY: 96000 });
  assert.ok(many.coverage > few.coverage);
  assert.ok(many.coverage <= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/orbit-shape.test.ts`
Expected: FAIL — cannot find module `lib/orbit-shape.ts`.

- [ ] **Step 3: Create lib/orbit-shape.ts**

The function body is moved verbatim from `orbitShape` in `app/MandelbrotSkipping.tsx`:

```ts
/** Coverage-grid shape statistics shared by scoring, HUD, and the audio engines. */

export const COVERAGE_GRID = 32;
export const COVERAGE_WORDS = COVERAGE_GRID * COVERAGE_GRID / 32;
export const FULL_GRID_VARIANCE = (COVERAGE_GRID * COVERAGE_GRID - 1) / 12;

export type OrbitShapeSums = {
  distinct: number;
  sumX: number;
  sumY: number;
  sumXX: number;
  sumYY: number;
  sumXY: number;
};

export type OrbitShapeStats = {
  area: number;
  coverage: number;
  spread: number;
  elongation: number;
  orientation: number;
  density: number;
  centroidX: number;
  centroidY: number;
};

export function orbitShape(orbit: OrbitShapeSums): OrbitShapeStats {
  const n = orbit.distinct;
  if (!n) return { area: 0, coverage: 0, spread: 0, elongation: 0, orientation: 0, density: 0, centroidX: 0, centroidY: 0 };
  const meanX = orbit.sumX / n;
  const meanY = orbit.sumY / n;
  const varianceX = Math.max(0, orbit.sumXX / n - meanX * meanX);
  const varianceY = Math.max(0, orbit.sumYY / n - meanY * meanY);
  const covariance = orbit.sumXY / n - meanX * meanY;
  const determinant = Math.max(0, varianceX * varianceY - covariance * covariance);
  const discriminant = Math.sqrt((varianceX - varianceY) ** 2 + 4 * covariance * covariance);
  const major = Math.max(0, (varianceX + varianceY + discriminant) * .5);
  const minor = Math.max(0, (varianceX + varianceY - discriminant) * .5);
  const area = Math.min(1, Math.sqrt(determinant) / FULL_GRID_VARIANCE);
  const coverage = Math.min(1, Math.log2(1 + n) / Math.log2(1 + COVERAGE_GRID * COVERAGE_GRID));
  const elongation = major > .001 ? Math.min(1, 1 - Math.sqrt(minor / major)) : 0;
  const orientation = .5 * Math.atan2(2 * covariance, varianceX - varianceY);
  const estimatedCells = Math.max(1, Math.min(COVERAGE_GRID * COVERAGE_GRID, 4 * Math.PI * Math.sqrt(determinant)));
  const density = Math.min(1, n / estimatedCells);
  return {
    area,
    coverage,
    spread: Math.sqrt(area),
    elongation,
    orientation,
    density,
    centroidX: meanX / (COVERAGE_GRID - 1) * 2 - 1,
    centroidY: meanY / (COVERAGE_GRID - 1) * 2 - 1,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/orbit-shape.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Point the component at the new module**

In `app/MandelbrotSkipping.tsx`:
1. Delete the local `function orbitShape(...)` (find `function orbitShape(orbit: OrbitScore)`) and the three consts `COVERAGE_GRID`, `COVERAGE_WORDS`, `FULL_GRID_VARIANCE` (find `const COVERAGE_GRID = 32;`).
2. Add to the imports near the top (next to `import { MAX_SKIPS, MIN_SKIPS, sampleSkipCount } from "@/lib/skip-count";`):

```ts
import { COVERAGE_GRID, COVERAGE_WORDS, orbitShape } from "@/lib/orbit-shape";
```

All existing call sites (`orbitShape(orbit)`, `new Uint32Array(COVERAGE_WORDS)`, coverage-grid math in `recordOrbitCell`) keep working — `OrbitScore` satisfies `OrbitShapeSums` structurally.

- [ ] **Step 6: Verify lint and unit tests**

Run: `npm run lint && npm run test:unit`
Expected: both PASS (lint will flag `FULL_GRID_VARIANCE` if it was left imported but unused — import only the three names above).

- [ ] **Step 7: Commit**

```bash
git add lib/orbit-shape.ts tests/unit/orbit-shape.test.ts app/MandelbrotSkipping.tsx
git commit -m "Extract orbit shape statistics into a shared lib module."
```

---

### Task 2: Music theory core (lib/audio/theory.ts)

**Files:**
- Create: `lib/audio/theory.ts`
- Test: `tests/unit/audio-theory.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AUDIO_SCALES`, `MAX_SUSTAINED_HZ = 2500`, `GLYPH_DEGREE_OFFSET: readonly number[]` (7 entries), `type Palette = { seed: number; scaleName: string; steps: readonly number[]; rootMidi: number }`, `paletteFromLanding(cr: number, ci: number): Palette`, `degreeToFrequency(palette: Palette, degree: number, maxHz?: number): number`, `CHORD_PROGRESSION: readonly (readonly number[])[]`, `chordForBar(barIndex: number): readonly number[]`, `snapToChord(degree: number, chord: readonly number[], scaleLength: number): number`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/audio-theory.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  AUDIO_SCALES,
  CHORD_PROGRESSION,
  chordForBar,
  degreeToFrequency,
  GLYPH_DEGREE_OFFSET,
  MAX_SUSTAINED_HZ,
  paletteFromLanding,
  snapToChord,
} from "../../lib/audio/theory.ts";

test("only consonant scales are offered", () => {
  assert.equal(AUDIO_SCALES.length, 5);
  const names = AUDIO_SCALES.map((scale) => scale.name);
  assert.ok(names.includes("major-pentatonic"));
  assert.ok(!names.includes("whole-tone"));
  for (const scale of AUDIO_SCALES) {
    assert.equal(scale.steps[0], 0);
    for (let index = 1; index < scale.steps.length; index++) {
      assert.ok(scale.steps[index] > scale.steps[index - 1]);
      assert.ok(scale.steps[index] < 12);
    }
  }
});

test("palette seeding is deterministic and varies with landing", () => {
  const a = paletteFromLanding(-0.58, 0.2);
  const b = paletteFromLanding(-0.58, 0.2);
  const c = paletteFromLanding(0.31, -0.7);
  assert.deepEqual(a, b);
  assert.notEqual(a.seed, c.seed);
  assert.ok(a.rootMidi >= 36 && a.rootMidi < 48);
});

test("one scale length up is exactly one octave", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  const root = degreeToFrequency(palette, 0);
  const octave = degreeToFrequency(palette, palette.steps.length);
  assert.ok(Math.abs(octave / root - 2) < 1e-9);
});

test("negative degrees wrap downward", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  const below = degreeToFrequency(palette, -palette.steps.length);
  const root = degreeToFrequency(palette, 0);
  assert.ok(Math.abs(root / below - 2) < 1e-9);
});

test("sustained frequency is capped", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  assert.ok(degreeToFrequency(palette, 500) <= MAX_SUSTAINED_HZ);
});

test("chord progression cycles every two bars", () => {
  assert.equal(CHORD_PROGRESSION.length, 4);
  assert.deepEqual(chordForBar(0), chordForBar(1));
  assert.notDeepEqual(chordForBar(0), chordForBar(2));
  assert.deepEqual(chordForBar(0), chordForBar(8));
});

test("snapToChord lands on a chord tone in some octave", () => {
  const chord = [0, 2, 4];
  const scaleLength = 5;
  for (const degree of [-7, -1, 0, 1, 3, 6, 9, 14]) {
    const snapped = snapToChord(degree, chord, scaleLength);
    const wrapped = ((snapped % scaleLength) + scaleLength) % scaleLength;
    assert.ok(chord.includes(wrapped), `degree ${degree} snapped to ${snapped}`);
    assert.ok(Math.abs(snapped - degree) <= scaleLength / 2 + 1);
  }
});

test("glyph degree offsets cover all seven glyphs", () => {
  assert.equal(GLYPH_DEGREE_OFFSET.length, 7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/audio-theory.test.ts`
Expected: FAIL — cannot find module `lib/audio/theory.ts`.

- [ ] **Step 3: Create lib/audio/theory.ts**

```ts
/**
 * Musical core shared by both sound engines. Every pitched voice in the
 * game funnels through degreeToFrequency, so all output stays inside one
 * consonant, landing-seeded palette.
 */

export type AudioScale = { name: string; steps: readonly number[] };

export const AUDIO_SCALES: readonly AudioScale[] = [
  { name: "major-pentatonic", steps: [0, 2, 4, 7, 9] },
  { name: "minor-pentatonic", steps: [0, 3, 5, 7, 10] },
  { name: "dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  { name: "lydian", steps: [0, 2, 4, 6, 7, 9, 11] },
  { name: "mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
];

export const MAX_SUSTAINED_HZ = 2500;

/** Base scale degree per sacred glyph, so each glyph sits on its own step. */
export const GLYPH_DEGREE_OFFSET: readonly number[] = [0, 2, 1, 3, 4, 5, 6];

export type Palette = {
  seed: number;
  scaleName: string;
  steps: readonly number[];
  rootMidi: number;
};

export function paletteFromLanding(cr: number, ci: number): Palette {
  const seed = Math.abs(Math.round((cr + 2.2) * 137 + (ci + 1.5) * 211));
  const scale = AUDIO_SCALES[seed % AUDIO_SCALES.length];
  return { seed, scaleName: scale.name, steps: scale.steps, rootMidi: 36 + (seed * 7) % 12 };
}

export function degreeToFrequency(palette: Palette, degree: number, maxHz = MAX_SUSTAINED_HZ): number {
  const rounded = Math.round(degree);
  const length = palette.steps.length;
  const wrapped = ((rounded % length) + length) % length;
  const octave = Math.floor(rounded / length);
  const midi = palette.rootMidi + palette.steps[wrapped] + octave * 12;
  return Math.min(maxHz, 440 * 2 ** ((midi - 69) / 12));
}

/** Chords as scale-degree stacks; the progression advances every two bars. */
export const CHORD_PROGRESSION: readonly (readonly number[])[] = [
  [0, 2, 4],
  [5, 7, 9],
  [3, 5, 7],
  [4, 6, 8],
];

export function chordForBar(barIndex: number): readonly number[] {
  const step = Math.floor(Math.max(0, barIndex) / 2) % CHORD_PROGRESSION.length;
  return CHORD_PROGRESSION[step];
}

/** Snap a degree to the nearest chord tone in any octave. */
export function snapToChord(degree: number, chord: readonly number[], scaleLength: number): number {
  const rounded = Math.round(degree);
  let best = rounded;
  let bestDistance = Infinity;
  for (const tone of chord) {
    for (let octave = -3; octave <= 4; octave++) {
      const candidate = tone + octave * scaleLength;
      const distance = Math.abs(candidate - rounded);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/audio-theory.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audio/theory.ts tests/unit/audio-theory.test.ts
git commit -m "Add the consonant music-theory core for the sound engines."
```

---

### Task 3: Feature pipeline and milestone detector (lib/audio/features.ts)

**Files:**
- Create: `lib/audio/features.ts`
- Test: `tests/unit/audio-features.test.ts`

**Interfaces:**
- Consumes: `orbitShape`, `type OrbitShapeSums` from `../orbit-shape.ts` (Task 1).
- Produces:
  - `type OrbitFeatureInput = OrbitShapeSums & { skip; glyph; zr; zi; cr; ci; shownDepth; stepDistance; distanceContraction: number; resolved: boolean }`
  - `type GlyphGroupFeatures = { skip; glyph; area; spread; elongation; orientation; density; centroidX; centroidY; zAngle; zRadius; coverage; coverageMotion; presence; activity; deepest: number }`
  - `type FeatureFrame = { landing: { cr: number; ci: number } | null; groups: GlyphGroupFeatures[]; glyphCount; activeRatio; dispersion; chaos; growth; contraction; proximity; depthBand; deepest; coverage: number }`
  - `createFeatureTracker(): { extract(orbits: readonly OrbitFeatureInput[]): FeatureFrame; reset(): void }` and `type FeatureTracker`
  - `type Milestone = { skip: number; glyph: number; kind: "bloom" | "doubling"; magnitude: number; area: number }`
  - `BLOOM_CELLS = 8`, `createMilestoneDetector(bloomCells?: number): { detect(groups: readonly GlyphGroupFeatures[]): Milestone[]; reset(): void }`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/audio-features.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  createFeatureTracker,
  createMilestoneDetector,
  type GlyphGroupFeatures,
  type OrbitFeatureInput,
} from "../../lib/audio/features.ts";

function makeOrbit(overrides: Partial<OrbitFeatureInput> = {}): OrbitFeatureInput {
  return {
    skip: 1, glyph: 0, zr: 0.3, zi: 0.1, cr: -0.6, ci: 0.2,
    shownDepth: 100, stepDistance: 0.01, distanceContraction: 0.2, resolved: false,
    distinct: 10, sumX: 150, sumY: 160, sumXX: 2350, sumYY: 2660, sumXY: 2400,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<GlyphGroupFeatures> = {}): GlyphGroupFeatures {
  return {
    skip: 1, glyph: 0, area: 0.4, spread: 0.6, elongation: 0.2, orientation: 0,
    density: 0.5, centroidX: 0, centroidY: 0, zAngle: 0, zRadius: 0.3,
    coverage: 0, coverageMotion: 0, presence: 0, activity: 0, deepest: 100,
    ...overrides,
  };
}

test("empty input yields an empty frame", () => {
  const tracker = createFeatureTracker();
  const frame = tracker.extract([]);
  assert.equal(frame.landing, null);
  assert.equal(frame.groups.length, 0);
  assert.equal(frame.coverage, 0);
});

test("orbits group by skip, sorted, with landing from the first orbit", () => {
  const tracker = createFeatureTracker();
  const frame = tracker.extract([
    makeOrbit({ skip: 2, glyph: 1 }),
    makeOrbit({ skip: 1, glyph: 0 }),
    makeOrbit({ skip: 2, glyph: 1, distinct: 20, sumX: 300, sumY: 320, sumXX: 4700, sumYY: 5320, sumXY: 4800 }),
  ]);
  assert.deepEqual(frame.groups.map((group) => group.skip), [1, 2]);
  assert.equal(frame.groups[1].coverage, 30);
  assert.deepEqual(frame.landing, { cr: -0.6, ci: 0.2 });
  assert.equal(frame.glyphCount, 2);
});

test("coverage motion registers growth then settles", () => {
  const tracker = createFeatureTracker();
  const first = tracker.extract([makeOrbit({ distinct: 10 })]);
  assert.ok(first.groups[0].coverageMotion > 0);
  assert.ok(first.growth > 0);
  const second = tracker.extract([makeOrbit({ distinct: 10 })]);
  assert.equal(second.groups[0].coverageMotion, 0);
  assert.equal(second.growth, 0);
  assert.equal(second.groups[0].activity, 0);
});

test("zAngle follows the orbit position angle", () => {
  const tracker = createFeatureTracker();
  const frame = tracker.extract([makeOrbit({ zr: 0, zi: 1 })]);
  assert.ok(Math.abs(frame.groups[0].zAngle - Math.PI / 2) < 1e-9);
});

test("reset clears motion baselines", () => {
  const tracker = createFeatureTracker();
  tracker.extract([makeOrbit({ distinct: 10 })]);
  tracker.reset();
  const frame = tracker.extract([makeOrbit({ distinct: 10 })]);
  assert.ok(frame.groups[0].coverageMotion > 0);
});

test("milestones: bloom fires once, then doublings", () => {
  const detector = createMilestoneDetector();
  assert.deepEqual(detector.detect([makeGroup({ coverage: 4 })]), []);
  const bloom = detector.detect([makeGroup({ coverage: 10 })]);
  assert.equal(bloom.length, 1);
  assert.equal(bloom[0].kind, "bloom");
  assert.ok(bloom[0].magnitude > 0 && bloom[0].magnitude <= 1);
  assert.deepEqual(detector.detect([makeGroup({ coverage: 15 })]), []);
  const double = detector.detect([makeGroup({ coverage: 21 })]);
  assert.equal(double.length, 1);
  assert.equal(double[0].kind, "doubling");
  assert.deepEqual(detector.detect([makeGroup({ coverage: 30 })]), []);
  assert.equal(detector.detect([makeGroup({ coverage: 44 })])[0].kind, "doubling");
});

test("bigger areas make bigger milestone magnitudes", () => {
  const small = createMilestoneDetector().detect([makeGroup({ coverage: 10, area: 0.05 })]);
  const large = createMilestoneDetector().detect([makeGroup({ coverage: 10, area: 0.9 })]);
  assert.ok(large[0].magnitude > small[0].magnitude);
});

test("milestone reset forgets bloom state", () => {
  const detector = createMilestoneDetector();
  detector.detect([makeGroup({ coverage: 10 })]);
  detector.reset();
  assert.equal(detector.detect([makeGroup({ coverage: 10 })])[0].kind, "bloom");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/audio-features.test.ts`
Expected: FAIL — cannot find module `lib/audio/features.ts`.

- [ ] **Step 3: Create lib/audio/features.ts**

```ts
/**
 * Converts live orbitScores into a compact FeatureFrame both sound engines
 * consume, and detects coverage milestones ("a big form just appeared").
 * Pure math — safe to import and unit test in Node.
 */
import { orbitShape, type OrbitShapeSums } from "../orbit-shape.ts";

export type OrbitFeatureInput = OrbitShapeSums & {
  skip: number;
  glyph: number;
  zr: number;
  zi: number;
  cr: number;
  ci: number;
  shownDepth: number;
  stepDistance: number;
  distanceContraction: number;
  resolved: boolean;
};

export type GlyphGroupFeatures = {
  skip: number;
  glyph: number;
  area: number;
  spread: number;
  elongation: number;
  orientation: number;
  density: number;
  centroidX: number;
  centroidY: number;
  zAngle: number;
  zRadius: number;
  coverage: number;
  coverageMotion: number;
  presence: number;
  activity: number;
  deepest: number;
};

export type FeatureFrame = {
  landing: { cr: number; ci: number } | null;
  groups: GlyphGroupFeatures[];
  glyphCount: number;
  activeRatio: number;
  dispersion: number;
  chaos: number;
  growth: number;
  contraction: number;
  proximity: number;
  depthBand: number;
  deepest: number;
  coverage: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** The 80th percentile lets a visible family pull a signal up without one outlier hijacking it. */
function upperQuantile(values: number[]) {
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(values.length * .8))];
}

export function createFeatureTracker() {
  const lastGroupCoverage = new Map<number, number>();
  let lastTotalCoverage = 0;

  function extract(orbits: readonly OrbitFeatureInput[]): FeatureFrame {
    if (!orbits.length) {
      return {
        landing: null, groups: [], glyphCount: 0, activeRatio: 0, dispersion: 0,
        chaos: 0, growth: 0, contraction: 0, proximity: 0, depthBand: 0, deepest: 0, coverage: 0,
      };
    }
    const shapes = orbits.map(orbitShape);
    const skips = Array.from(new Set(orbits.map((orbit) => orbit.skip))).sort((a, b) => a - b);
    const groups: GlyphGroupFeatures[] = skips.map((skip) => {
      const indices = orbits.flatMap((orbit, index) => orbit.skip === skip ? [index] : []);
      const count = Math.max(1, indices.length);
      const mean = (select: (index: number) => number) =>
        indices.reduce((sum, index) => sum + select(index), 0) / count;
      const orientationSin = mean((index) => Math.sin(shapes[index].orientation * 2));
      const orientationCos = mean((index) => Math.cos(shapes[index].orientation * 2));
      const angleSin = mean((index) => Math.sin(Math.atan2(orbits[index].zi, orbits[index].zr)));
      const angleCos = mean((index) => Math.cos(Math.atan2(orbits[index].zi, orbits[index].zr)));
      const coverage = indices.reduce((sum, index) => sum + orbits[index].distinct, 0);
      const previous = lastGroupCoverage.get(skip) || 0;
      const coverageMotion = Math.max(0, coverage - previous);
      lastGroupCoverage.set(skip, coverage);
      return {
        skip,
        glyph: orbits[indices[0]].glyph,
        area: mean((index) => shapes[index].area),
        spread: mean((index) => shapes[index].spread),
        elongation: mean((index) => shapes[index].elongation),
        density: mean((index) => shapes[index].density),
        centroidX: mean((index) => shapes[index].centroidX),
        centroidY: mean((index) => shapes[index].centroidY),
        orientation: .5 * Math.atan2(orientationSin, orientationCos),
        zAngle: Math.atan2(angleSin, angleCos),
        zRadius: mean((index) => Math.min(1, Math.hypot(orbits[index].zr, orbits[index].zi) / 2)),
        coverage,
        coverageMotion,
        presence: Math.min(1, Math.log2(coverage + 1) / 10),
        activity: Math.min(1, Math.log2(coverageMotion + 1) / 5),
        deepest: indices.reduce((best, index) => Math.max(best, orbits[index].shownDepth), 0),
      };
    });
    const meanShape = (select: (shape: typeof shapes[number]) => number) =>
      shapes.reduce((sum, shape) => sum + select(shape), 0) / shapes.length;
    const spreadMean = meanShape((shape) => shape.spread);
    const elongationMean = meanShape((shape) => shape.elongation);
    const densityMean = meanShape((shape) => shape.density);
    const centroidX = meanShape((shape) => shape.centroidX);
    const centroidY = meanShape((shape) => shape.centroidY);
    const dispersion = Math.min(1, Math.sqrt(shapes.reduce((sum, shape) =>
      sum + (shape.centroidX - centroidX) ** 2 + (shape.centroidY - centroidY) ** 2, 0) / shapes.length * .5));
    const featureVariance = Math.min(1, Math.sqrt(
      meanShape((shape) => (shape.spread - spreadMean) ** 2)
      + meanShape((shape) => (shape.elongation - elongationMean) ** 2)
      + meanShape((shape) => (shape.density - densityMean) ** 2),
    ));
    const instability = orbits.reduce((sum, orbit) =>
      sum + Math.min(1, Math.hypot(orbit.zr, orbit.zi) / 2), 0) / orbits.length;
    const coverage = orbits.reduce((sum, orbit) => sum + orbit.distinct, 0);
    const coverageMotion = Math.max(0, coverage - lastTotalCoverage);
    lastTotalCoverage = coverage;
    const travel = orbits.filter((orbit) => Number.isFinite(orbit.stepDistance) && orbit.stepDistance > 0);
    const deepest = orbits.reduce((best, orbit) => Math.max(best, orbit.shownDepth), 0);
    return {
      landing: { cr: orbits[0].cr, ci: orbits[0].ci },
      groups,
      glyphCount: groups.filter((group) => group.coverage > 0).length,
      activeRatio: orbits.reduce((count, orbit) => count + (orbit.resolved ? 0 : 1), 0) / orbits.length,
      dispersion,
      chaos: Math.min(1, featureVariance * 1.7 + (1 - densityMean) * .24 + instability * .28),
      growth: Math.min(1, Math.log2(coverageMotion + 1) / 4.5),
      contraction: upperQuantile(travel.map((orbit) => clamp01(orbit.distanceContraction / 1.5))),
      proximity: upperQuantile(travel.map((orbit) =>
        clamp01((-Math.log2(Math.max(orbit.stepDistance, 1e-12)) - .25) / 15))),
      depthBand: Math.log2(deepest + 1),
      deepest,
      coverage,
    };
  }

  function reset() {
    lastGroupCoverage.clear();
    lastTotalCoverage = 0;
  }

  return { extract, reset };
}

export type FeatureTracker = ReturnType<typeof createFeatureTracker>;

export type Milestone = {
  skip: number;
  glyph: number;
  kind: "bloom" | "doubling";
  magnitude: number;
  area: number;
};

export const BLOOM_CELLS = 8;

export function createMilestoneDetector(bloomCells = BLOOM_CELLS) {
  const states = new Map<number, { bloomed: boolean; nextDoubling: number; lastCoverage: number }>();

  function detect(groups: readonly GlyphGroupFeatures[]): Milestone[] {
    const events: Milestone[] = [];
    for (const group of groups) {
      let state = states.get(group.skip);
      if (!state) {
        state = { bloomed: false, nextDoubling: 0, lastCoverage: 0 };
        states.set(group.skip, state);
      }
      const gained = Math.max(0, group.coverage - state.lastCoverage);
      if (!state.bloomed && group.coverage >= bloomCells) {
        state.bloomed = true;
        state.nextDoubling = Math.max(bloomCells * 2, group.coverage * 2);
        events.push({
          skip: group.skip, glyph: group.glyph, kind: "bloom",
          magnitude: Math.min(1, .4 + group.area * .8 + Math.log2(gained + 1) / 12),
          area: group.area,
        });
      } else if (state.bloomed && group.coverage >= state.nextDoubling) {
        events.push({
          skip: group.skip, glyph: group.glyph, kind: "doubling",
          magnitude: Math.min(1, .25 + group.area * .6 + Math.log2(gained + 1) / 14),
          area: group.area,
        });
        state.nextDoubling *= 2;
      }
      state.lastCoverage = group.coverage;
    }
    return events;
  }

  function reset() {
    states.clear();
  }

  return { detect, reset };
}

export type MilestoneDetector = ReturnType<typeof createMilestoneDetector>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/audio-features.test.ts`
Expected: PASS (8 tests). Note the doubling test: bloom at coverage 10 sets `nextDoubling = 20`, so 21 fires and sets 40; 44 fires again.

- [ ] **Step 5: Commit**

```bash
git add lib/audio/features.ts tests/unit/audio-features.test.ts
git commit -m "Add the audio feature pipeline and coverage milestone detector."
```

---

### Task 4: Engine shell (lib/audio/engine.ts)

**Files:**
- Create: `lib/audio/engine.ts`
- Test: `tests/unit/audio-engine.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Pure helpers: `softClipCurve(length?, amount?): Float32Array`, `buildImpulseResponse(sampleRate, seconds?, decayPower?): [Float32Array, Float32Array]`, `nextGridTime(now, gridStart, bpm?, beatsPerStep?): number`, `makeNoiseBuffer(context: BaseAudioContext, seconds?: number): AudioBuffer`, `scheduleCleanup(context: BaseAudioContext, when: number, nodes: AudioNode[], onDone?: () => void): void`.
  - `type EngineMode = "melodic" | "resonant"`, `DEFAULT_BPM = 90`, `TICK_MS = 25`.
  - `type EngineShell = { context: AudioContext; reverbBus: GainNode; gridStart: number; submixFor(mode: EngineMode): GainNode; nextEventTime(quantized: boolean): number; barIndex(): number; onTick(callback: (audioTime: number) => void): () => void; setMode(mode: EngineMode, fadeSeconds?: number): void; mode(): EngineMode; setVolume(volume: number): void; setMuted(muted: boolean): void; dispose(): void }`
  - `createEngineShell(context: AudioContext): EngineShell`.

- [ ] **Step 1: Write the failing test** (pure helpers only — `createEngineShell` needs a browser)

Create `tests/unit/audio-engine.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildImpulseResponse, nextGridTime, softClipCurve } from "../../lib/audio/engine.ts";

test("soft clip curve is bounded, odd-symmetric and monotonic", () => {
  const curve = softClipCurve();
  assert.equal(curve.length, 1024);
  assert.ok(Math.abs(curve[0] + 1) < 1e-6);
  assert.ok(Math.abs(curve[curve.length - 1] - 1) < 1e-6);
  for (let index = 1; index < curve.length; index++) {
    assert.ok(curve[index] >= curve[index - 1]);
  }
});

test("impulse response decays and decorrelates channels", () => {
  const [left, right] = buildImpulseResponse(48000, 1.0);
  assert.equal(left.length, 48000);
  assert.equal(right.length, 48000);
  const rms = (data: Float32Array, start: number, end: number) => {
    let sum = 0;
    for (let index = start; index < end; index++) sum += data[index] * data[index];
    return Math.sqrt(sum / (end - start));
  };
  assert.ok(rms(left, 0, 4800) > rms(left, 43200, 48000) * 4);
  let difference = 0;
  for (let index = 0; index < 4800; index++) difference += Math.abs(left[index] - right[index]);
  assert.ok(difference > 1);
});

test("grid times land on the grid, in the future, monotonically", () => {
  const gridStart = 10;
  const step = 60 / 90 * .5;
  let previous = 10.01;
  for (const now of [10.01, 10.4, 11.2, 12.0, 15.7]) {
    const next = nextGridTime(now, gridStart, 90, .5);
    assert.ok(next > now);
    const offset = (next - gridStart) / step;
    assert.ok(Math.abs(offset - Math.round(offset)) < 1e-6);
    assert.ok(next >= previous);
    previous = next;
  }
});

test("grid time before the grid start still lands on the grid", () => {
  const next = nextGridTime(5, 10, 90, .5);
  assert.ok(next >= 10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/audio-engine.test.ts`
Expected: FAIL — cannot find module `lib/audio/engine.ts`.

- [ ] **Step 3: Create lib/audio/engine.ts**

```ts
/**
 * Shared audio infrastructure: one master bus with soft clipping, a generated
 * impulse-response reverb, a lookahead scheduler, and the crossfade between
 * the two sound engines. Pure helpers live at the top so Node tests can
 * import this module without any browser globals.
 */

export type EngineMode = "melodic" | "resonant";

export const DEFAULT_BPM = 90;
export const TICK_MS = 25;
export const REVERB_SECONDS = 2.2;

export function softClipCurve(length = 1024, amount = 2.35): Float32Array {
  const curve = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const x = index / (length - 1) * 2 - 1;
    curve[index] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

export function buildImpulseResponse(
  sampleRate: number,
  seconds = REVERB_SECONDS,
  decayPower = 2.6,
): [Float32Array, Float32Array] {
  const length = Math.max(1, Math.round(sampleRate * seconds));
  const channels: [Float32Array, Float32Array] = [new Float32Array(length), new Float32Array(length)];
  let state = 0x2fca9d1;
  for (const data of channels) {
    for (let index = 0; index < length; index++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const noise = (state >>> 0) / 2147483648 - 1;
      data[index] = noise * (1 - index / length) ** decayPower;
    }
  }
  return channels;
}

export function nextGridTime(now: number, gridStart: number, bpm = DEFAULT_BPM, beatsPerStep = .5): number {
  const step = 60 / bpm * beatsPerStep;
  const elapsed = Math.max(0, now - gridStart);
  return gridStart + Math.ceil(elapsed / step + 1e-6) * step;
}

/** Shared xorshift noise buffer for splashes, plucks, mallets and bows. */
export function makeNoiseBuffer(context: BaseAudioContext, seconds = .5): AudioBuffer {
  const buffer = context.createBuffer(1, Math.max(1, Math.round(context.sampleRate * seconds)), context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x51f15e;
  for (let index = 0; index < data.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[index] = ((state >>> 0) / 2147483648 - 1) * .6;
  }
  return buffer;
}

/**
 * Disconnects ephemeral note graphs once they finish sounding. A silent
 * ConstantSource acts as the timer so cleanup follows the audio clock.
 */
export function scheduleCleanup(
  context: BaseAudioContext,
  when: number,
  nodes: AudioNode[],
  onDone?: () => void,
): void {
  const janitor = context.createConstantSource();
  janitor.onended = () => {
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    onDone?.();
  };
  janitor.start();
  janitor.stop(when);
}

export type EngineShell = {
  context: AudioContext;
  reverbBus: GainNode;
  gridStart: number;
  submixFor(mode: EngineMode): GainNode;
  nextEventTime(quantized: boolean): number;
  barIndex(): number;
  onTick(callback: (audioTime: number) => void): () => void;
  setMode(mode: EngineMode, fadeSeconds?: number): void;
  mode(): EngineMode;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
};

export function createEngineShell(context: AudioContext): EngineShell {
  const melodicMix = context.createGain();
  const resonantMix = context.createGain();
  const busIn = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const shaper = context.createWaveShaper();
  const masterGain = context.createGain();
  const reverbBus = context.createGain();
  const reverbWet = context.createGain();
  melodicMix.gain.value = 1;
  resonantMix.gain.value = .0001;
  compressor.threshold.value = -27;
  compressor.knee.value = 18;
  compressor.ratio.value = 5;
  shaper.curve = softClipCurve();
  shaper.oversample = "2x";
  masterGain.gain.value = .64;
  reverbWet.gain.value = .3;
  try {
    const [left, right] = buildImpulseResponse(context.sampleRate);
    const impulse = context.createBuffer(2, left.length, context.sampleRate);
    impulse.copyToChannel(left, 0);
    impulse.copyToChannel(right, 1);
    const convolver = context.createConvolver();
    convolver.buffer = impulse;
    reverbBus.connect(convolver).connect(reverbWet).connect(busIn);
  } catch {
    reverbBus.connect(reverbWet).connect(busIn); // dry fallback keeps sends audible
  }
  melodicMix.connect(busIn);
  resonantMix.connect(busIn);
  busIn.connect(compressor).connect(shaper).connect(masterGain).connect(context.destination);

  const gridStart = context.currentTime;
  let mode: EngineMode = "melodic";
  let volume = .8;
  let muted = false;
  const tickCallbacks = new Set<(audioTime: number) => void>();
  const interval = setInterval(() => {
    const now = context.currentTime;
    tickCallbacks.forEach((callback) => callback(now));
  }, TICK_MS);

  function applyMaster() {
    masterGain.gain.setTargetAtTime(
      muted ? .0001 : Math.max(.0001, volume * volume),
      context.currentTime, .05,
    );
  }

  return {
    context,
    reverbBus,
    gridStart,
    submixFor: (which) => which === "melodic" ? melodicMix : resonantMix,
    nextEventTime: (quantized) => quantized
      ? Math.max(context.currentTime + .02, nextGridTime(context.currentTime + .02, gridStart))
      : context.currentTime + .005,
    barIndex: () => Math.floor(Math.max(0, context.currentTime - gridStart) / (60 / DEFAULT_BPM * 4)),
    onTick(callback) {
      tickCallbacks.add(callback);
      return () => tickCallbacks.delete(callback);
    },
    setMode(next, fadeSeconds = .5) {
      mode = next;
      const tau = Math.max(.005, fadeSeconds / 3);
      melodicMix.gain.setTargetAtTime(next === "melodic" ? 1 : .0001, context.currentTime, tau);
      resonantMix.gain.setTargetAtTime(next === "resonant" ? 1 : .0001, context.currentTime, tau);
    },
    mode: () => mode,
    setVolume(next) {
      volume = Math.max(0, Math.min(1, next));
      applyMaster();
    },
    setMuted(next) {
      muted = next;
      applyMaster();
    },
    dispose() {
      clearInterval(interval);
      tickCallbacks.clear();
      try { masterGain.disconnect(); } catch { /* already gone */ }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/audio-engine.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/audio/engine.ts tests/unit/audio-engine.test.ts
git commit -m "Add the shared audio engine shell with reverb, scheduler, and crossfade."
```

---

### Task 5: Melodic engine (lib/audio/melodic.ts)

**Files:**
- Create: `lib/audio/melodic.ts`
- Test: `tests/unit/audio-melodic.test.ts`

**Interfaces:**
- Consumes: `EngineShell`, `scheduleCleanup`, `makeNoiseBuffer` from `./engine.ts`; `FeatureFrame`, `GlyphGroupFeatures`, `Milestone` from `./features.ts`; `Palette`, `degreeToFrequency`, `chordForBar`, `snapToChord`, `GLYPH_DEGREE_OFFSET` from `./theory.ts`.
- Produces:
  - Pure: `type MelodicMacros = { brightness; warmth; motion; space; level: number }`, `computeMacros(frame: FeatureFrame): MelodicMacros`, `arpDegree(group: GlyphGroupFeatures, scaleLength: number): number`, `wavePartials(kind: "warm" | "glass"): { real: Float32Array; imag: Float32Array }`.
  - `type MelodicEngine = { setPalette(palette: Palette): void; throwStart(): void; splash(skipIndex: number, glyph: number, panPosition: number): void; milestone(event: Milestone): void; update(frame: FeatureFrame, resolving: boolean): void; silence(): void; finish(scoreRatio: number): void; reset(): void }` — Task 6's `ResonantEngine` has the identical method set, and Task 7 relies on that.
  - `createMelodicEngine(shell: EngineShell): MelodicEngine`.

- [ ] **Step 1: Write the failing test** (pure helpers only)

Create `tests/unit/audio-melodic.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { arpDegree, computeMacros, wavePartials } from "../../lib/audio/melodic.ts";
import type { FeatureFrame, GlyphGroupFeatures } from "../../lib/audio/features.ts";

function makeGroup(overrides: Partial<GlyphGroupFeatures> = {}): GlyphGroupFeatures {
  return {
    skip: 1, glyph: 0, area: 0.3, spread: 0.5, elongation: 0.2, orientation: 0,
    density: 0.5, centroidX: 0, centroidY: 0, zAngle: 0, zRadius: 0.3,
    coverage: 40, coverageMotion: 5, presence: 0.5, activity: 0.4, deepest: 500,
    ...overrides,
  };
}

function makeFrame(overrides: Partial<FeatureFrame> = {}): FeatureFrame {
  return {
    landing: { cr: -0.6, ci: 0.2 }, groups: [makeGroup()], glyphCount: 1,
    activeRatio: 0.8, dispersion: 0.2, chaos: 0.3, growth: 0.4,
    contraction: 0.1, proximity: 0.2, depthBand: 9, deepest: 500, coverage: 40,
    ...overrides,
  };
}

test("macros stay inside 0..1 across extreme frames", () => {
  for (const frame of [
    makeFrame(),
    makeFrame({ groups: [], glyphCount: 0, activeRatio: 0, chaos: 0, growth: 0, proximity: 0, dispersion: 0 }),
    makeFrame({ chaos: 1, growth: 1, proximity: 1, dispersion: 1, activeRatio: 1, glyphCount: 7 }),
  ]) {
    const macros = computeMacros(frame);
    for (const value of Object.values(macros)) {
      assert.ok(value >= 0 && value <= 1, `macro out of range: ${JSON.stringify(macros)}`);
    }
  }
});

test("brighter shapes raise the brightness macro", () => {
  const dull = computeMacros(makeFrame({ groups: [makeGroup({ spread: 0.05, density: 0.1 })], proximity: 0 }));
  const bright = computeMacros(makeFrame({ groups: [makeGroup({ spread: 0.9, density: 0.9 })], proximity: 0.8 }));
  assert.ok(bright.brightness > dull.brightness);
});

test("chaos lowers warmth", () => {
  const calm = computeMacros(makeFrame({ chaos: 0 }));
  const wild = computeMacros(makeFrame({ chaos: 1 }));
  assert.ok(calm.warmth > wild.warmth);
});

test("arp degrees follow orbit angle and differ per glyph", () => {
  const low = arpDegree(makeGroup({ zAngle: -Math.PI, zRadius: 0 }), 5);
  const high = arpDegree(makeGroup({ zAngle: Math.PI * 0.9, zRadius: 1 }), 5);
  assert.ok(high > low);
  const glyphA = arpDegree(makeGroup({ glyph: 0 }), 5);
  const glyphB = arpDegree(makeGroup({ glyph: 6 }), 5);
  assert.notEqual(glyphA, glyphB);
});

test("wave partials: warm rolls off, glass is sparse, DC and fundamental sane", () => {
  const warm = wavePartials("warm");
  const glass = wavePartials("glass");
  assert.equal(warm.imag[0], 0);
  assert.equal(glass.imag[0], 0);
  assert.equal(warm.imag[1], 1);
  assert.ok(warm.imag[2] < warm.imag[1]);
  const glassNonZero = Array.from(glass.imag).filter((value) => value > 0).length;
  assert.ok(glassNonZero >= 3 && glassNonZero < warm.imag.length - 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/audio-melodic.test.ts`
Expected: FAIL — cannot find module `lib/audio/melodic.ts`.

- [ ] **Step 3: Create lib/audio/melodic.ts**

```ts
/**
 * The Melodic engine: a macro-controlled wavetable bed under a quantized
 * event layer. Each sacred glyph owns a signature instrument patch, orbit
 * groups run generative arpeggios, and coverage milestones trigger chord
 * swells so big early forms land as big musical moments.
 */
import {
  makeNoiseBuffer,
  scheduleCleanup,
  type EngineShell,
} from "./engine.ts";
import type { FeatureFrame, GlyphGroupFeatures, Milestone } from "./features.ts";
import {
  chordForBar,
  degreeToFrequency,
  GLYPH_DEGREE_OFFSET,
  snapToChord,
  type Palette,
} from "./theory.ts";

export type MelodicMacros = {
  brightness: number;
  warmth: number;
  motion: number;
  space: number;
  level: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function computeMacros(frame: FeatureFrame): MelodicMacros {
  const groups = frame.groups;
  const mean = (select: (group: GlyphGroupFeatures) => number) =>
    groups.length ? groups.reduce((sum, group) => sum + select(group), 0) / groups.length : 0;
  const spread = mean((group) => group.spread);
  const density = mean((group) => group.density);
  return {
    brightness: clamp01(spread * .8 + density * .4 + frame.proximity * .35),
    warmth: clamp01(1 - frame.chaos * .7),
    motion: clamp01(frame.chaos * .5 + frame.dispersion * .6),
    space: clamp01(spread * .5 + frame.glyphCount / 7 * .5),
    level: clamp01(.15 + frame.activeRatio * .45 + frame.growth * .4),
  };
}

/** Buckets a group's live mean orbit position into a scale degree. */
export function arpDegree(group: GlyphGroupFeatures, scaleLength: number): number {
  const angleUnit = group.zAngle / (Math.PI * 2) + .5;
  return Math.round(
    angleUnit * scaleLength * 2
    + group.zRadius * scaleLength
    + GLYPH_DEGREE_OFFSET[group.glyph % GLYPH_DEGREE_OFFSET.length],
  );
}

export function wavePartials(kind: "warm" | "glass"): { real: Float32Array; imag: Float32Array } {
  const count = 9;
  const real = new Float32Array(count);
  const imag = new Float32Array(count);
  for (let partial = 1; partial < count; partial++) {
    if (kind === "warm") {
      imag[partial] = 1 / partial ** 1.7;
    } else {
      imag[partial] = partial === 1 ? 1 : partial === 2 ? .38 : partial === 4 ? .22 : partial === 7 ? .1 : 0;
    }
  }
  return { real, imag };
}

export type MelodicEngine = {
  setPalette(palette: Palette): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  milestone(event: Milestone): void;
  update(frame: FeatureFrame, resolving: boolean): void;
  silence(): void;
  finish(scoreRatio: number): void;
  reset(): void;
};

const MAX_NOTES = 24;

export function createMelodicEngine(shell: EngineShell): MelodicEngine {
  const context = shell.context;
  const output = shell.submixFor("melodic");
  const noteBus = context.createGain();
  const noteSend = context.createGain();
  noteBus.connect(output);
  noteBus.connect(noteSend).connect(shell.reverbBus);
  noteSend.gain.value = .18;
  const noiseBuffer = makeNoiseBuffer(context);

  // ----- bed ------------------------------------------------------------
  const warmTable = wavePartials("warm");
  const glassTable = wavePartials("glass");
  const warmWave = context.createPeriodicWave(warmTable.real, warmTable.imag);
  const glassWave = context.createPeriodicWave(glassTable.real, glassTable.imag);
  const bedFilter = context.createBiquadFilter();
  bedFilter.type = "lowpass";
  bedFilter.frequency.value = 500;
  bedFilter.Q.value = .7;
  const bedGain = context.createGain();
  bedGain.gain.value = .0001;
  const bedSend = context.createGain();
  bedSend.gain.value = .0001;
  const lfo = context.createOscillator();
  lfo.frequency.value = .25;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(bedGain.gain);
  bedFilter.connect(bedGain).connect(output);
  bedGain.connect(bedSend).connect(shell.reverbBus);
  const bedVoices = [0, 2].map((degree) => {
    const warmOsc = context.createOscillator();
    const glassOsc = context.createOscillator();
    warmOsc.setPeriodicWave(warmWave);
    glassOsc.setPeriodicWave(glassWave);
    const warmGain = context.createGain();
    const glassGain = context.createGain();
    warmGain.gain.value = .5;
    glassGain.gain.value = .2;
    warmOsc.connect(warmGain).connect(bedFilter);
    glassOsc.connect(glassGain).connect(bedFilter);
    warmOsc.start();
    glassOsc.start();
    return { degree, warmOsc, glassOsc, warmGain, glassGain };
  });
  lfo.start();

  let palette: Palette | null = null;
  let lastFrame: FeatureFrame | null = null;
  let activeNotes = 0;
  const nextArpAt = new Map<number, number>();

  // ----- note plumbing ----------------------------------------------------
  function noiseSource(when: number, seconds: number): AudioBufferSourceNode {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = seconds > noiseBuffer.duration;
    source.start(when);
    source.stop(when + seconds);
    return source;
  }

  function envelope(when: number, attack: number, peak: number, decay: number): GainNode {
    const gain = context.createGain();
    const rise = Math.max(.003, attack);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), when + rise);
    gain.gain.exponentialRampToValueAtTime(.0001, when + rise + decay);
    return gain;
  }

  function notePanner(position: number): StereoPannerNode {
    const pan = context.createStereoPanner();
    pan.pan.value = Math.max(-.85, Math.min(.85, position));
    return pan;
  }

  /** One glyph note: builds an ephemeral patch graph and self-cleans. */
  function playNote(glyph: number, degree: number, velocity: number, when: number, position: number) {
    if (!palette || activeNotes >= MAX_NOTES) return;
    activeNotes += 1;
    const scaleLength = palette.steps.length;
    const frequency = degreeToFrequency(palette, degree);
    const pan = notePanner(position);
    pan.connect(noteBus);
    const cleanup: AudioNode[] = [pan];
    let tail = 2;
    switch (glyph % 7) {
      case 0: { // concentric halo — warm two-operator FM bell
        const carrier = context.createOscillator();
        const modulator = context.createOscillator();
        const modGain = context.createGain();
        carrier.frequency.value = frequency;
        modulator.frequency.value = frequency * 3.007;
        modGain.gain.setValueAtTime(frequency * 1.6 * velocity, when);
        modGain.gain.exponentialRampToValueAtTime(1, when + .55);
        modulator.connect(modGain).connect(carrier.frequency);
        const env = envelope(when, .004, velocity * .11, 1.3);
        carrier.connect(env).connect(pan);
        carrier.start(when);
        modulator.start(when);
        carrier.stop(when + 1.6);
        modulator.stop(when + 1.6);
        cleanup.push(carrier, modulator, modGain, env);
        tail = 1.8;
        break;
      }
      case 1: { // triangle mandala — Karplus-Strong pluck
        const burst = noiseSource(when, .02);
        const delay = context.createDelay(.05);
        delay.delayTime.value = 1 / Math.min(880, frequency);
        const loopFilter = context.createBiquadFilter();
        loopFilter.type = "lowpass";
        loopFilter.frequency.value = 3800;
        const feedback = context.createGain();
        feedback.gain.setValueAtTime(.93, when);
        feedback.gain.linearRampToValueAtTime(0, when + 1.2);
        const env = envelope(when, .003, velocity * .14, 1.0);
        burst.connect(delay);
        delay.connect(loopFilter).connect(feedback).connect(delay);
        delay.connect(env).connect(pan);
        cleanup.push(burst, delay, loopFilter, feedback, env);
        tail = 1.5;
        break;
      }
      case 2: { // vesica piscis — detuned supersaw pad
        const env = envelope(when, .22, velocity * .05, 1.5);
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, when);
        filter.frequency.exponentialRampToValueAtTime(320 + 1400 * velocity, when + .5);
        filter.frequency.exponentialRampToValueAtTime(360, when + 1.7);
        filter.connect(env).connect(pan);
        for (const cents of [-8, 0, 8]) {
          const osc = context.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.value = frequency;
          osc.detune.value = cents;
          osc.connect(filter);
          osc.start(when);
          osc.stop(when + 1.9);
          cleanup.push(osc);
        }
        cleanup.push(filter, env);
        tail = 2.1;
        break;
      }
      case 3: { // four-petal rose — glassy additive chime
        [1, 2.76, 5.40, 8.93].forEach((ratio, index) => {
          const partial = context.createOscillator();
          partial.frequency.value = Math.min(6000, frequency * ratio);
          const env = envelope(when + index * .008, .003, velocity * .07 / (index + 1), .5 + .6 / (index + 1));
          partial.connect(env).connect(pan);
          partial.start(when + index * .008);
          partial.stop(when + 1.4);
          cleanup.push(partial, env);
        });
        tail = 1.6;
        break;
      }
      case 4: { // pentagram — five-note rolling pluck
        [0, 2, 4, 5, 7].forEach((offset, index) => {
          const osc = context.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = degreeToFrequency(palette!, degree + offset);
          const env = envelope(when + index * .055, .004, velocity * .09, .38);
          osc.connect(env).connect(pan);
          osc.start(when + index * .055);
          osc.stop(when + index * .055 + .5);
          cleanup.push(osc, env);
        });
        tail = 1.0;
        break;
      }
      case 5: { // hexagram — formant-filtered square lead
        const osc = context.createOscillator();
        osc.type = "square";
        osc.frequency.value = frequency;
        const env = envelope(when, .035, velocity * .05, .6);
        for (const formant of [700, 1080]) {
          const band = context.createBiquadFilter();
          band.type = "bandpass";
          band.frequency.value = formant;
          band.Q.value = 8;
          osc.connect(band).connect(env);
          cleanup.push(band);
        }
        env.connect(pan);
        osc.start(when);
        osc.stop(when + .8);
        cleanup.push(osc, env);
        tail = 1.0;
        break;
      }
      default: { // flower of life — seven-partial shimmer
        const offsets = [0, scaleLength, scaleLength + 2, scaleLength + 4,
          2 * scaleLength, 2 * scaleLength + 2, 3 * scaleLength];
        offsets.forEach((offset, index) => {
          const osc = context.createOscillator();
          osc.frequency.value = degreeToFrequency(palette!, degree + offset);
          const env = envelope(when, .6 + index * .06, velocity * .02, 2.2);
          osc.connect(env).connect(pan);
          osc.start(when);
          osc.stop(when + 3.2);
          cleanup.push(osc, env);
        });
        tail = 3.4;
        break;
      }
    }
    scheduleCleanup(context, when + tail, cleanup, () => { activeNotes = Math.max(0, activeNotes - 1); });
  }

  // ----- generative arpeggios on the shared grid -------------------------
  // The tick registration lives as long as the shell; the facade disposes
  // the shell (and with it this tick) on destroy.
  shell.onTick((audioTime) => {
    if (!palette || !lastFrame) return;
    const chord = chordForBar(shell.barIndex());
    const scaleLength = palette.steps.length;
    for (const group of lastFrame.groups) {
      if (group.activity < .05 || group.coverage === 0) continue;
      if (audioTime < (nextArpAt.get(group.skip) || 0)) continue;
      const when = shell.nextEventTime(true);
      const octaveLift = Math.min(2, Math.floor(Math.log2(group.deepest + 1) / 7)) * scaleLength;
      const degree = snapToChord(arpDegree(group, scaleLength) + octaveLift, chord, scaleLength);
      playNote(group.glyph, degree, .18 + group.activity * .5, when, group.centroidX * .7);
      const interval = 1.5 - Math.min(1.28, group.activity * 1.35 + (lastFrame.growth || 0) * .3);
      nextArpAt.set(group.skip, when + interval);
    }
  });

  return {
    setPalette(next) {
      palette = next;
    },
    throwStart() {
      // Soft rising whoosh: filtered noise straight into the reverb.
      const when = context.currentTime + .005;
      const source = noiseSource(when, .35);
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 1.4;
      filter.frequency.setValueAtTime(300, when);
      filter.frequency.exponentialRampToValueAtTime(900, when + .3);
      const env = envelope(when, .12, .02, .25);
      source.connect(filter).connect(env).connect(shell.reverbBus);
      scheduleCleanup(context, when + .8, [source, filter, env]);
    },
    splash(skipIndex, glyph, panPosition) {
      if (!palette) return;
      const chord = chordForBar(shell.barIndex());
      const scaleLength = palette.steps.length;
      const when = shell.nextEventTime(true);
      playNote(glyph, snapToChord(2 + skipIndex, chord, scaleLength), .45 + Math.min(.3, skipIndex * .03), when, panPosition);
      const source = noiseSource(when, .18);
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 500 + skipIndex * 90;
      filter.Q.value = 1.2;
      const env = envelope(when, .004, .04, .16);
      const pan = notePanner(panPosition);
      source.connect(filter).connect(env).connect(pan).connect(noteBus);
      scheduleCleanup(context, when + .5, [source, filter, env, pan]);
    },
    milestone(event) {
      if (!palette) return;
      const chord = chordForBar(shell.barIndex());
      const scaleLength = palette.steps.length;
      const when = shell.nextEventTime(true);
      const rootDegree = snapToChord(GLYPH_DEGREE_OFFSET[event.glyph % 7], chord, scaleLength);
      if (event.kind === "bloom") {
        // The glyph announces itself with its signature patch as it first blooms.
        playNote(event.glyph, rootDegree + scaleLength, .4 + event.magnitude * .5, when, 0);
      }
      // Harmonic glue: a quiet supersaw swell voices the current chord.
      chord.slice(0, 3).forEach((tone, index) => {
        playNote(2, tone + (index === 0 ? 0 : scaleLength), .16 + event.magnitude * .4, when, (index - 1) * .4);
      });
      if (event.magnitude > .45) {
        const boom = context.createOscillator();
        const env = envelope(when, .01, event.magnitude * .14, .7);
        boom.frequency.value = Math.max(32, degreeToFrequency(palette, rootDegree - scaleLength * 2, 200));
        boom.connect(env).connect(noteBus);
        boom.start(when);
        boom.stop(when + .9);
        scheduleCleanup(context, when + 1, [boom, env]);
      }
    },
    update(frame, resolving) {
      lastFrame = frame;
      if (!palette) return;
      const macros = computeMacros(frame);
      const at = context.currentTime;
      const scaleLength = palette.steps.length;
      for (const voice of bedVoices) {
        const frequency = degreeToFrequency(palette, voice.degree - scaleLength);
        voice.warmOsc.frequency.setTargetAtTime(frequency, at, .12);
        voice.glassOsc.frequency.setTargetAtTime(frequency, at, .12);
        voice.warmGain.gain.setTargetAtTime(.25 + macros.warmth * .45, at, .2);
        voice.glassGain.gain.setTargetAtTime(.12 + (1 - macros.warmth) * .4, at, .2);
      }
      bedFilter.frequency.setTargetAtTime(180 * 2 ** (macros.brightness * 3.6), at, .15);
      lfo.frequency.setTargetAtTime(.1 + macros.motion * 1.3, at, .3);
      const bedLevel = macros.level * .045 * (resolving ? .76 : 1);
      lfoGain.gain.setTargetAtTime(bedLevel * .3 * macros.motion, at, .25);
      bedGain.gain.setTargetAtTime(Math.max(.0001, bedLevel), at, .18);
      bedSend.gain.setTargetAtTime(macros.space * .3, at, .3);
    },
    silence() {
      lastFrame = null;
      bedGain.gain.setTargetAtTime(.0001, context.currentTime, .1);
      lfoGain.gain.setTargetAtTime(0, context.currentTime, .1);
    },
    finish(scoreRatio) {
      if (!palette) return;
      const chord = chordForBar(shell.barIndex());
      const scaleLength = palette.steps.length;
      [0, 1, 2].forEach((index) => {
        const when = shell.nextEventTime(true) + index * .12;
        const tone = chord[index % chord.length] + (index === 2 ? scaleLength : 0);
        playNote(0, tone, .3 + scoreRatio * .3, when, (index - 1) * .3);
      });
    },
    reset() {
      palette = null;
      lastFrame = null;
      nextArpAt.clear();
      bedGain.gain.setTargetAtTime(.0001, context.currentTime, .1);
      lfoGain.gain.setTargetAtTime(0, context.currentTime, .1);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/audio-melodic.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: PASS (no unused variables — see the `stopTick` note above).

- [ ] **Step 6: Commit**

```bash
git add lib/audio/melodic.ts tests/unit/audio-melodic.test.ts
git commit -m "Add the melodic sound engine with glyph patches, arps, and milestone swells."
```

---

### Task 6: Resonant engine (lib/audio/modal.ts)

**Files:**
- Create: `lib/audio/modal.ts`
- Test: `tests/unit/audio-modal.test.ts`

**Interfaces:**
- Consumes: `EngineShell`, `scheduleCleanup`, `makeNoiseBuffer` from `./engine.ts`; `FeatureFrame`, `Milestone` from `./features.ts`; `Palette`, `degreeToFrequency`, `GLYPH_DEGREE_OFFSET` from `./theory.ts`.
- Produces: `MODAL_RATIOS: readonly (readonly number[])[]` (7 entries), `MODE_Q = 26`, `type ResonantEngine` (identical method set to `MelodicEngine`), `createResonantEngine(shell: EngineShell): ResonantEngine`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/audio-modal.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { MODAL_RATIOS } from "../../lib/audio/modal.ts";

test("every glyph has a well-formed modal ratio set", () => {
  assert.equal(MODAL_RATIOS.length, 7);
  for (const ratios of MODAL_RATIOS) {
    assert.ok(ratios.length >= 6, "at least six modes");
    assert.equal(ratios[0], 1, "fundamental first");
    for (let index = 1; index < ratios.length; index++) {
      assert.ok(ratios[index] > ratios[index - 1], "strictly increasing");
    }
    assert.ok(ratios[ratios.length - 1] <= 4.2, "modes stay under ~4x the root");
  }
});

test("glyph geometries differ audibly (no two ratio sets equal)", () => {
  for (let a = 0; a < MODAL_RATIOS.length; a++) {
    for (let b = a + 1; b < MODAL_RATIOS.length; b++) {
      assert.notDeepEqual(MODAL_RATIOS[a], MODAL_RATIOS[b]);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/audio-modal.test.ts`
Expected: FAIL — cannot find module `lib/audio/modal.ts`.

- [ ] **Step 3: Create lib/audio/modal.ts**

```ts
/**
 * The Resonant engine: each sacred glyph is a physical body. Its geometry
 * picks the modal frequency ratios of a bandpass resonator bank; splashes
 * strike it, iterating orbits strum it with grain taps, and blooming forms
 * bow it into a singing-bowl swell.
 */
import {
  makeNoiseBuffer,
  scheduleCleanup,
  type EngineShell,
} from "./engine.ts";
import type { FeatureFrame, Milestone } from "./features.ts";
import { degreeToFrequency, GLYPH_DEGREE_OFFSET, type Palette } from "./theory.ts";

/**
 * Mode frequency ratios per glyph. Circle modes follow drumhead Bessel
 * ratios; polygons use plate-like series; the vesica and rose split near-
 * degenerate pairs; the flower stacks detuned harmonic shells.
 */
export const MODAL_RATIOS: readonly (readonly number[])[] = [
  [1, 1.593, 2.135, 2.295, 2.917, 3.598],        // 0 concentric halo — circular drumhead
  [1, 1.732, 2.0, 2.646, 3.0, 3.606],            // 1 triangle mandala — triangular plate
  [1, 1.042, 1.593, 1.659, 2.135, 2.224],        // 2 vesica piscis — two coupled detuned circles
  [1, 1.583, 1.603, 2.283, 2.307, 2.917],        // 3 four-petal rose — split degenerate pairs
  [1, 1.512, 1.902, 2.288, 2.618, 3.077],        // 4 pentagram — pentagonal plate
  [1, 1.688, 1.732, 2.598, 2.646, 3.464],        // 5 hexagram — two overlaid triangles
  [1, 1.993, 2.007, 2.986, 3.0, 3.014, 3.982],   // 6 flower of life — hex lattice shells
];

export const MODE_Q = 26;

export type ResonantEngine = {
  setPalette(palette: Palette): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  milestone(event: Milestone): void;
  update(frame: FeatureFrame, resolving: boolean): void;
  silence(): void;
  finish(scoreRatio: number): void;
  reset(): void;
};

export function createResonantEngine(shell: EngineShell): ResonantEngine {
  const context = shell.context;
  const output = shell.submixFor("resonant");
  const noiseBuffer = makeNoiseBuffer(context);

  const banks = MODAL_RATIOS.map((ratios) => {
    const input = context.createGain();
    const bankOut = context.createGain();
    const pan = context.createStereoPanner();
    const send = context.createGain();
    bankOut.gain.value = .0001;
    send.gain.value = .12;
    const filters = ratios.map((ratio, index) => {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 220 * ratio;
      filter.Q.value = MODE_Q;
      const modeGain = context.createGain();
      modeGain.gain.value = 1 / (1 + index * .35);
      input.connect(filter).connect(modeGain).connect(bankOut);
      return filter;
    });
    bankOut.connect(pan).connect(output);
    pan.connect(send).connect(shell.reverbBus);
    // Bow chain: looped noise, gated by bowGain, bandpassed near the root.
    const bowSource = context.createBufferSource();
    bowSource.buffer = noiseBuffer;
    bowSource.loop = true;
    const bowFilter = context.createBiquadFilter();
    bowFilter.type = "bandpass";
    bowFilter.frequency.value = 220;
    bowFilter.Q.value = 2;
    const bowGain = context.createGain();
    bowGain.gain.value = .0001;
    bowSource.connect(bowFilter).connect(bowGain).connect(input);
    bowSource.start();
    return { input, bankOut, pan, send, filters, bowFilter, bowGain, root: 220, ratios };
  });

  function strike(glyph: number, velocity: number, when: number) {
    const bank = banks[glyph % banks.length];
    const burst = context.createBufferSource();
    burst.buffer = noiseBuffer;
    burst.start(when);
    burst.stop(when + .025);
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 300;
    const burstGain = context.createGain();
    burstGain.gain.setValueAtTime(velocity * .9, when);
    burstGain.gain.exponentialRampToValueAtTime(.0001, when + .05);
    burst.connect(highpass).connect(burstGain).connect(bank.input);
    // Mallet thump under the bank, straight to the submix.
    const thump = context.createOscillator();
    thump.frequency.setValueAtTime(130, when);
    thump.frequency.exponentialRampToValueAtTime(50, when + .2);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(.0001, when);
    thumpGain.gain.exponentialRampToValueAtTime(velocity * .2, when + .012);
    thumpGain.gain.exponentialRampToValueAtTime(.0001, when + .24);
    thump.connect(thumpGain).connect(output);
    thump.start(when);
    thump.stop(when + .3);
    scheduleCleanup(context, when + .6, [burst, highpass, burstGain, thump, thumpGain]);
  }

  function tap(glyph: number, velocity: number, when: number) {
    const bank = banks[glyph % banks.length];
    const blip = context.createBufferSource();
    blip.buffer = noiseBuffer;
    blip.start(when, Math.random() * .3);
    blip.stop(when + .006);
    const blipGain = context.createGain();
    blipGain.gain.value = velocity * .25;
    blip.connect(blipGain).connect(bank.input);
    scheduleCleanup(context, when + .3, [blip, blipGain]);
  }

  function bow(glyph: number, magnitude: number) {
    const bank = banks[glyph % banks.length];
    const at = context.currentTime;
    bank.bowGain.gain.cancelScheduledValues(at);
    bank.bowGain.gain.setValueAtTime(Math.max(.0001, bank.bowGain.gain.value), at);
    bank.bowGain.gain.linearRampToValueAtTime(magnitude * .2, at + .6);
    bank.bowGain.gain.setTargetAtTime(.0001, at + .9, .9);
  }

  return {
    setPalette(next) {
      const at = context.currentTime;
      banks.forEach((bank, glyph) => {
        const root = Math.max(110, Math.min(440,
          degreeToFrequency(next, GLYPH_DEGREE_OFFSET[glyph % GLYPH_DEGREE_OFFSET.length])));
        bank.root = root;
        bank.filters.forEach((filter, index) => {
          filter.frequency.setTargetAtTime(root * bank.ratios[index], at, .1);
        });
        bank.bowFilter.frequency.setTargetAtTime(root, at, .1);
      });
    },
    throwStart() {
      const when = context.currentTime + .005;
      const source = context.createBufferSource();
      source.buffer = noiseBuffer;
      source.start(when);
      source.stop(when + .3);
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(700, when);
      filter.frequency.exponentialRampToValueAtTime(250, when + .28);
      const gain = context.createGain();
      gain.gain.setValueAtTime(.02, when);
      gain.gain.exponentialRampToValueAtTime(.0001, when + .3);
      source.connect(filter).connect(gain).connect(shell.reverbBus);
      scheduleCleanup(context, when + .8, [source, filter, gain]);
    },
    splash(skipIndex, glyph, panPosition) {
      const bank = banks[glyph % banks.length];
      bank.pan.pan.setTargetAtTime(Math.max(-.85, Math.min(.85, panPosition)), context.currentTime, .05);
      strike(glyph, .45 + Math.min(.3, skipIndex * .02), shell.nextEventTime(false));
    },
    milestone(event) {
      bow(event.glyph, event.magnitude);
      if (event.kind === "bloom") strike(event.glyph, .3 + event.magnitude * .4, shell.nextEventTime(false));
    },
    update(frame, resolving) {
      const at = context.currentTime;
      const damp = resolving ? .76 : 1;
      const active = new Set(frame.groups.map((group) => group.glyph % banks.length));
      frame.groups.forEach((group) => {
        const bank = banks[group.glyph % banks.length];
        bank.bankOut.gain.setTargetAtTime((.0001 + group.presence * .12) * damp, at, .12);
        bank.pan.pan.setTargetAtTime(Math.max(-.85, Math.min(.85, group.centroidX * .7)), at, .15);
        bank.send.gain.setTargetAtTime(.06 + group.spread * .25, at, .2);
        // Iteration strums the body: expected taps this frame from activity.
        const expected = group.activity * 14 * .042;
        const taps = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
        for (let index = 0; index < taps; index++) {
          tap(group.glyph, .1 + group.activity * .3, shell.nextEventTime(false) + Math.random() * .03);
        }
      });
      banks.forEach((bank, glyph) => {
        if (!active.has(glyph)) bank.bankOut.gain.setTargetAtTime(.0001, at, .12);
      });
    },
    silence() {
      const at = context.currentTime;
      for (const bank of banks) {
        bank.bankOut.gain.setTargetAtTime(.0001, at, .15);
        bank.bowGain.gain.setTargetAtTime(.0001, at, .15);
      }
    },
    finish(scoreRatio) {
      banks.forEach((bank, glyph) => {
        if (bank.bankOut.gain.value > .001) {
          strike(glyph, .2 + scoreRatio * .3, shell.nextEventTime(false) + glyph * .07);
        }
      });
    },
    reset() {
      // Bank roots persist until the next setPalette; just quiet everything.
      const at = context.currentTime;
      for (const bank of banks) {
        bank.bankOut.gain.setTargetAtTime(.0001, at, .1);
        bank.bowGain.gain.setTargetAtTime(.0001, at, .1);
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/audio-modal.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/audio/modal.ts tests/unit/audio-modal.test.ts
git commit -m "Add the resonant sound engine with geometry-derived modal banks."
```

---

### Task 7: GameAudio facade (lib/audio/index.ts)

**Files:**
- Create: `lib/audio/index.ts`
- Test: `tests/unit/audio-index.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces (this is the ONLY audio API the component uses):

```ts
export type GamePhase = "ready" | "aiming" | "flying" | "resolving" | "result";
export type SoundEngineMode = "melodic" | "resonant";
export type { OrbitFeatureInput } from "./features.ts";
export type GameAudio = {
  init(): void;
  setMode(mode: SoundEngineMode): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  update(orbits: readonly OrbitFeatureInput[], phase: GamePhase, nowMs: number): void;
  finish(scoreRatio: number): void;
  reset(): void;
  destroy(): void;
};
export function createGameAudio(initialMode?: SoundEngineMode): GameAudio;
```

- [ ] **Step 1: Write the failing test** (the no-throw contract in Node, where `AudioContext` does not exist)

Create `tests/unit/audio-index.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createGameAudio, type OrbitFeatureInput } from "../../lib/audio/index.ts";

const orbit: OrbitFeatureInput = {
  skip: 1, glyph: 0, zr: 0.3, zi: 0.1, cr: -0.6, ci: 0.2,
  shownDepth: 100, stepDistance: 0.01, distanceContraction: 0.2, resolved: false,
  distinct: 10, sumX: 150, sumY: 160, sumXX: 2350, sumYY: 2660, sumXY: 2400,
};

test("every GameAudio method is a safe no-op without an AudioContext", () => {
  const audio = createGameAudio();
  assert.doesNotThrow(() => {
    audio.init();
    audio.setMode("resonant");
    audio.setVolume(0.5);
    audio.setMuted(true);
    audio.throwStart();
    audio.splash(1, 0, 0);
    audio.update([orbit], "flying", 1000);
    audio.update([], "ready", 1042);
    audio.finish(0.5);
    audio.reset();
    audio.destroy();
  });
});

test("createGameAudio accepts an initial mode", () => {
  assert.doesNotThrow(() => createGameAudio("resonant"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/unit/audio-index.test.ts`
Expected: FAIL — cannot find module `lib/audio/index.ts`.

- [ ] **Step 3: Create lib/audio/index.ts**

```ts
/**
 * GameAudio: the one audio object the game component talks to. Owns the
 * lazy AudioContext, the two engines, the feature tracker, the milestone
 * detector, and the per-round palette. Every method is no-throw — audio
 * is strictly optional and silently degrades.
 */
import { createEngineShell, type EngineShell } from "./engine.ts";
import {
  createFeatureTracker,
  createMilestoneDetector,
  type OrbitFeatureInput,
} from "./features.ts";
import { createMelodicEngine, type MelodicEngine } from "./melodic.ts";
import { createResonantEngine, type ResonantEngine } from "./modal.ts";
import { paletteFromLanding, type Palette } from "./theory.ts";

export type GamePhase = "ready" | "aiming" | "flying" | "resolving" | "result";
export type SoundEngineMode = "melodic" | "resonant";
export type { OrbitFeatureInput } from "./features.ts";

export type GameAudio = {
  init(): void;
  setMode(mode: SoundEngineMode): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  update(orbits: readonly OrbitFeatureInput[], phase: GamePhase, nowMs: number): void;
  finish(scoreRatio: number): void;
  reset(): void;
  destroy(): void;
};

const UPDATE_INTERVAL_MS = 42;

export function createGameAudio(initialMode: SoundEngineMode = "melodic"): GameAudio {
  let shell: EngineShell | null = null;
  let melodic: MelodicEngine | null = null;
  let resonant: ResonantEngine | null = null;
  let mode: SoundEngineMode = initialMode;
  let volume = .8;
  let muted = false;
  let palette: Palette | null = null;
  let lastUpdate = 0;
  let pendingSplashes: Array<{ skipIndex: number; glyph: number; panPosition: number }> = [];
  const tracker = createFeatureTracker();
  const milestones = createMilestoneDetector();

  function ensureShell(): EngineShell | null {
    if (shell) {
      if (shell.context.state === "suspended") void shell.context.resume();
      return shell;
    }
    if (typeof AudioContext === "undefined") return null;
    shell = createEngineShell(new AudioContext());
    shell.setMode(mode, .001);
    shell.setVolume(volume);
    shell.setMuted(muted);
    return shell;
  }

  function activeEngine(): MelodicEngine | ResonantEngine | null {
    const current = shell;
    if (!current) return null;
    if (mode === "melodic") {
      if (!melodic) {
        melodic = createMelodicEngine(current);
        if (palette) melodic.setPalette(palette);
      }
      return melodic;
    }
    if (!resonant) {
      resonant = createResonantEngine(current);
      if (palette) resonant.setPalette(palette);
    }
    return resonant;
  }

  function establishPalette(cr: number, ci: number) {
    palette = paletteFromLanding(cr, ci);
    melodic?.setPalette(palette);
    resonant?.setPalette(palette);
    const engine = activeEngine();
    if (engine) {
      for (const queued of pendingSplashes) {
        engine.splash(queued.skipIndex, queued.glyph, queued.panPosition);
      }
    }
    pendingSplashes = [];
  }

  return {
    init() {
      try { ensureShell(); } catch { /* audio stays optional */ }
    },
    setMode(next) {
      try {
        mode = next;
        shell?.setMode(next);
        activeEngine(); // build the target engine so it is ready mid-crossfade
      } catch { /* audio stays optional */ }
    },
    setVolume(next) {
      try {
        volume = next;
        shell?.setVolume(next);
      } catch { /* audio stays optional */ }
    },
    setMuted(next) {
      try {
        muted = next;
        shell?.setMuted(next);
      } catch { /* audio stays optional */ }
    },
    throwStart() {
      try {
        ensureShell();
        activeEngine()?.throwStart();
      } catch { /* audio stays optional */ }
    },
    splash(skipIndex, glyph, panPosition) {
      try {
        const engine = activeEngine();
        if (!engine) return;
        if (!palette) {
          // The first splash can precede the first update; replay it once
          // the landing position has seeded the palette.
          pendingSplashes.push({ skipIndex, glyph, panPosition });
          return;
        }
        engine.splash(skipIndex, glyph, panPosition);
      } catch { /* audio stays optional */ }
    },
    update(orbits, phase, nowMs) {
      try {
        if (!shell) return; // no context until a user gesture called init()
        const engine = activeEngine();
        if (!engine) return;
        const playing = (phase === "flying" || phase === "resolving") && orbits.length > 0;
        if (!playing) {
          engine.silence();
          return;
        }
        if (nowMs - lastUpdate < UPDATE_INTERVAL_MS) return;
        lastUpdate = nowMs;
        if (!palette) establishPalette(orbits[0].cr, orbits[0].ci);
        const frame = tracker.extract(orbits);
        for (const event of milestones.detect(frame.groups)) {
          engine.milestone(event);
        }
        engine.update(frame, phase === "resolving");
      } catch { /* audio stays optional */ }
    },
    finish(scoreRatio) {
      try {
        activeEngine()?.finish(Math.max(0, Math.min(1, scoreRatio)));
      } catch { /* audio stays optional */ }
    },
    reset() {
      try {
        palette = null;
        lastUpdate = 0;
        pendingSplashes = [];
        tracker.reset();
        milestones.reset();
        melodic?.reset();
        resonant?.reset();
      } catch { /* audio stays optional */ }
    },
    destroy() {
      try {
        melodic?.silence();
        resonant?.silence();
        shell?.dispose();
        void shell?.context.close().catch(() => { /* already closed */ });
        shell = null;
        melodic = null;
        resonant = null;
      } catch { /* audio stays optional */ }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/unit/audio-index.test.ts`
Expected: PASS (2 tests). This also proves the whole `lib/audio/` chain imports cleanly in Node.

- [ ] **Step 5: Run the full unit suite and lint**

Run: `npm run test:unit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/audio/index.ts tests/unit/audio-index.test.ts
git commit -m "Add the no-throw GameAudio facade tying both engines together."
```

---

### Task 8: Wire GameAudio into the component and delete the inline synth

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`

**Interfaces:**
- Consumes: `createGameAudio`, `type GameAudio` from `@/lib/audio/index` (Task 7).
- Produces: `gameAudioRef: React.MutableRefObject<GameAudio | null>` on the component — Task 9's settings effect reads it.

**IMPORTANT:** `git pull` first; this file moves under other sessions. Locate everything by the anchors given below, not line numbers. After each removal, `npm run lint` finds stragglers.

- [ ] **Step 1: Add imports and the ref**

Next to the other `@/lib` imports add:

```ts
import { createGameAudio, type GameAudio } from "@/lib/audio/index";
```

Inside the component function, next to the other `useRef` declarations (search `const restartRef`), add:

```ts
const gameAudioRef = useRef<GameAudio | null>(null);
```

- [ ] **Step 2: Delete the inline synth state and helpers**

Inside the main game effect, remove:
- `let audio: AudioContext | null = null;` and the whole `let iterationSynth: { ... } | null = null;` block (anchor: `iterationSynth`).
- `let lastSonification = 0;`, `let lastIterationPulse = 0;`, `let lastAudibleDepth = 0;`, `let lastAudibleCoverage = 0;`, `let pulseCounter = 0;`, `const lastShapeCoverage = new Map<number, number>();`
- `function ensureAudio() { ... }`, `function tone(...) { ... }`, `function ensureIterationSynth() { ... }`, `function updateIterationSound(now: number) { ... }` (entire bodies).
- At module scope: `const SONIC_SCALES = [ ... ] as const;` (anchor: `SONIC_SCALES`).
- In `resetRound()`: the lines `lastShapeCoverage.clear();`, `lastAudibleDepth = 0;`, `lastAudibleCoverage = 0;`, `lastIterationPulse = 0;`, `pulseCounter = 0;`.

- [ ] **Step 3: Create and expose the facade in the effect**

Where `let audio: AudioContext | null = null;` used to be, add:

```ts
const gameAudio = createGameAudio();
gameAudioRef.current = gameAudio;
```

In the effect's cleanup function (the effect's `return () => { ... }`, anchor: `flashlightLoadCancelled = true`), add:

```ts
gameAudioRef.current = null;
gameAudio.destroy();
```

- [ ] **Step 4: Wire the call sites**

1. **Grab gesture** — in the pointerdown handler where aiming starts (anchor: `phase = "aiming";` near `pointerMode = "aim"`), add `gameAudio.init();` (audio contexts must be created inside a user gesture).
2. **Throw** — in `launchRock`, replace `tone(170, 0.12, 0.07);` with:

```ts
gameAudio.init();
gameAudio.throwStart();
```

3. **Splash** — replace `tone(320 + index * 62, 0.1, 0.06);` (it sits in the skip-landing block that computes `const glyph = ...` and spawns glyph dots at screen position `x`) with:

```ts
gameAudio.splash(index, glyph, x / width * 2 - 1);
```

4. **Iteration sound** — replace the call `updateIterationSound(now);` (in the frame loop) with:

```ts
gameAudio.update(orbitScores, phase, now);
```

`OrbitScore` satisfies `OrbitFeatureInput` structurally; no conversion needed.
5. **Round finish** — in `finishRound`, replace `tone(720, 0.18, 0.07);` with:

```ts
const finalScore = orbitScores.reduce((sum, orbit) => sum + scoreForOrbit(orbit, orbit.shownDepth), 0);
gameAudio.finish(Math.min(1, finalScore / 2_000_000));
```

(If `finishRound` already computes a score total, reuse that variable instead of adding `finalScore`.)
6. **Reset** — at the top of `resetRound()`, add `gameAudio.reset();`.

- [ ] **Step 5: Lint sweep and unit tests**

Run: `npm run lint && npm run test:unit`
Expected: PASS. Lint failures here mean leftover references to deleted synth symbols — remove them.

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`, open the printed URL, then:
- Throw a stone: a soft whoosh on release, a pitched splash per skip, then evolving melodic audio while trails iterate — swells early when big forms bloom, sparse twinkles later.
- Press Space and rethrow onto a different landing spot: different key/scale, same engine character.
- No audio errors in the browser console; muting the tab and unmuting must not break playback.

- [ ] **Step 7: Commit**

```bash
git add app/MandelbrotSkipping.tsx
git commit -m "Replace the inline iteration synth with the GameAudio facade."
```

---

### Task 9: Sound settings in tuning (toggle, volume, mute)

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`

**Interfaces:**
- Consumes: `gameAudioRef` (Task 8), `SoundEngineMode` from `@/lib/audio/index`.
- Produces: `Tuning` gains `soundEngine: SoundEngineMode; soundVolume: number; soundMuted: boolean` — persisted under the existing `TUNING_KEY`.

- [ ] **Step 1: Extend the Tuning type and defaults**

In `type Tuning = { ... }` add:

```ts
soundEngine: "melodic" | "resonant";
soundVolume: number;
soundMuted: boolean;
```

In `DEFAULT_TUNING` add:

```ts
soundEngine: "melodic",
soundVolume: 0.8,
soundMuted: false,
```

- [ ] **Step 2: Sanitize stored values**

In `sanitizeTuning`, before the return statement add:

```ts
const soundEngine = value?.soundEngine === "resonant" ? "resonant" as const : "melodic" as const;
const rawVolume = Number(value?.soundVolume);
const soundVolume = Number.isFinite(rawVolume) ? Math.max(0, Math.min(1, rawVolume)) : DEFAULT_TUNING.soundVolume;
const soundMuted = value?.soundMuted === true;
```

and add `soundEngine, soundVolume, soundMuted` to the returned object.

- [ ] **Step 3: Apply settings to the audio facade**

Add a new effect after the main game effect (anchor: search for the `useEffect` that contains `restartRef` or place it near the tuning persistence effect):

```ts
useEffect(() => {
  const audio = gameAudioRef.current;
  if (!audio) return;
  audio.setMode(tuning.soundEngine);
  audio.setVolume(tuning.soundVolume);
  audio.setMuted(tuning.soundMuted);
}, [tuning.soundEngine, tuning.soundVolume, tuning.soundMuted]);
```

Also, in Task 8's Step 3 location, seed the initial mode: change `createGameAudio()` to `createGameAudio(tuningRef.current.soundEngine);`.

- [ ] **Step 4: Add panel controls**

In the tuning panel JSX, after the "Preview iterations" `tuningControl` div and before the `tuningNote` paragraph, add:

```tsx
<label className="tuningCheck">
  <input type="checkbox" checked={tuning.soundEngine === "resonant"}
    aria-label="Use the resonant pond sound engine instead of the melodic engine"
    onChange={(event) => updateTuning({ soundEngine: event.target.checked ? "resonant" : "melodic" })} />
  Resonant sound engine
</label>
<div className="tuningControl">
  <span><span>Sound volume</span><output>{Math.round(tuning.soundVolume * 100)}%</output></span>
  <input type="range" min="0" max="1" step="0.05" value={tuning.soundVolume}
    aria-label="Sound volume"
    aria-valuetext={`${Math.round(tuning.soundVolume * 100)} percent`}
    onChange={(event) => updateTuning({ soundVolume: Number(event.target.value) })} />
</div>
<label className="tuningCheck">
  <input type="checkbox" checked={tuning.soundMuted}
    aria-label="Mute all game sound"
    onChange={(event) => updateTuning({ soundMuted: event.target.checked })} />
  Mute sound
</label>
```

- [ ] **Step 5: Lint and unit tests**

Run: `npm run lint && npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`:
- Toggle "Resonant sound engine" mid-round: audible 0.5 s crossfade from melodic bed/arps to struck-bowl resonators; same throw keeps its key.
- Volume slider scales loudness smoothly; mute silences fully; both survive a page reload (localStorage).

- [ ] **Step 7: Commit**

```bash
git add app/MandelbrotSkipping.tsx
git commit -m "Add sound engine toggle, volume, and mute to the tuning panel."
```

---

### Task 10: Full verification pass

**Files:** none created; fixes only if checks fail.

- [ ] **Step 1: Full automated suite**

Run: `npm test`
Expected: unit tests PASS, production build succeeds, rendered-HTML test PASSES.

- [ ] **Step 2: Listening checklist** (`npm run dev`, headphones)

Melodic engine:
- [ ] Each of the 7 glyphs is identifiable: bell (halo), pluck (triangle), pad (vesica), chime (rose), rolling arp (pentagram), reedy lead (hexagram), shimmer (flower). Compare via consecutive skips in one throw.
- [ ] Early big blooms produce chord swells (plus a sub boom on the biggest); late iteration produces sparse quiet twinkles.
- [ ] Two different landing spots give two different keys; nothing sounds sour or harsh at any point.
- [ ] Arp density audibly follows coverage growth and dies down when trails stop growing.

Resonant engine:
- [ ] Each glyph rings with a different timbre on splash (drumhead vs plate vs coupled-circle beat vs bowl).
- [ ] Milestones swell like a bowed singing bowl; iteration produces gentle grain strums panned with the shape.
- [ ] Output stays pleasant — no screeching resonances (if a bank rings harsh, lower `MODE_Q` toward 18).

Both:
- [ ] Toggle crossfades cleanly mid-round; Escape/rethrow/reset never leaves a stuck drone; volume+mute persist across reload.
- [ ] CPU stays reasonable during a 15-skip throw (no frame-rate collapse attributable to audio; check the performance panel if unsure).

- [ ] **Step 3: Commit any tuning fixes**

```bash
git add -A
git commit -m "Tune sound levels from the listening pass."
```

(Skip the commit if nothing changed.)

---

## Plan Self-Review (completed)

- **Spec coverage:** two engines + toggle (Tasks 5, 6, 9), shared shell with generated-IR reverb/compressor/soft-clip and scheduler (Task 4), consonant landing-seeded palettes through one `degreeToFrequency` (Task 2), feature pipeline + milestone emphasis for big early forms (Task 3), glyph patches/arps/swells (Task 5), geometry-derived modal banks with strike/strum/bow exciters (Task 6), no-throw facade with lazy context and gesture init (Task 7), component cleanup of ~350 inline lines and wiring (Task 8), tuning persistence without key bump (Task 9), tests-in-node + listening pass (Tasks 1–7, 10). Spec's "update(frame, phase)" moved into the facade as documented in the header.
- **Placeholder scan:** none — every step carries runnable code or an exact command.
- **Type consistency:** `MelodicEngine`/`ResonantEngine` share the same eight methods consumed by `index.ts`; `OrbitFeatureInput` extends `OrbitShapeSums` and matches `OrbitScore` structurally; `GLYPH_DEGREE_OFFSET` lives in `theory.ts` only.
