# Progression System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the local-first progression system from `docs/superpowers/specs/2026-08-22-progression-design.md`: spendable score wallet, an 8-stone ladder that gates dots/depth/skip-odds/shape/trail tint, semi-rare collectables, and a fixed challenge ladder.

**Architecture:** Pure logic lives in a new `lib/progression/` package (stones, state, challenges, collectables, pricing) tested under `tests/unit/`. `app/MandelbrotSkipping.tsx` consumes it: the equipped stone clamps effective tuning, biases skip sampling, picks the sacred shape, and tints trails via a new engine `setRarity` uniform. Shop and challenge panels join the existing score rail.

**Tech Stack:** TypeScript, React (Next.js client component), WebGPU/WGSL, node:test with `--experimental-strip-types`.

## Global Constraints

- The `main` branch moves under other concurrent sessions. Never edit by line number alone: locate every edit anchor by the exact quoted code string immediately before editing. If an anchor string is missing, stop, re-grep, and adapt — do not guess.
- Lib-to-lib imports use relative paths with the `.ts` extension (`import { X } from "../orbit-tuning.ts"`), because the node test runner cannot resolve the `@/` alias. The component imports libs via `@/lib/...`.
- Test command per task: `npm run test:unit`. Before the final commit of the whole plan: `npm test` (unit + build + rendered-html) must pass.
- No new npm dependencies.
- Progression persists under localStorage key `mandelbrot-skipping:progression:v1`. Guard `typeof localStorage === "undefined"` in lib load/store functions.
- Repo-visible text (commit messages, code comments, UI copy) is normal English.
- Commit after each task with the message given in the task.

---

### Task 1: Stone catalog and pricing

**Files:**
- Create: `lib/progression/stones.ts`
- Create: `lib/progression/pricing.ts`
- Test: `tests/unit/progression-stones.test.ts`
- Test: `tests/unit/progression-pricing.test.ts`

**Interfaces:**
- Consumes: `DEPTH_OPTIONS` from `../orbit-tuning.ts`; `MIN_SKIPS`, `MAX_SKIPS` from `../skip-count.ts`.
- Produces: `StoneDef`, `StoneRarity`, `STONES`, `STARTER_STONE_ID`, `stoneById(id)`, `nextStone(id)`, `clampTuningToStone(tuning, stone)` from `stones.ts`; `expectedSkips(decay)`, `estimateThrowScore(stone)`, `suggestedPrice(previous)` from `pricing.ts`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/progression-stones.test.ts`:

```ts
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
```

`tests/unit/progression-pricing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — cannot find `lib/progression/stones.ts`.

- [ ] **Step 3: Write the implementation**

`lib/progression/stones.ts` (prices are 1 for now; Step 5 fills them):

```ts
export type StoneRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type StoneDef = {
  id: string;
  name: string;
  rarity: StoneRarity;
  /** 0-255 RGB mixed into trails so trail color communicates the tier. */
  tint: readonly [number, number, number];
  /** 0..1 mix strength; 0 leaves trails untinted. */
  tintStrength: number;
  dots: number;
  depthCap: number;
  skipDecay: number;
  shapeIndex: number;
  price: number;
};

export const STARTER_STONE_ID = "pebble";

export const STONES: readonly StoneDef[] = [
  { id: "pebble", name: "Pebble", rarity: "common", tint: [158, 163, 176], tintStrength: 0, dots: 8, depthCap: 100_000, skipDecay: 0.70, shapeIndex: 0, price: 0 },
  { id: "river-stone", name: "River Stone", rarity: "common", tint: [158, 163, 176], tintStrength: 0.06, dots: 12, depthCap: 250_000, skipDecay: 0.72, shapeIndex: 1, price: 1 },
  { id: "slate", name: "Slate", rarity: "uncommon", tint: [110, 231, 160], tintStrength: 0.12, dots: 20, depthCap: 1_000_000, skipDecay: 0.74, shapeIndex: 2, price: 1 },
  { id: "jade", name: "Jade", rarity: "uncommon", tint: [52, 211, 153], tintStrength: 0.18, dots: 28, depthCap: 2_000_000, skipDecay: 0.76, shapeIndex: 3, price: 1 },
  { id: "azurite", name: "Azurite", rarity: "rare", tint: [96, 165, 250], tintStrength: 0.24, dots: 40, depthCap: 10_000_000, skipDecay: 0.78, shapeIndex: 4, price: 1 },
  { id: "meteorite", name: "Meteorite", rarity: "rare", tint: [59, 130, 246], tintStrength: 0.30, dots: 56, depthCap: 50_000_000, skipDecay: 0.80, shapeIndex: 5, price: 1 },
  { id: "amethyst", name: "Amethyst", rarity: "epic", tint: [192, 132, 252], tintStrength: 0.38, dots: 80, depthCap: 200_000_000, skipDecay: 0.83, shapeIndex: 6, price: 1 },
  { id: "philosopher", name: "Philosopher's Stone", rarity: "legendary", tint: [250, 204, 21], tintStrength: 0.46, dots: 128, depthCap: 2_000_000_000, skipDecay: 0.86, shapeIndex: 7, price: 1 },
];

export function stoneById(id: string): StoneDef {
  return STONES.find((stone) => stone.id === id) ?? STONES[0];
}

export function nextStone(id: string): StoneDef | null {
  const index = STONES.findIndex((stone) => stone.id === id);
  if (index === -1 || index + 1 >= STONES.length) return null;
  return STONES[index + 1];
}

export function clampTuningToStone<T extends { sourceDots: number; maxDepth: number }>(tuning: T, stone: StoneDef): T {
  return {
    ...tuning,
    sourceDots: Math.min(tuning.sourceDots, stone.dots),
    maxDepth: Math.min(tuning.maxDepth, stone.depthCap),
  };
}
```

`lib/progression/pricing.ts`:

```ts
import { MAX_SKIPS, MIN_SKIPS } from "../skip-count.ts";
import type { StoneDef } from "./stones.ts";

// Simplified income model used only to calibrate stone prices. The depth term
// mirrors scoreForOrbit in app/MandelbrotSkipping.tsx (0.03 * depth + 75 * sqrt(depth));
// survival and glyph constants are documented assumptions, not measurements.
const DEPTH_SURVIVAL = 0.25;
const SHALLOW_FRACTION = 0.05;
const GLYPH_BONUS = 25_000;
const PRICE_THROWS = 5;

export function expectedSkips(decay: number): number {
  let total = 0;
  let weighted = 0;
  for (let count = MIN_SKIPS; count <= MAX_SKIPS; count++) {
    const weight = decay ** (count - MIN_SKIPS);
    total += weight;
    weighted += count * weight;
  }
  return weighted / total;
}

function depthTerm(depth: number): number {
  return depth * 0.03 + Math.sqrt(depth) * 75;
}

export function estimateThrowScore(stone: StoneDef): number {
  const skips = expectedSkips(stone.skipDecay);
  const meanSkipMultiplier = 1 + (skips - 1) * 0.06;
  const perOrbit = DEPTH_SURVIVAL * depthTerm(stone.depthCap)
    + (1 - DEPTH_SURVIVAL) * depthTerm(stone.depthCap * SHALLOW_FRACTION);
  return Math.round(skips * (stone.dots * perOrbit * meanSkipMultiplier + GLYPH_BONUS));
}

export function suggestedPrice(previous: StoneDef): number {
  return Math.round(PRICE_THROWS * estimateThrowScore(previous));
}
```

