import assert from "node:assert/strict";
import test from "node:test";
import { createGameAudio, type OrbitFeatureInput } from "../../lib/audio/index.ts";

const orbit: OrbitFeatureInput = {
  skip: 1, glyph: 0, zr: 0.2, zi: 0.1, cr: -0.6, ci: 0.15,
  shownDepth: 40, stepDistance: 0.02, distanceContraction: 0.1, resolved: false,
  distinct: 12, sumX: 180, sumY: 192, sumXX: 2800, sumYY: 3200, sumXY: 2880,
};

test("every GameAudio method is a safe no-op without an AudioContext", () => {
  const audio = createGameAudio();
  assert.doesNotThrow(() => {
    audio.init();
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
