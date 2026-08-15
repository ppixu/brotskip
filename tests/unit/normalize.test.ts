import assert from "node:assert/strict";
import test from "node:test";
import { cutsFromHistogram, HISTOGRAM_BINS } from "../../lib/buddhabrot/normalize.ts";

test("finds percentile cuts in a uniform histogram", () => {
  // 100 bins spanning 0..100, one pixel each: the Nth percentile lands on N.
  const histogram = new Uint32Array(100).fill(1);
  const cuts = cutsFromHistogram(histogram, 100);
  assert.ok(Math.abs(cuts.low - 54) < 0.5, `low was ${cuts.low}`);
  assert.ok(Math.abs(cuts.high - 99.92) < 0.5, `high was ${cuts.high}`);
});

test("high cut always exceeds low cut", () => {
  const histogram = new Uint32Array(HISTOGRAM_BINS);
  histogram[7] = 1000;
  const cuts = cutsFromHistogram(histogram);
  assert.ok(cuts.high > cuts.low);
});

test("an empty histogram yields a safe non-degenerate range", () => {
  const cuts = cutsFromHistogram(new Uint32Array(HISTOGRAM_BINS));
  assert.equal(cuts.low, 0);
  assert.ok(cuts.high > cuts.low);
});

test("a non-positive scale yields a safe non-degenerate range", () => {
  const histogram = new Uint32Array(HISTOGRAM_BINS).fill(1);
  const cuts = cutsFromHistogram(histogram, 0);
  assert.equal(cuts.low, 0);
  assert.ok(cuts.high > cuts.low);
});

test("mass concentrated low pulls both cuts low", () => {
  const histogram = new Uint32Array(HISTOGRAM_BINS);
  histogram.fill(0);
  for (let bin = 0; bin < 10; bin++) histogram[bin] = 100;
  const cuts = cutsFromHistogram(histogram, 20);
  assert.ok(cuts.high < 1, `high was ${cuts.high}`);
});

test("accepts a plain array as well as a typed array", () => {
  const cuts = cutsFromHistogram([0, 0, 5, 5], 4);
  assert.ok(Number.isFinite(cuts.low));
  assert.ok(Number.isFinite(cuts.high));
});
