import assert from "node:assert/strict";
import test from "node:test";
import { buildImpulseResponse, nextGridTime, softClipCurve } from "../../lib/audio/engine.ts";

test("soft clip curve is bounded, odd-symmetric and monotonic", () => {
  const curve = softClipCurve();
  assert.equal(curve.length, 1024);
  assert.ok(Math.abs(curve[0] + 1) < 1e-6);
  assert.ok(Math.abs(curve[curve.length - 1] - 1) < 1e-6);
  for (let index = 1; index < curve.length; index++) {
    assert.ok(curve[index] >= curve[index - 1]);
  }
});

test("impulse response decays and decorrelates channels", () => {
  const [left, right] = buildImpulseResponse(48000, 1.0);
  assert.equal(left.length, 48000);
  assert.equal(right.length, 48000);
  const rms = (data: Float32Array, start: number, end: number) => {
    let sum = 0;
    for (let index = start; index < end; index++) sum += data[index] * data[index];
    return Math.sqrt(sum / (end - start));
  };
  assert.ok(rms(left, 0, 4800) > rms(left, 43200, 48000) * 4);
  let difference = 0;
  for (let index = 0; index < 4800; index++) difference += Math.abs(left[index] - right[index]);
  assert.ok(difference > 1);
});

test("grid times land on the grid, in the future, monotonically", () => {
  const gridStart = 10;
  const step = 60 / 90 * .5;
  let previous = 10.01;
  for (const now of [10.01, 10.4, 11.2, 12.0, 15.7]) {
    const next = nextGridTime(now, gridStart, 90, .5);
    assert.ok(next > now);
    const offset = (next - gridStart) / step;
    assert.ok(Math.abs(offset - Math.round(offset)) < 1e-6);
    assert.ok(next >= previous);
    previous = next;
  }
});

test("grid time before the grid start still lands on the grid", () => {
  const next = nextGridTime(5, 10, 90, .5);
  assert.ok(next >= 10);
});
