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
