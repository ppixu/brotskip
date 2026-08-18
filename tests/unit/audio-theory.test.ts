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
