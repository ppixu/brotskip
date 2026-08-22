import assert from "node:assert/strict";
import test from "node:test";
import { STONES } from "../../lib/progression/stones.ts";
import { expectedSkips, estimateThrowScore } from "../../lib/progression/pricing.ts";

test("expectedSkips grows with decay and stays inside 2..15", () => {
  const low = expectedSkips(0.70);
  const high = expectedSkips(0.86);
  assert.ok(low >= 2 && high <= 15);
  assert.ok(high > low);
});

test("estimated throw score strictly increases along the ladder", () => {
  for (let index = 1; index < STONES.length; index++) {
    assert.ok(
      estimateThrowScore(STONES[index]) > estimateThrowScore(STONES[index - 1]),
      `${STONES[index].id} estimate should beat ${STONES[index - 1].id}`,
    );
  }
});

test("each stone costs about 4-6 typical throws with the previous stone", () => {
  for (let index = 1; index < STONES.length; index++) {
    const ratio = STONES[index].price / estimateThrowScore(STONES[index - 1]);
    assert.ok(ratio >= 3 && ratio <= 8, `${STONES[index].id} ratio ${ratio.toFixed(2)} outside 3..8`);
  }
});
