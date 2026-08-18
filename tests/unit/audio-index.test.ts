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
