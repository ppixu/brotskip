import assert from "node:assert/strict";
import test from "node:test";
import { DEPTH_OPTIONS } from "../../lib/orbit-tuning.ts";
import { STONES, STARTER_STONE_ID, stoneById, nextStone, clampTuningToStone } from "../../lib/progression/stones.ts";

test("catalog has 8 stones and starts with the free starter", () => {
  assert.equal(STONES.length, 8);
  assert.equal(STONES[0].id, STARTER_STONE_ID);
  assert.equal(STONES[0].price, 0);
});

test("every stat is monotonically non-decreasing and prices strictly increase", () => {
  for (let index = 1; index < STONES.length; index++) {
    const previous = STONES[index - 1];
    const stone = STONES[index];
    assert.ok(stone.dots >= previous.dots, `${stone.id} dots`);
    assert.ok(stone.depthCap >= previous.depthCap, `${stone.id} depthCap`);
    assert.ok(stone.skipDecay >= previous.skipDecay, `${stone.id} skipDecay`);
    assert.ok(stone.tintStrength >= previous.tintStrength, `${stone.id} tintStrength`);
    assert.ok(stone.price > previous.price, `${stone.id} price`);
  }
});

test("stone stats stay within engine ranges", () => {
  for (const stone of STONES) {
    assert.ok(DEPTH_OPTIONS.includes(stone.depthCap as typeof DEPTH_OPTIONS[number]), `${stone.id} depthCap in DEPTH_OPTIONS`);
    assert.ok(stone.dots >= 6 && stone.dots <= 128, `${stone.id} dots range`);
    assert.ok(stone.skipDecay > 0 && stone.skipDecay < 1, `${stone.id} decay range`);
    assert.ok(stone.shapeIndex >= 0 && stone.shapeIndex <= 7, `${stone.id} shapeIndex`);
    assert.ok(stone.tint.every((channel) => channel >= 0 && channel <= 255), `${stone.id} tint`);
    assert.ok(stone.tintStrength >= 0 && stone.tintStrength <= 1, `${stone.id} tintStrength`);
  }
});

test("stoneById falls back to the starter for unknown ids", () => {
  assert.equal(stoneById("nope").id, STARTER_STONE_ID);
  assert.equal(stoneById(STONES[3].id).id, STONES[3].id);
});

test("nextStone walks the ladder and ends with null", () => {
  assert.equal(nextStone(STONES[0].id)?.id, STONES[1].id);
  assert.equal(nextStone(STONES[STONES.length - 1].id), null);
});

test("clampTuningToStone clamps dots and depth but leaves lower values alone", () => {
  const stone = STONES[0];
  const clamped = clampTuningToStone({ sourceDots: 64, maxDepth: 2_000_000 }, stone);
  assert.equal(clamped.sourceDots, stone.dots);
  assert.equal(clamped.maxDepth, stone.depthCap);
  const low = clampTuningToStone({ sourceDots: 6, maxDepth: 10_000 }, stone);
  assert.equal(low.sourceDots, 6);
  assert.equal(low.maxDepth, 10_000);
});
