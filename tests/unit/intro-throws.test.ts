import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { magnitudeSq } from "../../lib/buddhabrot/explain.ts";
import {
  GLYPH_COUNT,
  INTRO_MAX_ITERATIONS,
  INTRO_SAMPLE_BUDGET,
  SACRED_PATH_COUNTS,
  THROW_BOUNDS,
  complexToIntroCanvas,
  createIntroRockThrow,
  impactSeedCloud,
  introCanvasToComplex,
  introThrowToCanvas,
  sacredShapeOffset,
  sampleEscapingSplash,
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

test("escaping splash samples leave the radius-2 circle", () => {
  let index = 0;
  const random = () => {
    index += 1;
    return (index * 0.17) % 1;
  };
  for (let step = 0; step < 8; step++) {
    const splash = sampleEscapingSplash(random);
    const orbit = splash.orbit;
    assert.ok(orbit.length >= 5);
    assert.ok(magnitudeSq(orbit[orbit.length - 1]) > 4);
  }
});

test("a skip seed cloud stays near the splash in the complex plane", () => {
  const splash = { re: -0.75, im: 0.12 };
  const screen = complexToIntroCanvas(splash.re, splash.im, 512);
  const seeds = impactSeedCloud(screen.x, screen.y, 512, 0, 18);
  assert.equal(seeds.length, 18);
  for (const seed of seeds) {
    assert.ok(Math.hypot(seed.re - splash.re, seed.im - splash.im) < 0.12);
  }
});

test("rock-throw skips carry escaping seeds for the nebula", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const rockThrow = createIntroRockThrow(640, random);
  assert.ok(rockThrow.impacts.length >= 1);
  for (const impact of rockThrow.impacts) {
    assert.ok(impact.seeds.length >= 6);
    assert.ok(impact.orbitPoints.length >= 5);
    const last = impact.orbitPoints[impact.orbitPoints.length - 1];
    const complex = introCanvasToComplex(last.x, last.y, 640);
    assert.ok(magnitudeSq(complex) > 3.5 || impact.orbitPoints.length >= 8);
  }
});

test("intro overlay feeds skip seeds into the generator instead of a free nebula", () => {
  const source = readFileSync(new URL("../../app/BuddhabrotIntro.tsx", import.meta.url), "utf8");
  assert.match(source, /stepAround/);
  assert.match(source, /accumulateAround/);
  assert.match(source, /orbitPoints/);
});

test("an intro throw maps an escaping orbit onto the canvas", () => {
  const throwTrail = introThrowToCanvas(() => 0.81, 256);
  assert.ok(throwTrail);
  assert.ok(throwTrail.points.length >= 3);
  assert.ok(throwTrail.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});

test("canvas and complex coordinates round-trip precisely", () => {
  const size = 512;
  const coords = [
    { re: -2.0, im: 1.0 },
    { re: 0.0, im: 0.0 },
    { re: 1.0, im: -1.2 },
    { re: -0.75, im: 0.1 },
  ];
  for (const c of coords) {
    const screen = complexToIntroCanvas(c.re, c.im, size);
    const roundTrip = introCanvasToComplex(screen.x, screen.y, size);
    assert.ok(Math.abs(roundTrip.re - c.re) < 1e-6);
    assert.ok(Math.abs(roundTrip.im - c.im) < 1e-6);
  }
});

test("createIntroRockThrow generates rock throws with trajectory and skips", () => {
  const size = 600;
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const rockThrow = createIntroRockThrow(size, pseudoRandom);
  assert.ok(rockThrow);
  assert.ok(rockThrow.shape >= 0 && rockThrow.shape < GLYPH_COUNT);
  assert.ok(rockThrow.duration > 0);
  assert.ok(rockThrow.trajectory.length >= 2);
  assert.ok(rockThrow.impacts.length >= 1);

  // Verify all trajectory points are valid numbers
  for (const pt of rockThrow.trajectory) {
    assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.z) && Number.isFinite(pt.t));
  }

  // Verify impacts have valid orbit points originating at the impact location
  for (const impact of rockThrow.impacts) {
    assert.ok(impact.x >= 0 && impact.x <= size);
    assert.ok(impact.y >= 0 && impact.y <= size);
    assert.ok(impact.t >= 0);
    assert.ok(impact.orbitPoints.length >= 1);
    assert.ok(Math.hypot(impact.orbitPoints[0].x - impact.x, impact.orbitPoints[0].y - impact.y) < size * 0.12);
    assert.ok(impact.seeds.length >= 6);
  }
});

test("sacred shapes evaluate cleanly across all glyph definitions", () => {
  assert.equal(SACRED_PATH_COUNTS.length, GLYPH_COUNT);
  for (let shape = 0; shape < GLYPH_COUNT; shape++) {
    const paths = SACRED_PATH_COUNTS[shape];
    for (let path = 0; path < paths; path++) {
      const offset = sacredShapeOffset(shape, path, 0.5);
      assert.ok(Number.isFinite(offset.x));
      assert.ok(Number.isFinite(offset.y));
    }
  }
});