- [ ] **Step 4: Generate the real prices**

Run:

```bash
node --experimental-strip-types --input-type=module --eval "const s = await import('./lib/progression/stones.ts'); const p = await import('./lib/progression/pricing.ts'); s.STONES.forEach((stone, i) => console.log(stone.id.padEnd(14), 'estimate', p.estimateThrowScore(stone), i + 1 < s.STONES.length ? '-> next price ' + p.suggestedPrice(stone) : ''));"
```

Copy each printed `next price` value into the following stone's `price` field in `STONES` (River Stone gets Pebble's suggested price, and so on). Keep Pebble at 0.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS, including the 3..8 price-ratio band.

- [ ] **Step 6: Commit**

```bash
git add lib/progression/stones.ts lib/progression/pricing.ts tests/unit/progression-stones.test.ts tests/unit/progression-pricing.test.ts
git commit -m "Add progression stone catalog with calibrated prices"
```

---

### Task 2: Progression state and reducers

**Files:**
- Create: `lib/progression/state.ts`
- Test: `tests/unit/progression-state.test.ts`

**Interfaces:**
- Consumes: `STONES`, `STARTER_STONE_ID` from `./stones.ts`.
- Produces: `ProgressionState`, `ChallengeAward`, `PROGRESSION_KEY`, `freshProgression()`, `sanitizeProgression(value, knownChallengeIds?)`, `earn(state, score)`, `buy(state, stoneId)`, `equip(state, stoneId)`, `completeChallenges(state, awards)`, `updateStreak(state, hitCollectable)`, `loadProgression(knownChallengeIds?)`, `storeProgression(state)`. All reducers return the same state reference when nothing changes.

- [ ] **Step 1: Write the failing test**

`tests/unit/progression-state.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find `lib/progression/state.ts`.

- [ ] **Step 3: Write the implementation**

`lib/progression/state.ts`:

```ts
import { STONES, STARTER_STONE_ID } from "./stones.ts";

export type ProgressionState = {
  version: 1;
  wallet: number;
  lifetime: number;
  ownedIds: string[];
  equippedId: string;
  completedChallengeIds: string[];
  collectableStreak: number;
};

export type ChallengeAward = { id: string; bounty: number };

export const PROGRESSION_KEY = "mandelbrot-skipping:progression:v1";
const MAX_TOTAL = Number.MAX_SAFE_INTEGER;
const MAX_STREAK = 10_000;

export function freshProgression(): ProgressionState {
  return {
    version: 1,
    wallet: 0,
    lifetime: 0,
    ownedIds: [STARTER_STONE_ID],
    equippedId: STARTER_STONE_ID,
    completedChallengeIds: [],
    collectableStreak: 0,
  };
}

function clampTotal(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.min(Math.floor(numeric), MAX_TOTAL);
}

export function sanitizeProgression(value: unknown, knownChallengeIds?: readonly string[]): ProgressionState {
  if (!value || typeof value !== "object") return freshProgression();
  const item = value as Partial<ProgressionState>;
  const ownedIds = Array.isArray(item.ownedIds)
    ? [...new Set(item.ownedIds.filter((id): id is string =>
        typeof id === "string" && STONES.some((stone) => stone.id === id)))]
    : [];
  if (!ownedIds.includes(STARTER_STONE_ID)) ownedIds.unshift(STARTER_STONE_ID);
  const equippedId = typeof item.equippedId === "string" && ownedIds.includes(item.equippedId)
    ? item.equippedId
    : STARTER_STONE_ID;
  const completedChallengeIds = Array.isArray(item.completedChallengeIds)
    ? [...new Set(item.completedChallengeIds.filter((id): id is string =>
        typeof id === "string" && (!knownChallengeIds || knownChallengeIds.includes(id))))]
    : [];
  return {
    version: 1,
    wallet: clampTotal(item.wallet),
    lifetime: clampTotal(item.lifetime),
    ownedIds,
    equippedId,
    completedChallengeIds,
    collectableStreak: Math.min(clampTotal(item.collectableStreak), MAX_STREAK),
  };
}

export function earn(state: ProgressionState, score: number): ProgressionState {
  const amount = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
  if (!amount) return state;
  return {
    ...state,
    wallet: Math.min(state.wallet + amount, MAX_TOTAL),
    lifetime: Math.min(state.lifetime + amount, MAX_TOTAL),
  };
}

export function buy(state: ProgressionState, stoneId: string): ProgressionState {
  const stone = STONES.find((candidate) => candidate.id === stoneId);
  if (!stone || state.ownedIds.includes(stoneId) || state.wallet < stone.price) return state;
  return { ...state, wallet: state.wallet - stone.price, ownedIds: [...state.ownedIds, stoneId] };
}

export function equip(state: ProgressionState, stoneId: string): ProgressionState {
  if (!state.ownedIds.includes(stoneId) || state.equippedId === stoneId) return state;
  return { ...state, equippedId: stoneId };
}

export function completeChallenges(state: ProgressionState, awards: readonly ChallengeAward[]): ProgressionState {
  const fresh = awards.filter((award) => !state.completedChallengeIds.includes(award.id));
  if (!fresh.length) return state;
  const bounty = fresh.reduce((sum, award) => sum + Math.max(0, Math.floor(award.bounty)), 0);
  return {
    ...state,
    wallet: Math.min(state.wallet + bounty, MAX_TOTAL),
    completedChallengeIds: [...state.completedChallengeIds, ...fresh.map((award) => award.id)],
  };
}

export function updateStreak(state: ProgressionState, hitCollectable: boolean): ProgressionState {
  const collectableStreak = hitCollectable ? Math.min(state.collectableStreak + 1, MAX_STREAK) : 0;
  if (collectableStreak === state.collectableStreak) return state;
  return { ...state, collectableStreak };
}

export function loadProgression(knownChallengeIds?: readonly string[]): ProgressionState {
  if (typeof localStorage === "undefined") return freshProgression();
  try {
    return sanitizeProgression(JSON.parse(localStorage.getItem(PROGRESSION_KEY) || "null"), knownChallengeIds);
  } catch {
    return freshProgression();
  }
}

