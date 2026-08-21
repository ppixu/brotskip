import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCELERATION_CURVE_POWER,
  ACCELERATION_RAMP_DEPTH,
  BASE_STEPS_PER_SOURCE,
  DEFAULT_ACCELERATION,
  DEPTH_OPTIONS,
  FAST_FORWARD_MULTIPLIER,
  MAX_ACCELERATION,
  MIN_ACCELERATION,
  acceleratedSteps,
  clampAcceleration,
  fastForwardSteps,
} from "../../lib/orbit-tuning.ts";

test("orbit limit reaches 2 billion iterations", () => {
  assert.equal(DEPTH_OPTIONS[DEPTH_OPTIONS.length - 1], 2_000_000_000);
  assert.ok(DEPTH_OPTIONS.includes(500_000_000));
  assert.ok(DEPTH_OPTIONS.includes(1_000_000_000));
});

test("acceleration multiplier can be set up to 90x", () => {
  assert.equal(MIN_ACCELERATION, 0.5);
  assert.equal(MAX_ACCELERATION, 90);
  assert.equal(DEFAULT_ACCELERATION, 30);
  assert.equal(clampAcceleration(100), 90);
  assert.equal(clampAcceleration(30), 30);
});

test("iterations start one at a time and then accelerate steeply with absolute depth", () => {
  const budget = 10_000;
  const maxDepth = 2_000_000;
  const start = acceleratedSteps(0, maxDepth, budget, 30);
  const early = acceleratedSteps(128, maxDepth, budget, 30);
  const rising = acceleratedSteps(512, maxDepth, budget, 30);
  const fast = acceleratedSteps(2_048, maxDepth, budget, 30);
  const veryFast = acceleratedSteps(4_096, maxDepth, budget, 30);
  assert.equal(BASE_STEPS_PER_SOURCE, 1);
  assert.equal(ACCELERATION_RAMP_DEPTH, 1_024);
  assert.equal(ACCELERATION_CURVE_POWER, 2);
  assert.equal(start, 1);
  assert.equal(early, 1);
  assert.equal(rising, 8);
  assert.equal(fast, 121);
  assert.equal(veryFast, 481);
});

test("speed curve does not stay near zero when the orbit limit is huge", () => {
  const shortLimit = acceleratedSteps(1_024, 10_000, 10_000, 30);
  const hugeLimit = acceleratedSteps(1_024, 2_000_000_000, 10_000, 30);
  assert.equal(shortLimit, 31);
  assert.equal(hugeLimit, shortLimit);
});

test("the multiplier changes speed at the same depth", () => {
  const slow = acceleratedSteps(2_048, 2_000_000, 1_000, 0.5);
  const fast = acceleratedSteps(2_048, 2_000_000, 1_000, 30);
  assert.equal(slow, 3);
  assert.ok(fast > slow, `fast ${fast} vs slow ${slow}`);
});

test("fast forward applies an explicit ten-times batch boost", () => {
  const normal = acceleratedSteps(1_024, 2_000_000, 10_000, 30);
  const fast = fastForwardSteps(1_024, 2_000_000, 10_000, 30);
  assert.equal(FAST_FORWARD_MULTIPLIER, 10);
  assert.equal(fast, normal * FAST_FORWARD_MULTIPLIER);
});
