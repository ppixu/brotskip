import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_MAX_ITERATIONS,
  INTRO_SAMPLE_BUDGET,
  THROW_BOUNDS,
  introThrowToCanvas,
  sampleSplash,
} from "../../lib/buddhabrot/intro-throws.ts";
import { samplesForFrame } from "../../lib/buddhabrot/pacing.ts";

test("intro orbits stay short enough to finish in about five seconds", () => {
  assert.ok(INTRO_MAX_ITERATIONS <= 120);
  assert.ok(INTRO_SAMPLE_BUDGET[4096] <= 12_000_000);
  assert.ok(INTRO_SAMPLE_BUDGET[2048] <= 6_000_000);
});

test("intro sample pacing still covers the budget across five seconds", () => {
  const totalSamples = INTRO_SAMPLE_BUDGET[4096];
  let accumulated = 0;
  for (let frame = 0; frame < 300; frame++) {
    accumulated += samplesForFrame(1 / 60, { totalSamples });
  }
  assert.ok(accumulated >= totalSamples * 0.99, `got ${accumulated}`);
});

test("splash samples stay inside the Buddhabrot bounds", () => {
  let index = 0;
  const random = () => {
    index += 1;
    return (index * 0.37) % 1;
  };
  for (let step = 0; step < 20; step++) {
    const splash = sampleSplash(random);
    assert.ok(splash.re >= THROW_BOUNDS.xMin && splash.re <= THROW_BOUNDS.xMax);
    assert.ok(splash.im >= THROW_BOUNDS.yMin && splash.im <= THROW_BOUNDS.yMax);
  }
});

test("an intro throw maps an escaping orbit onto the canvas", () => {
  const throwTrail = introThrowToCanvas(() => 0.81, 256);
  assert.ok(throwTrail);
  assert.ok(throwTrail.points.length >= 3);
  assert.ok(throwTrail.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