export function storeProgression(state: ProgressionState): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(PROGRESSION_KEY, JSON.stringify(state)); } catch { /* progression still works for this session */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/progression/state.ts tests/unit/progression-state.test.ts
git commit -m "Add progression wallet state and reducers"
```

---

### Task 3: Challenge ladder

**Files:**
- Create: `lib/progression/challenges.ts`
- Test: `tests/unit/progression-challenges.test.ts`

**Interfaces:**
- Consumes: `ProgressionState` type from `./state.ts`.
- Produces: `ThrowSummary`, `ChallengeDef`, `CHALLENGES`, `CHALLENGE_IDS`, `evaluateChallenges(summary, state)` (returns only not-yet-completed challenges whose test passes).

- [ ] **Step 1: Write the failing test**

`tests/unit/progression-challenges.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find `lib/progression/challenges.ts`.

- [ ] **Step 3: Write the implementation**

`lib/progression/challenges.ts`:

```ts
import type { ProgressionState } from "./state.ts";

export type ThrowSummary = {
  score: number;
  skips: number;
  deepest: number;
  coverage: number;
  collectablesHit: number;
};

export type ChallengeDef = {
  id: string;
  label: string;
  bounty: number;
  test: (summary: ThrowSummary, state: ProgressionState) => boolean;
};

export const CHALLENGES: readonly ChallengeDef[] = [
  { id: "first-splash", label: "Finish a throw", bounty: 5_000, test: () => true },
  { id: "five-skips", label: "5 skips in one throw", bounty: 50_000, test: (summary) => summary.skips >= 5 },
  { id: "eight-skips", label: "8 skips in one throw", bounty: 1_000_000, test: (summary) => summary.skips >= 8 },
  { id: "sigil-hunter", label: "Hit a collectable", bounty: 100_000, test: (summary) => summary.collectablesHit >= 1 },
  { id: "sigil-streak", label: "Collectables in 3 straight throws", bounty: 2_000_000, test: (_summary, state) => state.collectableStreak >= 3 },
  { id: "megadepth", label: "Reach 1M depth", bounty: 500_000, test: (summary) => summary.deepest >= 1_000_000 },
  { id: "abyssal", label: "Reach 50M depth", bounty: 100_000_000, test: (summary) => summary.deepest >= 50_000_000 },
  { id: "big-splash", label: "Score 10M in one throw", bounty: 5_000_000, test: (summary) => summary.score >= 10_000_000 },
  { id: "collector", label: "Own 3 stones", bounty: 1_000_000, test: (_summary, state) => state.ownedIds.length >= 3 },
  { id: "curator", label: "Own 5 stones", bounty: 50_000_000, test: (_summary, state) => state.ownedIds.length >= 5 },
  { id: "pond-painter", label: "Light 4000 coverage cells", bounty: 2_000_000, test: (summary) => summary.coverage >= 4_000 },
  { id: "pond-legend", label: "1B lifetime score", bounty: 500_000_000, test: (_summary, state) => state.lifetime >= 1_000_000_000 },
];

export const CHALLENGE_IDS = CHALLENGES.map((challenge) => challenge.id);

export function evaluateChallenges(summary: ThrowSummary, state: ProgressionState): ChallengeDef[] {
  return CHALLENGES.filter((challenge) =>
    !state.completedChallengeIds.includes(challenge.id) && challenge.test(summary, state));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/progression/challenges.ts tests/unit/progression-challenges.test.ts
git commit -m "Add fixed challenge ladder with wallet bounties"
```

---

### Task 4: Collectables

**Files:**
- Create: `lib/progression/collectables.ts`
- Test: `tests/unit/progression-collectables.test.ts`

**Interfaces:**
- Consumes: `DEPTH_OPTIONS` from `../orbit-tuning.ts`.
- Produces: `CollectableType`, `Collectable`, `COLLECTABLE_SPAWN_CHANCE`, `COLLECTABLE_RADIUS_PX`, `COLLECTABLE_EXTRA_SKIPS`, `COLLECTABLE_SCORE_MULTIPLIER`, `COLLECTABLE_COLORS`, `rollCollectable(random, width, height)`, `collectableHit(collectable, x, y, radius?)`, `surgedDepth(depthCap)`.

- [ ] **Step 1: Write the failing test**

`tests/unit/progression-collectables.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DEPTH_OPTIONS } from "../../lib/orbit-tuning.ts";
import {
  COLLECTABLE_RADIUS_PX,
  COLLECTABLE_SPAWN_CHANCE,
  collectableHit,
  rollCollectable,
  surgedDepth,
} from "../../lib/progression/collectables.ts";

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("spawn rate tracks the configured chance", () => {
  const random = lcg(11);
  let spawned = 0;
  for (let index = 0; index < 4000; index++) if (rollCollectable(random, 800, 600)) spawned += 1;
  const rate = spawned / 4000;
  assert.ok(Math.abs(rate - COLLECTABLE_SPAWN_CHANCE) < 0.04, `rate ${rate}`);
});

test("spawns land inside the central band and cover all three types", () => {
  const random = lcg(23);
  const types = new Set<string>();
  for (let index = 0; index < 4000; index++) {
    const collectable = rollCollectable(random, 800, 600);
    if (!collectable) continue;
    types.add(collectable.type);
    assert.ok(collectable.x >= 200 && collectable.x <= 600);
    assert.ok(collectable.y >= 120 && collectable.y <= 360);
  }
  assert.deepEqual([...types].sort(), ["depthSurge", "extraSkips", "multiplier"]);
});

test("hit test uses the radius", () => {
  const collectable = { type: "multiplier" as const, x: 100, y: 100 };
  assert.ok(collectableHit(collectable, 100 + COLLECTABLE_RADIUS_PX, 100));
  assert.ok(!collectableHit(collectable, 100 + COLLECTABLE_RADIUS_PX + 1, 100));
});

test("surgedDepth steps one tier and clamps at the top", () => {
  assert.equal(surgedDepth(DEPTH_OPTIONS[0]), DEPTH_OPTIONS[1]);
  const top = DEPTH_OPTIONS[DEPTH_OPTIONS.length - 1];
  assert.equal(surgedDepth(top), top);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find `lib/progression/collectables.ts`.

- [ ] **Step 3: Write the implementation**

`lib/progression/collectables.ts`:

```ts
import { DEPTH_OPTIONS } from "../orbit-tuning.ts";

export type CollectableType = "multiplier" | "extraSkips" | "depthSurge";

export type Collectable = { type: CollectableType; x: number; y: number };

export const COLLECTABLE_SPAWN_CHANCE = 0.25;
export const COLLECTABLE_RADIUS_PX = 26;
export const COLLECTABLE_EXTRA_SKIPS = 2;
export const COLLECTABLE_SCORE_MULTIPLIER = 2;
export const COLLECTABLE_TYPES = ["multiplier", "extraSkips", "depthSurge"] as const;
export const COLLECTABLE_COLORS: Record<CollectableType, string> = {
  multiplier: "#ffd166",
  extraSkips: "#4dd9ff",
  depthSurge: "#c084fc",
};

export function rollCollectable(random: () => number, width: number, height: number): Collectable | null {
  if (random() >= COLLECTABLE_SPAWN_CHANCE) return null;
  const type = COLLECTABLE_TYPES[Math.min(COLLECTABLE_TYPES.length - 1, Math.floor(random() * COLLECTABLE_TYPES.length))];
  return {
    type,
    x: width * (0.25 + random() * 0.5),
    y: height * (0.2 + random() * 0.4),
  };
}

export function collectableHit(collectable: Collectable, x: number, y: number, radius = COLLECTABLE_RADIUS_PX): boolean {
  return Math.hypot(collectable.x - x, collectable.y - y) <= radius;
}

export function surgedDepth(depthCap: number): number {
  const index = DEPTH_OPTIONS.findIndex((option) => option >= depthCap);
  if (index === -1) return depthCap;
  return DEPTH_OPTIONS[Math.min(DEPTH_OPTIONS.length - 1, index + 1)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/progression/collectables.ts tests/unit/progression-collectables.test.ts
git commit -m "Add collectable spawn, hit, and depth-surge helpers"
```

---

### Task 5: Extract sacred geometry to a lib and add the eighth shape

**Files:**
- Create: `lib/sacred-geometry.ts`
- Modify: `app/MandelbrotSkipping.tsx` (remove the moved functions/constants, import them instead)
- Test: `tests/unit/sacred-geometry.test.ts`

**Interfaces:**
- Produces: `GLYPH_COUNT` (stays 7 — the cycling/audio glyph range), `SACRED_SHAPE_COUNT` (8), `SACRED_PATH_COUNTS` (8 entries), `samplePolygon(vertices, t)`, `regularVertices(sides, rotation?)`, `sacredShapeOffset(shape, path, t)`.
- Consumers: `app/MandelbrotSkipping.tsx` (Task 7 uses `shapeIndex` values 0..7 through these).

- [ ] **Step 1: Write the failing test**

`tests/unit/sacred-geometry.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  GLYPH_COUNT,
  SACRED_PATH_COUNTS,
  SACRED_SHAPE_COUNT,
  sacredShapeOffset,
} from "../../lib/sacred-geometry.ts";

test("eight shapes with matching path counts", () => {
  assert.equal(GLYPH_COUNT, 7);
  assert.equal(SACRED_SHAPE_COUNT, 8);
  assert.equal(SACRED_PATH_COUNTS.length, 8);
});

test("every shape, path, and t yields a finite offset within the glyph radius", () => {
  for (let shape = 0; shape < SACRED_SHAPE_COUNT; shape++) {
    for (let path = 0; path < SACRED_PATH_COUNTS[shape]; path++) {
      for (let step = 0; step <= 32; step++) {
        const offset = sacredShapeOffset(shape, path, step / 32);
        assert.ok(Number.isFinite(offset.x) && Number.isFinite(offset.y), `shape ${shape} path ${path}`);
        assert.ok(Math.hypot(offset.x, offset.y) <= 1.35, `shape ${shape} path ${path} radius`);
      }
    }
  }
});

test("the philosopher shape is not a plain copy of the halo", () => {
  const halo = sacredShapeOffset(0, 0, 0.4);
  const philosopher = sacredShapeOffset(7, 2, 0.4);
  assert.ok(Math.hypot(halo.x - philosopher.x, halo.y - philosopher.y) > 0.05);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find `lib/sacred-geometry.ts`.

- [ ] **Step 3: Create the lib**

Create `lib/sacred-geometry.ts` by moving `samplePolygon`, `regularVertices`, and `sacredShapeOffset` from `app/MandelbrotSkipping.tsx` verbatim (anchors: `function samplePolygon(`, `function regularVertices(`, `function sacredShapeOffset(`), plus the constants `GLYPH_COUNT` and `SACRED_PATH_COUNTS` (anchors: `const GLYPH_COUNT = 7;`, `const SACRED_PATH_COUNTS = [2, 2, 2, 4, 2, 3, 7] as const;`). Then, inside the new lib:

- Add `const TAU = Math.PI * 2;` at the top (the lib must not import it from the component).
- Export everything moved.
- Add `export const SACRED_SHAPE_COUNT = 8;`
- Change `SACRED_PATH_COUNTS` to `[2, 2, 2, 4, 2, 3, 7, 3] as const`.
- In `sacredShapeOffset`, change `switch (shape % GLYPH_COUNT)` to `switch (shape % SACRED_SHAPE_COUNT)`, make the flower-of-life branch an explicit `case 6:`, and add the new final branch:

```ts
    default: { // philosopher's seal: outer ring, inner seed, golden spiral
      if (path === 0) return circle(0, 0, 1);
      if (path === 1) return circle(0, 0, .3);
      const angle = t * 3 * TAU;
      const radius = .12 * Math.pow(1.61803, t * 3);
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }
```

- [ ] **Step 4: Rewire the component**

In `app/MandelbrotSkipping.tsx`: delete the moved functions and the two moved constants, and add

```ts
import { GLYPH_COUNT, SACRED_PATH_COUNTS, sacredShapeOffset } from "@/lib/sacred-geometry";
```

Then run `grep -n "samplePolygon\|regularVertices" app/MandelbrotSkipping.tsx` — if any call sites remain, import those names too. The component's own `TAU` constant stays (it has other uses).

- [ ] **Step 5: Run tests and build to verify**

Run: `npm run test:unit && npm run build`
Expected: PASS, clean build.

- [ ] **Step 6: Commit**

```bash
git add lib/sacred-geometry.ts tests/unit/sacred-geometry.test.ts app/MandelbrotSkipping.tsx
git commit -m "Extract sacred geometry to a lib and add the philosopher seal"
```

---

### Task 6: Engine rarity tint

**Files:**
- Modify: `app/MandelbrotSkipping.tsx` (shaders, style buffer, engine API)

**Interfaces:**
- Produces: `OrbitEngine.setRarity(tint: readonly [number, number, number], strength: number)` — tint is 0-255 RGB, strength 0..1; the engine normalizes and clamps. Also `skipTintRgb(skipIndex, colored, rarity?)` gains an optional third parameter `{ tint: readonly [number, number, number]; strength: number }`.
- Consumers: Task 7 calls `setRarity` and passes the rarity argument at `skipTintRgb` call sites.

All edits below are in `app/MandelbrotSkipping.tsx`. Find each anchor by exact string.

- [ ] **Step 1: Extend both WGSL Style structs**

Anchor 1: `struct Style { alpha: f32, pulse: f32, colorMode: f32, sliceEnabled: f32 }` → append the field: `struct Style { alpha: f32, pulse: f32, colorMode: f32, sliceEnabled: f32, rarity: vec4f }`.

Anchor 2: `struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32 }` → `struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32, rarity: vec4f }`.

- [ ] **Step 2: Mix rarity into both shaders**

Point shader — anchor:

```
  let tinted = mix(depthColor, skipTint(skip), style.colorMode);
  let gray = vec3f(mix(0.22, 1.0, t));
  out.color = mix(tinted, gray, style.pulse);
```

Replace with:

```
  let tinted = mix(depthColor, skipTint(skip), style.colorMode);
  let rarityTinted = mix(tinted, style.rarity.rgb, style.rarity.a);
  let gray = vec3f(mix(0.22, 1.0, t));
  out.color = mix(rarityTinted, gray, style.pulse);
```

Line shader — anchor:

```
  out.color = mix(mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth), skipTint(curve.pad), style.colorMode);
```

Replace with:

```
  let baseColor = mix(mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth), skipTint(curve.pad), style.colorMode);
  out.color = mix(baseColor, style.rarity.rgb, style.rarity.a);
```

- [ ] **Step 3: Grow the uniform buffer and write the rarity**

Anchor: `const styleBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });` → change `size: 16` to `size: 32`.

Near the top of `createOrbitEngine`'s mutable state (anchor: `let maxDepth = DEFAULT_TUNING.maxDepth;`), add:

```ts
  let rarityTint: [number, number, number] = [1, 1, 1];
  let rarityStrength = 0;
```

Anchor (in the per-frame `draw()`):

```ts
    device.queue.writeBuffer(styleBuffer, 0, new Float32Array([
      pointEnergy,
      mriEnabled ? 0 : grayscale ? 1 : 0,
      mriEnabled ? 0 : skipColors ? 1 : 0,
      0,
    ]));
```

Replace with:

```ts
    device.queue.writeBuffer(styleBuffer, 0, new Float32Array([
      pointEnergy,
      mriEnabled ? 0 : grayscale ? 1 : 0,
      mriEnabled ? 0 : skipColors ? 1 : 0,
      0,
      rarityTint[0],
      rarityTint[1],
      rarityTint[2],
      mriEnabled ? 0 : rarityStrength,
    ]));
```

- [ ] **Step 4: Add setRarity to the engine object and its type**

In the `type OrbitEngine = {` block (anchor: `setTuning: (tuning: Tuning) => void;`), add:

```ts
  setRarity: (tint: readonly [number, number, number], strength: number) => void;
```

In the returned engine object, right after the `setTuning(tuning) {` method's closing brace, add:

```ts
    setRarity(tint, strength) {
      rarityTint = [tint[0] / 255, tint[1] / 255, tint[2] / 255];
      rarityStrength = Math.max(0, Math.min(1, strength));
    },
```

- [ ] **Step 5: Extend skipTintRgb**

Anchor: `function skipTintRgb(skipIndex: number, colored: boolean): [number, number, number] {` — replace the whole function with:

```ts
function skipTintRgb(
  skipIndex: number,
  colored: boolean,
  rarity?: { tint: readonly [number, number, number]; strength: number },
): [number, number, number] {
  const source = colored ? SKIP_TINTS[(Math.max(1, skipIndex) - 1) % SKIP_TINTS.length] : SKIP_TINTS[0];
  const base: [number, number, number] = [source[0], source[1], source[2]];
  if (!rarity || rarity.strength <= 0) return base;
  return [
    Math.round(base[0] + (rarity.tint[0] - base[0]) * rarity.strength),
    Math.round(base[1] + (rarity.tint[1] - base[1]) * rarity.strength),
    Math.round(base[2] + (rarity.tint[2] - base[2]) * rarity.strength),
  ];
}
```

- [ ] **Step 6: Verify**

Run: `npm run test:unit && npm run build`
Expected: PASS, clean build (rarity strength defaults to 0, so visuals are unchanged until Task 7 wires stones).

- [ ] **Step 7: Commit**

```bash
git add app/MandelbrotSkipping.tsx
git commit -m "Add rarity tint uniform to the orbit engine"
```

---

### Task 7: Wire the equipped stone into the simulation

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`

**Interfaces:**
- Consumes: `STONES`, `stoneById`, `clampTuningToStone`, `STARTER_STONE_ID`, `StoneDef` from `@/lib/progression/stones`; `loadProgression`, `storeProgression`, `freshProgression`, `ProgressionState` from `@/lib/progression/state`; `CHALLENGE_IDS` from `@/lib/progression/challenges`; `MAX_SKIPS` from `@/lib/skip-count`; `expectedSkips` from `@/lib/progression/pricing`.
- Produces (used by Tasks 8-11): component state `progression` + `setProgression`, refs `progressionRef`, `stoneRef`; closure helper `stoneTuning(): Tuning` inside the main game effect.

- [ ] **Step 1: Add imports**

Extend the existing import `import { MIN_SKIPS, sampleSkipCount } from "@/lib/skip-count";` to include `MAX_SKIPS` (used in Task 8; harmless now). Add:

```ts
import { STONES, stoneById, clampTuningToStone, type StoneDef } from "@/lib/progression/stones";
import { expectedSkips } from "@/lib/progression/pricing";
import {
  freshProgression,
  loadProgression,
  storeProgression,
  buy as buyProgression,
  equip as equipProgression,
  earn as earnProgression,
  completeChallenges as completeProgressionChallenges,
  updateStreak as updateProgressionStreak,
  type ProgressionState,
} from "@/lib/progression/state";
import { CHALLENGES, CHALLENGE_IDS, evaluateChallenges, type ThrowSummary } from "@/lib/progression/challenges";
import {
  COLLECTABLE_COLORS,
  COLLECTABLE_EXTRA_SKIPS,
  COLLECTABLE_RADIUS_PX,
  COLLECTABLE_SCORE_MULTIPLIER,
  collectableHit,
  rollCollectable,
  surgedDepth,
  type Collectable,
} from "@/lib/progression/collectables";
```

- [ ] **Step 2: Add React state and refs**

Anchor: `const playerNameRef = useRef("YOU");` — after it add:

```ts
  const [progression, setProgression] = useState<ProgressionState>(freshProgression);
  const progressionRef = useRef<ProgressionState>(progression);
  const stoneRef = useRef<StoneDef>(stoneById(progression.equippedId));
```

Find the mount effect that calls `loadTuning()` (anchor: `setTuning(saved);` followed by `engineRef.current?.setTuning(saved);`). In that same effect, after those lines, add:

```ts
      const savedProgression = loadProgression(CHALLENGE_IDS);
      progressionRef.current = savedProgression;
      setProgression(savedProgression);
      const stone = stoneById(savedProgression.equippedId);
      stoneRef.current = stone;
      engineRef.current?.setTuning(clampTuningToStone(saved, stone));
      engineRef.current?.setRarity(stone.tint, stone.tintStrength);
```

(The second `setTuning` intentionally overwrites the unclamped push just above it.)

- [ ] **Step 3: Add the stoneTuning closure helper**

Inside the main game effect, immediately before `function resetRound() {`, add:

```ts
    function stoneTuning(): Tuning {
      if (spectatorRef.current) return tuningRef.current;
      return clampTuningToStone(tuningRef.current, stoneRef.current);
    }
```

(Task 8 extends this with the depth surge.)

- [ ] **Step 4: Clamp the engine pushes inside the game flow**

- In `resetRound`, anchor `engineRef.current?.setTuning(tuningRef.current);` → `engineRef.current?.setTuning(stoneTuning());`
- In `launchRock`, anchor `engineRef.current?.setTuning(tuningRef.current);` (the one directly after `engineRef.current?.beginThrow(`) → `engineRef.current?.setTuning(stoneTuning());`
- In the intro-exit transition (anchor: `engine?.setTuning(tuningRef.current);` near `engine?.setAtmosphere(PLAY_ATMOSPHERE);`), replace with:

```ts
        engine?.setTuning(clampTuningToStone(tuningRef.current, stoneRef.current));
        engine?.setRarity(stoneRef.current.tint, stoneRef.current.tintStrength);
```

- In the intro-enter branch just above it (anchor: `engine?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH, doublePixels: true });`), add after it: `engine?.setRarity([255, 255, 255], 0);`
- In the `updateTuning` useCallback, anchor `engineRef.current?.setTuning(next);` → `engineRef.current?.setTuning(clampTuningToStone(next, stoneRef.current));`

- [ ] **Step 5: Clamp the CPU simulation reads**

- In `advanceOrbits`, add as the first line of the function: `const depthCap = stoneTuning().maxDepth;` and replace every `tuningRef.current.maxDepth` inside `advanceOrbits` with `depthCap` (three occurrences: the `acceleratedSteps(...)` call, the step-loop condition, and the `orbit.depth >= ... orbit.resolved = true` check).
- In `updateHud`, anchor `Math.min(1, orbit.shownDepth / tuningRef.current.maxDepth)` → `Math.min(1, orbit.shownDepth / stoneTuning().maxDepth)`.
- In `spawnImpact`, anchor `const dots = introActiveRef.current ? INTRO_SOURCE_DOTS : tuningRef.current.sourceDots;` → `const dots = introActiveRef.current ? INTRO_SOURCE_DOTS : stoneTuning().sourceDots;`

- [ ] **Step 6: Stone-driven shape and skip odds**

- In `spawnImpact`, anchor `const glyph = (glyphOffset + index - 1) % GLYPH_COUNT;` → 

```ts
      const glyph = spectatorRef.current || introActiveRef.current
        ? (glyphOffset + index - 1) % GLYPH_COUNT
        : stoneRef.current.shapeIndex;
```

- Still in `spawnImpact`, anchor `gameAudio.splash(index, glyph, ` → `gameAudio.splash(index, glyph % GLYPH_COUNT, ` (the audio engine only knows 7 glyph voices).
- Anchor `plannedSkips = sampleSkipCount(Math.random);` → `plannedSkips = sampleSkipCount(Math.random, stoneRef.current.skipDecay);`
- Wire the rarity into the 2D tints: run `grep -n "skipTintRgb(" app/MandelbrotSkipping.tsx`. At every call site inside the main game effect (skip the function definition), pass a third argument:

```ts
spectatorRef.current || introActiveRef.current ? undefined : { tint: stoneRef.current.tint, strength: stoneRef.current.tintStrength }
```

- [ ] **Step 7: Clamp the tuning sliders**

Before the component's `return (` JSX (anchor: `const depthIndex = Math.max(0, DEPTH_OPTIONS.indexOf(`), add:

```ts
  const equippedStone = stoneById(progression.equippedId);
  const stoneDepthIndex = Math.max(0, DEPTH_OPTIONS.indexOf(equippedStone.depthCap as typeof DEPTH_OPTIONS[number]));
```

In the "Glyph dots" slider, anchor `max={MAX_SOURCE_DOTS}` → `max={Math.min(MAX_SOURCE_DOTS, equippedStone.dots)}`, and its `value={tuning.sourceDots}` → `value={Math.min(tuning.sourceDots, equippedStone.dots)}`.

In the "Orbit limit" slider, anchor `max={DEPTH_OPTIONS.length - 1}` → `max={stoneDepthIndex}`, and its `value={depthIndex}` → `value={Math.min(depthIndex, stoneDepthIndex)}`. Change the visible output `<output>{formatCompact(tuning.maxDepth)}</output>` to `<output>{formatCompact(Math.min(tuning.maxDepth, equippedStone.depthCap))}</output>`.

- [ ] **Step 8: Verify**

Run: `npm run test:unit && npm run build`
Expected: PASS. (Some Step 1 imports are first used in Tasks 8-11. If the lint step in `npm run build` rejects an unused import at this commit, move that specific import to the first step of the task that uses it instead.)

- [ ] **Step 9: Commit**

```bash
git add app/MandelbrotSkipping.tsx
git commit -m "Gate dots, depth, shape, and skip odds behind the equipped stone"
```

---

### Task 8: Collectables in the round loop

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`

**Interfaces:**
- Consumes: collectable helpers imported in Task 7; `stoneTuning()` from Task 7; `MAX_SKIPS` from `@/lib/skip-count`.
- Produces: closure state `collectable`, `collectableHitCount`, `boostMultiplier`, `depthSurge`; `OrbitScore.boost` field. Task 9 reads `collectableHitCount`.

- [ ] **Step 1: Add closure state**

Anchor: `let plannedSkips = MIN_SKIPS;` — after it add:

```ts
    let collectable: Collectable | null = null;
    let collectableHitCount = 0;
    let boostMultiplier = 1;
    let depthSurge = false;
```

- [ ] **Step 2: Extend stoneTuning with the surge**

Replace the Task 7 `stoneTuning` body with:

```ts
    function stoneTuning(): Tuning {
      if (spectatorRef.current) return tuningRef.current;
      const clamped = clampTuningToStone(tuningRef.current, stoneRef.current);
      if (!depthSurge) return clamped;
      return { ...clamped, maxDepth: surgedDepth(clamped.maxDepth) };
    }
```

- [ ] **Step 3: Spawn and reset per round**

In `resetRound`, anchor `rock = { x: a.x, y: a.y, vx: 0, vy: 0, z: 0, vz: 0, spin: 0, skips: 0, bounceAge: 10 };` — after it add:

```ts
      collectable = spectatorRef.current || introActiveRef.current
        ? null
        : rollCollectable(Math.random, width, height);
      collectableHitCount = 0;
      boostMultiplier = 1;
      depthSurge = false;
```

- [ ] **Step 4: Add the boost field to orbits**

In the `type OrbitScore = {` block, add `boost: number;`. In `spawnImpact`, inside the `orbitScores.push({` literal (anchor: `resolved: false, score: 0,`), add `boost: boostMultiplier,`.

Multiply at the three scoring sites (find with `grep -n "scoreForOrbit(orbit" app/MandelbrotSkipping.tsx`):
- live HUD reduce: `scoreForOrbit(orbit, orbit.shownDepth)` → `scoreForOrbit(orbit, orbit.shownDepth) * orbit.boost`
- both `orbit.score = scoreForOrbit(orbit, orbit.depth);` sites → `orbit.score = scoreForOrbit(orbit, orbit.depth) * orbit.boost;`

- [ ] **Step 5: Hit test on bounce**

In `simulate`, anchor `spawnImpact(rock.x, rock.y, rock.skips, shapeOffset, now);` — after it add:

```ts
        if (collectable && collectableHit(collectable, rock.x, rock.y)) {
          const type = collectable.type;
          collectable = null;
          collectableHitCount += 1;
          if (type === "multiplier") boostMultiplier = COLLECTABLE_SCORE_MULTIPLIER;
          if (type === "extraSkips") plannedSkips = Math.min(MAX_SKIPS, plannedSkips + COLLECTABLE_EXTRA_SKIPS);
          if (type === "depthSurge") {
            depthSurge = true;
            engineRef.current?.setTuning(stoneTuning());
          }
          if ("vibrate" in navigator) navigator.vibrate?.(30);
        }
```

- [ ] **Step 6: Draw the sigil**

In the main per-frame 2D render function (the one containing `ctx.drawImage(previewCanvas, 0, 0, width, height);`), after the background/preview layers are drawn and before the rock is drawn, add:

```ts
      if (collectable && !introActiveRef.current && (phase === "ready" || phase === "aiming" || phase === "flying")) {
        const pulse = 1 + Math.sin(now / 240) * 0.18;
        const sigilColor = COLLECTABLE_COLORS[collectable.type];
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = sigilColor;
        ctx.shadowColor = sigilColor;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(collectable.x, collectable.y, COLLECTABLE_RADIUS_PX * 0.55 * pulse, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(collectable.x, collectable.y, COLLECTABLE_RADIUS_PX * 0.22 * pulse, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
```

Placement acceptance: the sigil is visible during ready, aiming, and flying; it sits above the pond layers but below the HUD overlays. If `now` is not in scope at the chosen spot, use `performance.now()` instead.

- [ ] **Step 7: Verify**

Run: `npm run test:unit && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/MandelbrotSkipping.tsx
git commit -m "Spawn collectables and apply their round boosts"
```

---

### Task 9: Earn, evaluate, and toast at settle

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`

**Interfaces:**
- Consumes: reducers imported in Task 7 (`earnProgression`, `updateProgressionStreak`, `completeProgressionChallenges`, `evaluateChallenges`, `storeProgression`), `collectableHitCount` from Task 8.
- Produces: component state `challengeToast` (string | null) used by the toast render.

- [ ] **Step 1: Add toast state**

Next to the progression state from Task 7 add:

```ts
  const [challengeToast, setChallengeToast] = useState<string | null>(null);
```

And near the other top-level effects add the auto-clear:

```ts
  useEffect(() => {
    if (!challengeToast) return;
    const timer = window.setTimeout(() => setChallengeToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [challengeToast]);
```

- [ ] **Step 2: Settle integration in finishRound**

In `finishRound`, anchor `setHud({ phase, score: total, skips: rock.skips, deepest, progress: 1, coverage, spread });` — immediately before it add:

```ts
      if (!spectatorRef.current && !introActiveRef.current) {
        const summary: ThrowSummary = {
          score: total, skips: rock.skips, deepest, coverage,
          collectablesHit: collectableHitCount,
        };
        let nextProgression = updateProgressionStreak(progressionRef.current, collectableHitCount > 0);
        nextProgression = earnProgression(nextProgression, total);
        const earnedChallenges = evaluateChallenges(summary, nextProgression);
        nextProgression = completeProgressionChallenges(nextProgression, earnedChallenges);
        progressionRef.current = nextProgression;
        setProgression(nextProgression);
        storeProgression(nextProgression);
        if (earnedChallenges.length) {
          setChallengeToast(earnedChallenges
            .map((challenge) => `${challenge.label} +${formatCompact(challenge.bounty)}`)
            .join(" · "));
        }
      }
```

- [ ] **Step 3: Render the toast**

In the JSX, anchor the compact-score overlay block start `{(hud.phase === "flying" || hud.phase === "resolving" || hud.phase === "result") && !intro && (` — immediately before that block add:

```tsx
        {challengeToast && <div className="challengeToast" role="status">{challengeToast}</div>}
```

- [ ] **Step 4: Toast style**

In `app/globals.css`, next to the existing overlay styles, add:

```css
.challengeToast {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(10, 30, 40, .85);
  border: 1px solid rgba(255, 209, 102, .5);
  color: #ffd166;
  font-size: 11px;
  z-index: 30;
}
```

- [ ] **Step 5: Verify**

Run: `npm run test:unit && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/MandelbrotSkipping.tsx app/globals.css
git commit -m "Bank throw scores and challenge bounties at settle"
```

---

### Task 10: Shop panel and wallet display

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `STONES`, `stoneById`, `clampTuningToStone`, `expectedSkips`, reducers from Task 7; `formatNumber`, `formatCompact` already in the component.
- Produces: `applyProgression`, `buyStone`, `equipStone` useCallbacks; `.stonePanel` UI.

- [ ] **Step 1: Add the callbacks**

Next to `updateTuning` (anchor: `const updateTuning = useCallback(`), add:

```ts
  const applyProgression = useCallback((next: ProgressionState) => {
    progressionRef.current = next;
    setProgression(next);
    storeProgression(next);
    const stone = stoneById(next.equippedId);
    stoneRef.current = stone;
    engineRef.current?.setTuning(clampTuningToStone(tuningRef.current, stone));
    engineRef.current?.setRarity(stone.tint, stone.tintStrength);
  }, []);

  const buyStone = useCallback((stoneId: string) => {
    const bought = buyProgression(progressionRef.current, stoneId);
    if (bought === progressionRef.current) return;
    applyProgression(equipProgression(bought, stoneId));
  }, [applyProgression]);

  const equipStone = useCallback((stoneId: string) => {
    applyProgression(equipProgression(progressionRef.current, stoneId));
  }, [applyProgression]);
```

- [ ] **Step 2: Wallet in the live score section**

Anchor: `<span className="liveMeta">` line in the `liveScore` section — after that whole span add:

```tsx
          <span className="walletRow">Wallet <strong>{formatNumber(progression.wallet)}</strong> pts</span>
```

- [ ] **Step 3: Stone panel JSX**

Anchor: `<section className="tuningPanel" aria-label="Orbit tuning">` — immediately before it add:

```tsx
        <section className="stonePanel" aria-label="Stone collection">
          <div className="tuningHeading"><span>Stones</span><span>{progression.ownedIds.length}/{STONES.length}</span></div>
          <div className="stoneList">
            {STONES.map((stone) => {
              const owned = progression.ownedIds.includes(stone.id);
              const isEquipped = progression.equippedId === stone.id;
              const affordable = progression.wallet >= stone.price;
              return (
                <div key={stone.id} className={`stoneCard rarity-${stone.rarity} ${isEquipped ? "equipped" : owned ? "owned" : "locked"}`}>
                  <span className="stoneName">{stone.name}</span>
                  <span className="stoneMeta">{stone.dots} dots · {formatCompact(stone.depthCap)} deep · {expectedSkips(stone.skipDecay).toFixed(1)} avg skips</span>
                  {isEquipped
                    ? <span className="stoneAction stoneEquipped">Equipped</span>
                    : owned
                      ? <button type="button" className="rethrowButton stoneAction" onClick={() => equipStone(stone.id)}>Equip</button>
                      : <button type="button" className="rethrowButton stoneAction" disabled={!affordable} onClick={() => buyStone(stone.id)}>{formatCompact(stone.price)} pts</button>}
                </div>
              );
            })}
          </div>
        </section>
```

- [ ] **Step 4: Styles**

In `app/globals.css`, after the `.tuningPanel` rules, add:

```css
.stonePanel {
  flex: none;
  margin: 0 0 20px;
  padding: 14px 0 16px;
  border-top: 1px solid rgba(255, 255, 255, .09);
}
.stoneList { display: flex; flex-direction: column; gap: 6px; }
.stoneCard {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 10px;
  align-items: center;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
}
.stoneCard.locked { opacity: .62; }
.stoneCard.equipped { border-color: rgba(255, 255, 255, .28); }
.stoneName { font-size: 10px; font-weight: 750; }
.stoneMeta { grid-column: 1; color: #7897a4; font-size: 8.5px; }
.stoneAction { grid-row: 1 / span 2; justify-self: end; font-size: 8.5px; }
.stoneEquipped { color: #dffbff; font-size: 8.5px; letter-spacing: .08em; text-transform: uppercase; }
.rarity-common .stoneName { color: #c3c9d4; }
.rarity-uncommon .stoneName { color: #6ee7a0; }
.rarity-rare .stoneName { color: #60a5fa; }
.rarity-epic .stoneName { color: #c084fc; }
.rarity-legendary .stoneName { color: #facc15; }
.walletRow { color: #7897a4; font-size: 9px; }
.walletRow strong { color: #ffd166; font-variant-numeric: tabular-nums; }
```

Check `app/globals.css` for a light-theme override convention (search `light`); if one exists, add matching overrides so the new panel stays legible in light mode (darken `.stoneMeta`/`.walletRow` grays, keep rarity hues).

- [ ] **Step 5: Verify**

Run: `npm run test:unit && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/MandelbrotSkipping.tsx app/globals.css
git commit -m "Add stone shop panel and wallet display"
```

---

### Task 11: Challenge panel

**Files:**
- Modify: `app/MandelbrotSkipping.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `CHALLENGES` (imported in Task 7), `progression.completedChallengeIds`, `formatCompact`.

- [ ] **Step 1: Panel JSX**

Anchor: `<h2 className="railTitle">Local legends</h2>` — immediately before it add:

```tsx
        <section className="challengePanel" aria-label="Challenges">
          <div className="tuningHeading"><span>Challenges</span><span>{progression.completedChallengeIds.length}/{CHALLENGES.length}</span></div>
          <ul className="challengeList">
            {CHALLENGES.map((challenge) => {
              const done = progression.completedChallengeIds.includes(challenge.id);
              return (
                <li key={challenge.id} className={done ? "challengeDone" : ""}>
                  <span>{challenge.label}</span>
                  <span>{done ? "✓" : `${formatCompact(challenge.bounty)} pts`}</span>
                </li>
              );
            })}
          </ul>
        </section>
```

- [ ] **Step 2: Styles**

In `app/globals.css`, after the `.stonePanel` rules, add:

```css
.challengePanel {
  flex: none;
  margin: 0 0 20px;
  padding: 0 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, .09);
}
.challengeList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.challengeList li { display: flex; justify-content: space-between; gap: 10px; color: #7897a4; font-size: 9px; }
.challengeList li.challengeDone { color: #6ee7a0; }
```

- [ ] **Step 3: Verify**

Run: `npm run test:unit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/MandelbrotSkipping.tsx app/globals.css
git commit -m "Add challenge ladder panel to the score rail"
```

---

### Task 12: Full verification and README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Full test gate**

Run: `npm test`
Expected: unit tests, production build, and the rendered-html check all pass. Fix anything that fails before proceeding.

- [ ] **Step 2: Manual smoke test**

Start the dev server (`npm run dev`) and verify in the browser:

1. Fresh profile (devtools → clear `mandelbrot-skipping:progression:v1`): wallet 0, Pebble equipped, dots slider capped at 8, depth slider capped at 100K.
2. One throw: score lands in the wallet, "Finish a throw" toast appears, challenge list shows 1/12.
3. Sigil appears on some rounds (~1 in 4); hitting it increments nothing visible except its effect (double score, extra skips, or deeper orbits) and disappears.
4. Buy River Stone when affordable: wallet drops, stone auto-equips, trails pick up the tint at higher tiers, slider caps rise.
5. Reload: wallet, owned stones, equipped stone, and completed challenges persist.
6. Shared-throw replay links still play with the sharer's dots (no stone clamp in spectator mode).

- [ ] **Step 3: README note**

In `README.md`, after the Controls section, add:

```markdown
## Progression

Throw scores double as spendable points. Buy better stones to unlock more orbit
dots, deeper iteration caps, better skip odds, new sacred glyph shapes, and
rarity-tinted trails. Glowing sigils sometimes float in the pond — skip the stone
through one for a boost that round. Challenges pay one-time point bounties.
Progress is stored locally on the device.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document the progression system in the README"
```
