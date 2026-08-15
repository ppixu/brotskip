import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("acceleration curve can be set much steeper than 10", () => {
  assert.equal(MIN_ACCELERATION, 0.5);
  assert.equal(MAX_ACCELERATION, 18);
  assert.equal(clampAcceleration(24), 18);
  assert.equal(clampAcceleration(10), 10);
});

test("a steep curve stays slow until late in the orbit", () => {
  const budget = 1_000;
  const shallow = acceleratedSteps(500_000, 1_000_000, budget, 2);
  const steep = acceleratedSteps(500_000, 1_000_000, budget, 10);
  assert.ok(steep < shallow / 8, `steep ${steep} vs shallow ${shallow}`);
  assert.ok(acceleratedSteps(1_000_000, 1_000_000, budget, 10) >= budget - 1);
});
