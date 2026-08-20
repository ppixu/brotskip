import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ACCELERATION,
  DEPTH_OPTIONS,
  MAX_ACCELERATION,
  MIN_ACCELERATION,
  acceleratedSteps,
  clampAcceleration,
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

test("iterations start at the base rate and accelerate with depth", () => {
  const budget = 1_000;
  const start = acceleratedSteps(0, 1_000_000, budget, 30);
  const early = acceleratedSteps(100_000, 1_000_000, budget, 30);
  const middle = acceleratedSteps(500_000, 1_000_000, budget, 30);
  const late = acceleratedSteps(900_000, 1_000_000, budget, 30);
  const end = acceleratedSteps(1_000_000, 1_000_000, budget, 30);
  assert.equal(start, 4);
  assert.ok(start < early && early < middle && middle < late && late < end);
  assert.equal(end, 120);
});

test("the multiplier changes speed at the same depth", () => {
  const slow = acceleratedSteps(500_000, 1_000_000, 1_000, 10);
  const fast = acceleratedSteps(500_000, 1_000_000, 1_000, 30);
  assert.ok(fast > slow, `fast ${fast} vs slow ${slow}`);
});
