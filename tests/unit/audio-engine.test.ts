import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_BPM, HIGHPASS_HZ, REVERB_SECONDS, buildImpulseResponse, nextGridTime, softClipCurve } from "../../lib/audio/engine.ts";

test("the bus is Nintendo-bright: fast tempo, short reverb, and room for triangle bass", () => {
  assert.ok(DEFAULT_BPM >= 130);
  assert.ok(REVERB_SECONDS <= .7);
  assert.ok(HIGHPASS_HZ >= 55 && HIGHPASS_HZ <= 100);
});

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
  const [left, right] = buildImpulseResponse(48000, 0.45);
  assert.equal(left.length, Math.round(48000 * 0.45));
  assert.equal(right.length, left.length);
  const rms = (data: Float32Array, start: number, end: number) => {
    let sum = 0;
    for (let index = start; index < end; index++) sum += data[index] * data[index];
    return Math.sqrt(sum / (end - start));
  };
  const earlyEnd = Math.floor(left.length * .1);
  const lateStart = Math.floor(left.length * .85);
  assert.ok(rms(left, 0, earlyEnd) > rms(left, lateStart, left.length) * 4);
  let difference = 0;
  for (let index = 0; index < earlyEnd; index++) difference += Math.abs(left[index] - right[index]);
  assert.ok(difference > 1);
});

test("grid times land on sixteenth notes at 144 BPM", () => {
  const gridStart = 10;
  const step = 60 / 144 * .25;
  let previous = 10.01;
  for (const now of [10.01, 10.4, 11.2, 12.0, 15.7]) {
    const next = nextGridTime(now, gridStart);
    assert.ok(next > now);
    const offset = (next - gridStart) / step;
    assert.ok(Math.abs(offset - Math.round(offset)) < 1e-6);
    assert.ok(next >= previous);
    previous = next;
  }
});
