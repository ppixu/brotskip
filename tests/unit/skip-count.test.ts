import assert from "node:assert/strict";
import test from "node:test";
import { MAX_SKIPS, MIN_SKIPS, sampleSkipCount } from "../../lib/skip-count.ts";

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("a zero draw always yields the minimum skip count", () => {
  assert.equal(sampleSkipCount(() => 0), MIN_SKIPS);
});

test("a full draw always yields the maximum skip count", () => {
  assert.equal(sampleSkipCount(() => 0.999999), MAX_SKIPS);
});

test("sampled skip counts stay in 2 through 15", () => {
  const random = lcg(7);
  for (let index = 0; index < 4000; index++) {
    const skips = sampleSkipCount(random);
    assert.ok(skips >= MIN_SKIPS && skips <= MAX_SKIPS);
    assert.equal(skips, Math.floor(skips));
  }
});

test("higher skip counts become increasingly rare", () => {
  const random = lcg(2026);
  const counts = Array.from({ length: MAX_SKIPS + 1 }, () => 0);
  const samples = 20_000;
  for (let index = 0; index < samples; index++) counts[sampleSkipCount(random)] += 1;
  assert.ok(counts[2] > counts[5]);
  assert.ok(counts[5] > counts[10]);
  assert.ok(counts[10] > counts[15]);
  assert.ok(counts[2] / samples > 0.18);
  assert.ok(counts[15] / samples < 0.02);
});
