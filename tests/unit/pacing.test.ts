import assert from "node:assert/strict";
import test from "node:test";
import {
  clampDelta,
  samplesForFrame,
  MAX_DELTA_SECONDS,
  DEFAULT_MAX_SAMPLES_PER_FRAME,
} from "../../lib/buddhabrot/pacing.ts";

test("clampDelta caps a long frame", () => {
  assert.equal(clampDelta(3), MAX_DELTA_SECONDS);
});

test("clampDelta rejects negative and non-finite deltas", () => {
  assert.equal(clampDelta(-1), 0);
  assert.equal(clampDelta(Number.NaN), 0);
});

test("chunks sum to roughly the full budget over the minimum duration", () => {
  const totalSamples = 64_000_000;
  let accumulated = 0;
  for (let frame = 0; frame < 300; frame++) {
    accumulated += samplesForFrame(1 / 60, { totalSamples });
  }
  // 300 frames at 60fps is exactly 5000ms. Allow 1% for per-frame flooring.
  assert.ok(accumulated >= totalSamples * 0.99, `got ${accumulated}`);
  assert.ok(accumulated <= totalSamples * 1.01, `got ${accumulated}`);
});

test("a backgrounded tab cannot dump the remaining budget in one frame", () => {
  const totalSamples = 64_000_000;
  const afterLongStall = samplesForFrame(4, { totalSamples });
  const normalFrame = samplesForFrame(1 / 60, { totalSamples });
  assert.ok(afterLongStall < totalSamples * 0.02, `got ${afterLongStall}`);
  assert.ok(afterLongStall > normalFrame);
});

test("never exceeds the per-frame ceiling", () => {
  const result = samplesForFrame(1 / 60, { totalSamples: 10_000_000_000 });
  assert.equal(result, DEFAULT_MAX_SAMPLES_PER_FRAME);
});

test("always advances by at least one sample", () => {
  assert.ok(samplesForFrame(0, { totalSamples: 64_000_000 }) >= 1);
});

test("a zero minimum duration runs at the ceiling", () => {
  const result = samplesForFrame(1 / 60, { totalSamples: 64_000_000, minDurationMs: 0 });
  assert.equal(result, DEFAULT_MAX_SAMPLES_PER_FRAME);
});
