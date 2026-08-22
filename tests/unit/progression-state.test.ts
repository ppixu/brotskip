import assert from "node:assert/strict";
import test from "node:test";
import { STONES, STARTER_STONE_ID } from "../../lib/progression/stones.ts";
import {
  buy,
  completeChallenges,
  earn,
  equip,
  freshProgression,
  sanitizeProgression,
  updateStreak,
} from "../../lib/progression/state.ts";

test("fresh state owns and equips the starter with an empty wallet", () => {
  const state = freshProgression();
  assert.deepEqual(state.ownedIds, [STARTER_STONE_ID]);
  assert.equal(state.equippedId, STARTER_STONE_ID);
  assert.equal(state.wallet, 0);
  assert.equal(state.lifetime, 0);
  assert.equal(state.collectableStreak, 0);
});

test("earn adds to wallet and lifetime, ignores junk", () => {
  const state = earn(freshProgression(), 1234.7);
  assert.equal(state.wallet, 1234);
  assert.equal(state.lifetime, 1234);
  assert.equal(earn(state, -5), state);
  assert.equal(earn(state, Number.NaN), state);
});

test("buy checks funds and duplicates, spends wallet only", () => {
  const target = STONES[1];
  const broke = freshProgression();
  assert.equal(buy(broke, target.id), broke);
  const funded = earn(freshProgression(), target.price);
  const bought = buy(funded, target.id);
  assert.equal(bought.wallet, 0);
  assert.equal(bought.lifetime, funded.lifetime);
  assert.ok(bought.ownedIds.includes(target.id));
  assert.equal(buy(bought, target.id), bought);
  assert.equal(buy(funded, "nope"), funded);
});

test("equip requires ownership", () => {
  const state = freshProgression();
  assert.equal(equip(state, STONES[2].id), state);
  const owned = buy(earn(state, STONES[1].price), STONES[1].id);
  assert.equal(equip(owned, STONES[1].id).equippedId, STONES[1].id);
});

test("completeChallenges pays each bounty once into the wallet only", () => {
  const first = completeChallenges(freshProgression(), [{ id: "a", bounty: 500 }]);
  assert.equal(first.wallet, 500);
  assert.equal(first.lifetime, 0);
  assert.deepEqual(first.completedChallengeIds, ["a"]);
  assert.equal(completeChallenges(first, [{ id: "a", bounty: 500 }]), first);
});

test("updateStreak counts hits and resets on a miss", () => {
  let state = updateStreak(freshProgression(), true);
  state = updateStreak(state, true);
  assert.equal(state.collectableStreak, 2);
  assert.equal(updateStreak(state, false).collectableStreak, 0);
});

test("sanitize drops unknown ids, keeps starter, survives garbage", () => {
  const garbage = sanitizeProgression({
    wallet: -3, lifetime: "x", ownedIds: ["ghost", STONES[1].id, STONES[1].id],
    equippedId: "ghost", completedChallengeIds: ["gone", "kept"], collectableStreak: -2,
  }, ["kept"]);
  assert.deepEqual(garbage.ownedIds, [STARTER_STONE_ID, STONES[1].id]);
  assert.equal(garbage.equippedId, STARTER_STONE_ID);
  assert.equal(garbage.wallet, 0);
  assert.equal(garbage.lifetime, 0);
  assert.deepEqual(garbage.completedChallengeIds, ["kept"]);
  assert.equal(garbage.collectableStreak, 0);
  assert.deepEqual(sanitizeProgression(null), freshProgression());
  assert.deepEqual(sanitizeProgression("weird"), freshProgression());
});
