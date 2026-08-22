import assert from "node:assert/strict";
import test from "node:test";
import { CHALLENGES, evaluateChallenges, type ThrowSummary } from "../../lib/progression/challenges.ts";
import { completeChallenges, freshProgression } from "../../lib/progression/state.ts";

const quietThrow: ThrowSummary = { score: 1, skips: 2, deepest: 100, coverage: 1, collectablesHit: 0 };

test("ladder has 12 unique, positively paid challenges", () => {
  assert.equal(CHALLENGES.length, 12);
  assert.equal(new Set(CHALLENGES.map((challenge) => challenge.id)).size, 12);
  for (const challenge of CHALLENGES) assert.ok(challenge.bounty > 0, challenge.id);
});

test("a quiet first throw earns exactly the first-splash challenge", () => {
  const earned = evaluateChallenges(quietThrow, freshProgression());
  assert.deepEqual(earned.map((challenge) => challenge.id), ["first-splash"]);
});

test("a monster throw earns the skip, depth, score, and coverage challenges", () => {
  const summary: ThrowSummary = { score: 20_000_000, skips: 9, deepest: 60_000_000, coverage: 5_000, collectablesHit: 1 };
  const ids = evaluateChallenges(summary, freshProgression()).map((challenge) => challenge.id);
  for (const id of ["first-splash", "five-skips", "eight-skips", "sigil-hunter", "megadepth", "abyssal", "big-splash", "pond-painter"]) {
    assert.ok(ids.includes(id), id);
  }
});

test("state-based challenges read streak, ownership, and lifetime", () => {
  const state = { ...freshProgression(), collectableStreak: 3, ownedIds: ["pebble", "river-stone", "slate", "jade", "azurite"], lifetime: 1_000_000_000 };
  const ids = evaluateChallenges(quietThrow, state).map((challenge) => challenge.id);
  for (const id of ["sigil-streak", "collector", "curator", "pond-legend"]) assert.ok(ids.includes(id), id);
});

test("completed challenges never fire again", () => {
  const done = completeChallenges(freshProgression(), CHALLENGES.map(({ id, bounty }) => ({ id, bounty })));
  assert.deepEqual(evaluateChallenges(quietThrow, done), []);
});
