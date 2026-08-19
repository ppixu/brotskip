import assert from "node:assert/strict";
import test from "node:test";
import {
  arpIntervalSeconds,
  arpPattern,
  bassDegree,
  bassIntervalSeconds,
  chordDegrees,
  chordGain,
  fanfarePlan,
  fanfareTier,
  finishComplexity,
  GLYPH_PATCHES,
  melodyDegree,
  splashDegree,
  splashPeakHz,
} from "../../lib/audio/chiptune.ts";
import { degreeToFrequency, paletteFromLanding } from "../../lib/audio/theory.ts";

test("every sacred glyph has its own chord, arp, and waveform", () => {
  assert.equal(GLYPH_PATCHES.length, 7);
  const signatures = GLYPH_PATCHES.map((patch) =>
    `${patch.waveform}:${patch.duty}:${patch.chord.join(",")}:${patch.arp.join(",")}`,
  );
  assert.equal(new Set(signatures).size, 7);
  for (const patch of GLYPH_PATCHES) {
    assert.ok(patch.chord.length >= 2);
    assert.ok(patch.arp.length >= 3);
    assert.ok(["sine", "triangle", "square", "pulse"].includes(patch.waveform));
  }
});

test("glyph chords stay inside the pentatonic scale", () => {
  for (let glyph = 0; glyph < 7; glyph++) {
    for (const degree of chordDegrees(glyph)) {
      assert.equal(degree, Math.round(degree));
      assert.ok(degree >= 0);
    }
    assert.deepEqual(chordDegrees(glyph), GLYPH_PATCHES[glyph].chord);
    assert.deepEqual(arpPattern(glyph), GLYPH_PATCHES[glyph].arp);
  }
});

test("later skips climb the pentatonic, so combos get brighter", () => {
  for (let glyph = 0; glyph < 7; glyph++) {
    const first = splashDegree(1, glyph);
    const later = splashDegree(5, glyph);
    assert.ok(later > first, `glyph ${glyph} skip 5 (${later}) should outrank skip 1 (${first})`);
  }
});

test("skip hits live in a punchy treble register, not under 400 Hz", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  for (let skip = 1; skip <= 8; skip++) {
    for (let glyph = 0; glyph < 7; glyph++) {
      const hz = splashPeakHz(palette, skip, glyph);
      assert.ok(hz >= 400, `skip ${skip} glyph ${glyph} peaked at ${hz} Hz`);
      assert.ok(hz <= 4000);
      const expected = degreeToFrequency(palette, splashDegree(skip, glyph), 4000);
      assert.equal(hz, expected);
    }
  }
});

test("arp speeds up while forms grow and thins out as they settle", () => {
  const busy = arpIntervalSeconds(1, 1);
  const idle = arpIntervalSeconds(0, 0);
  assert.ok(busy < idle);
  assert.ok(busy < 0.12);
  assert.ok(idle > 0.3);
});

test("held pentatonic chords stay present but duck a little while resolving", () => {
  const flying = chordGain(0.6, 0.5, false);
  const resolving = chordGain(0.6, 0.5, true);
  assert.ok(flying > resolving);
  assert.ok(flying > 0.05);
  assert.ok(flying < 0.2);
});

test("bassline sits under the melody in the NES triangle-bass register", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  const melody = degreeToFrequency(palette, 0);
  const bass = degreeToFrequency(palette, bassDegree(0, 3, 0));
  assert.ok(bass >= 70, `bass ${bass} Hz is below the triangle floor`);
  assert.ok(bass < 190, `bass ${bass} Hz is still clamped into the midrange`);
  assert.ok(bass < melody * 0.65);
});

test("the bassline walks and drops an octave on a long spiral", () => {
  const walked = Array.from({ length: 8 }, (_, step) => bassDegree(step, 4, 0));
  assert.ok(new Set(walked).size >= 3, "bassline should not be a single held note");
  assert.ok(bassDegree(0, 14, 0) < bassDegree(0, 3, 0));
});

test("bass notes are slower than the sparkle arp", () => {
  assert.ok(bassIntervalSeconds(4) > arpIntervalSeconds(1, 1) * 1.5);
});

test("deeper spirals climb the pentatonic instead of looping the same lick", () => {
  const shallow = melodyDegree(4, 0, 2, 0);
  const deep = melodyDegree(4, 0, 16, 0);
  assert.ok(deep > shallow);
});

test("orbit angle twists the melody so a spiral is not a static ostinato", () => {
  const a = melodyDegree(4, 3, 8, 0);
  const b = melodyDegree(4, 3, 8, Math.PI);
  assert.notEqual(a, b);
});

test("four celebration tiers grow in notes and duration", () => {
  assert.equal(fanfareTier(0), 0);
  assert.equal(fanfareTier(0.25), 1);
  assert.equal(fanfareTier(0.55), 2);
  assert.equal(fanfareTier(0.9), 3);
  const chip = fanfarePlan(0.05);
  const huge = fanfarePlan(0.95);
  assert.equal(chip.tier, 0);
  assert.equal(huge.tier, 3);
  assert.ok(huge.noteCount >= chip.noteCount * 2);
  assert.ok(huge.duration > chip.duration * 3);
  assert.equal(chip.withBass, false);
  assert.equal(huge.withBass, true);
  assert.equal(huge.withFinalChord, true);
});

test("a deep, high-coverage throw ranks a bigger fanfare than a short skip", () => {
  const small = finishComplexity({ score: 40_000, deepest: 60, coverage: 20, skips: 2 });
  const huge = finishComplexity({ score: 1_800_000, deepest: 1_500_000, coverage: 4000, skips: 12 });
  assert.ok(small < 0.25);
  assert.ok(huge > 0.75);
  assert.ok(fanfareTier(huge) > fanfareTier(small));
});
