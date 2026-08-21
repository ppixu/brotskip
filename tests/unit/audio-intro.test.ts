import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  INTRO_AMBIENT_FADE_SECONDS,
  INTRO_AMBIENT_PEAK,
  introAmbientDegrees,
  playJingleDegrees,
  playJingleDuration,
  playJingleStepSeconds,
} from "../../lib/audio/intro.ts";
import { chordGain } from "../../lib/audio/chiptune.ts";

const TONIC_TRIAD = new Set([0, 2, 3]);

function pentatonicTone(degree: number) {
  return ((degree % 5) + 5) % 5;
}

test("the loading screen has no ambient bed; its peak stays below gameplay chords", () => {
  const degrees = introAmbientDegrees();
  assert.ok(degrees.length >= 3);
  for (const degree of degrees) {
    assert.ok(TONIC_TRIAD.has(pentatonicTone(degree)), `ambient degree ${degree} clashes`);
  }
  assert.ok(INTRO_AMBIENT_PEAK < 0.05);
  assert.ok(INTRO_AMBIENT_PEAK < chordGain(0.6, 0.5, false));
  const intro = readFileSync(new URL("../../lib/audio/intro.ts", import.meta.url), "utf8");
  assert.doesNotMatch(intro, /oscillator\.start\(now\)/);
  assert.match(intro, /playJingle\(\)/);
  assert.match(intro, /playJingleDegrees/);
});

test("Play tap plays a short tonic jingle and fades the bed under it", () => {
  const melody = playJingleDegrees();
  assert.ok(melody.length >= 4);
  assert.ok(melody.length <= 6);
  for (const degree of melody) {
    assert.ok(TONIC_TRIAD.has(pentatonicTone(degree)), `jingle degree ${degree} clashes`);
  }
  assert.ok(playJingleStepSeconds() < 0.12);
  assert.ok(playJingleDuration() < 0.9);
  assert.ok(INTRO_AMBIENT_FADE_SECONDS > playJingleDuration());
  assert.ok(INTRO_AMBIENT_FADE_SECONDS >= 1.1);
});
