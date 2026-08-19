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
  assert.equal(detector.detect([makeGroup({ coverage: 10 })] )[0].kind, "bloom");
});
