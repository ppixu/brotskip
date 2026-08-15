import assert from "node:assert/strict";
import test from "node:test";
import {
  DEPTH_OPTIONS,
  MAX_ACCELERATION,
  MIN_ACCELERATION,
  acceleratedSteps,
  clampAcceleration,
} from "../../lib/orbit-tuning.ts";

test("orbit limit reaches 200 million iterations", () => {
  assert.equal(DEPTH_OPTIONS[DEPTH_OPTIONS.length - 1], 200_000_000);
  assert.ok(DEPTH_OPTIONS.includes(50_000_000));
  assert.ok(DEPTH_OPTIONS.includes(100_000_000));
});

test("acceleration curve can be set much steeper than 4", () => {
  assert.equal(MIN_ACCELERATION, 0.5);
  assert.equal(MAX_ACCELERATION, 10);
  assert.equal(clampAcceleration(12), 10);
  assert.equal(clampAcceleration(6), 6);
});

test("a steep curve stays slow until late in the orbit", () => {
  const budget = 1_000;
  const shallow = acceleratedSteps(500_000, 1_000_000, budget, 2);
  const steep = acceleratedSteps(500_000, 1_000_000, budget, 6);
  assert.ok(steep < shallow / 4, `steep ${steep} vs shallow ${shallow}`);
  assert.ok(acceleratedSteps(1_000_000, 1_000_000, budget, 6) >= budget - 1);
});
