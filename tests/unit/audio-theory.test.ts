import assert from "node:assert/strict";
import test from "node:test";
import {
  AUDIO_SCALES,
  degreeToFrequency,
  MIN_HZ,
  MAX_SUSTAINED_HZ,
  paletteFromLanding,
  ROOT_MIDI_MIN,
  ROOT_MIDI_MAX,
} from "../../lib/audio/theory.ts";

test("only pentatonic scales are offered", () => {
  assert.equal(AUDIO_SCALES.length, 2);
  const names = AUDIO_SCALES.map((scale) => scale.name).sort();
  assert.deepEqual(names, ["major-pentatonic", "minor-pentatonic"]);
  for (const scale of AUDIO_SCALES) {
    assert.equal(scale.steps.length, 5);
    assert.equal(scale.steps[0], 0);
    for (let index = 1; index < scale.steps.length; index++) {
      assert.ok(scale.steps[index] > scale.steps[index - 1]);
      assert.ok(scale.steps[index] < 12);
    }
  }
});

test("palette seeding is deterministic, varies with landing, and stays in a bright register", () => {
  const a = paletteFromLanding(-0.58, 0.2);
  const b = paletteFromLanding(-0.58, 0.2);
  const c = paletteFromLanding(0.31, -0.7);
  assert.deepEqual(a, b);
  assert.notEqual(a.seed, c.seed);
  assert.ok(a.rootMidi >= ROOT_MIDI_MIN && a.rootMidi < ROOT_MIDI_MAX);
  assert.ok(c.rootMidi >= ROOT_MIDI_MIN && c.rootMidi < ROOT_MIDI_MAX);
  assert.ok(AUDIO_SCALES.some((scale) => scale.name === a.scaleName));
});

test("the root of every palette is a Nintendo-range mid pitch, never a bass drone", () => {
  const landings: Array<[number, number]> = [
    [-2.2, -1.5], [-0.58, 0], [0.31, -0.7], [1.2, 1.5], [-1.1, 0.8],
  ];
  for (const [cr, ci] of landings) {
    const palette = paletteFromLanding(cr, ci);
    const root = degreeToFrequency(palette, 0);
    assert.ok(root >= MIN_HZ, `root ${root} Hz too low for ${palette.scaleName}`);
    assert.ok(root >= 250, `root ${root} Hz is still in the bland bass range`);
    assert.ok(root <= 900, `root ${root} Hz jumped past the melody register`);
  }
});

test("one scale length up is exactly one octave", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  const root = degreeToFrequency(palette, 0);
  const octave = degreeToFrequency(palette, palette.steps.length);
  assert.ok(Math.abs(octave / root - 2) < 1e-9);
});

test("negative degrees wrap downward but never below MIN_HZ", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  const below = degreeToFrequency(palette, -palette.steps.length);
  assert.ok(below >= MIN_HZ);
});

test("sustained frequency is capped", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  assert.ok(degreeToFrequency(palette, 500) <= MAX_SUSTAINED_HZ);
});
