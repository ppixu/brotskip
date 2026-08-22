# Progression System Design

Date: 2026-08-22
Status: Approved pending final spec review

## Summary

Add a persistent, local-first progression system to Brotskipping. Players earn spendable
points from throw scores, buy progressively better stones from a fixed ladder, hit
semi-rare collectables mid-throw for one-round boosts, and complete a fixed challenge
ladder for bounties. Existing free access to dots/depth becomes gated by the equipped
stone; the tuning panel becomes unlock-aware.

## Decisions made during brainstorming

- **Currency:** Throw scores double as spendable currency. Every finished throw adds its
  score to both a spendable wallet and a lifetime total. Buying drains the wallet only.
  The lifetime total feeds challenges and records. The leaderboard is unchanged.
- **Gating:** Existing free access is gated. New and existing players start with the
  starter stone. The tuning panel's dots and depth controls clamp to the equipped stone.
- **Stones are items:** A stone bundles all progression stats: sacred shape, source dots,
  depth cap, skip-count odds, and a rarity trail tint. Dots are a stone stat, not a
  separate upgrade track.
- **Catalog:** A hand-made ladder of 8 stones, each strictly better and pricier than the
  last. No sidegrades, no gacha.
- **Skip randomness:** Skip count stays random (existing geometric sampler in
  `lib/skip-count.ts`, 2–15 skips). Better stones raise the decay parameter, flattening
  the distribution so more skips become likelier.
- **Collectables:** Semi-rare field pickups hit by the stone mid-throw; three types
  (score multiplier, extra skips, depth surge).
- **Challenges:** Fixed one-time achievement ladder paying wallet bounties.

## Player-facing rules

### Wallet

Every finished throw adds its score to the spendable wallet and the lifetime total.
Buying a stone subtracts its price from the wallet. The lifetime total never decreases.

### Stone ladder

| # | Stone | Rarity | Dots | Depth cap | Skip decay | Sacred shape |
|---|-------|--------|------|-----------|------------|--------------|
| 1 | Pebble | common (gray) | 8 | 100k | 0.70 | concentric halo |
| 2 | River Stone | common (gray) | 12 | 250k | 0.72 | triangle mandala |
| 3 | Slate | uncommon (green) | 20 | 1M | 0.74 | vesica piscis |
| 4 | Jade | uncommon (green) | 28 | 2M | 0.76 | quad mandala |
| 5 | Azurite | rare (blue) | 40 | 10M | 0.78 | pentagram ring |
| 6 | Meteorite | rare (blue) | 56 | 50M | 0.80 | hexagram seal |
| 7 | Amethyst | epic (purple) | 80 | 200M | 0.83 | seven-fold flower |
| 8 | Philosopher's Stone | legendary (gold) | 128 | 2B | 0.86 | new geometry |

- The Pebble is the starter: free and owned from first launch.
- Depth caps are values from `DEPTH_OPTIONS` in `lib/orbit-tuning.ts`.
- Skip decay is the `sampleSkipCount` decay parameter (today fixed at 0.76).
- Every stat is monotonically non-decreasing down the ladder; prices strictly increase.
- Stones 1–7 use the seven existing sacred shapes in `sacredShapeOffset`; the
  Philosopher's Stone introduces one new geometry.
- Prices are not hand-guessed. They are calibrated during implementation with a
  simulation: estimate the typical throw score per stone from the scoring model, then
  price stone N+1 at roughly 4–6 typical throws with stone N. A unit test documents the
  baseline so future scoring changes surface as a failing pricing test.

### Rarity trail tints

Each stone's rarity color is mixed into the existing skip-tint palette so trails
communicate the equipped stone's tier (e.g. purple trails for the epic stone). The
existing `skipColors` toggle keeps working; the rarity tint applies in both modes.

### Tuning panel

The dots and depth controls clamp to the equipped stone's stats. Values below the cap
remain freely tunable. The effective value used by the simulation is
`min(storedTuningValue, stoneStat)`; stored tuning is never rewritten, so upgrading a
stone restores previous slider headroom. All other tuning controls stay free.

### Collectables

- At throw start, with ~25% probability, one glowing sigil spawns in the pond along the
  aim band, within reachable range.
- Each bounce impact hit-tests against it by distance; a hit consumes it and applies one
  randomly chosen effect for the remainder of that throw:
  - **×2 echo** — remaining impacts score double.
  - **+2 skips** — planned skip count increases by 2, capped at 15.
  - **depth surge** — remaining impacts orbit at one `DEPTH_OPTIONS` tier above the
    stone's depth cap.
- At most one collectable per throw in v1.

### Challenges

A fixed, hand-made ladder of roughly 12 one-time challenges. Each pays a wallet bounty
once, with a completion toast. Initial set (bounties calibrated with pricing):

1. First finished throw
2. 5+ skips in one throw
3. 8+ skips in one throw
4. Hit a collectable
5. Hit a collectable in each of 3 consecutive throws
6. Reach shown depth 1M
7. Reach shown depth 50M
8. Single throw score above a calibrated threshold
9. Own 3 stones
10. Own 5 stones
11. Full coverage on one shape (coverage metric ≥ threshold)
12. Reach a calibrated lifetime total

### New players and existing players

Fresh progression state: Pebble owned and equipped, wallet 0, no challenges complete.
Existing players start the same way; their scores and tuning survive untouched.

## Architecture

New `lib/progression/` package of pure modules (no GPU, no React), mirroring the
existing `lib/skip-count.ts` + `tests/unit` pattern:

- **`stones.ts`** — `StoneDef` type and the 8-stone catalog: id, name, rarity, trail
  tint, dots, depthCap, skipDecay, shapeIndex, price. Helpers `stoneById`, `nextStone`.
- **`state.ts`** — `ProgressionState` { version, wallet, lifetime, ownedIds, equippedId,
  completedChallengeIds, collectableStreak }. The streak counter backs the
  consecutive-collectable challenge and resets on any throw without a pickup. Load/save
  on localStorage key
  `mandelbrot-skipping:progression:v1` with sanitization on load. Pure reducers:
  `earn(state, score)`, `buy(state, stoneId)`, `equip(state, stoneId)`,
  `completeChallenges(state, ids)`.
- **`challenges.ts`** — challenge definitions (id, label, bounty, predicate over a
  `ThrowSummary`), plus `evaluate(summary, state)` returning newly earned ids.
  `ThrowSummary` carries score, skips, deepest shown depth, coverage, and collectables
  hit; the consecutive-collectable streak is read from state.
- **`collectables.ts`** — spawn roll (seeded random, ~25%), type selection, distance hit
  test, and effect descriptors (×2 multiplier, +2 skips, +1 depth tier).

## Integration points in `app/MandelbrotSkipping.tsx`

- Equipped stone clamps effective dots and depth at point of use.
- `sampleSkipCount(Math.random, stone.skipDecay)` replaces the fixed decay constant.
- All impacts of a throw use the equipped stone's sacred shape index.
- `sacredShapeOffset` and `SACRED_PATH_COUNTS` gain an eighth geometry for the
  Philosopher's Stone.
- Rarity tint mixed into skip tints via the existing style uniform buffer.
- Collectable spawns at throw start, rendered as a glowing sigil; bounce impacts
  hit-test it; effects apply to the remainder of the throw.
- On throw settle (where the score commits today): wallet and lifetime earn, challenge
  evaluation, completion toasts, persistence.
- UI: shop panel (ladder cards with stats, price, owned/equipped state, buy button) and
  challenge list as overlay panels alongside the existing tuning panel, available in the
  ready and result phases. Wallet displayed in the HUD.

## Data flow

Progression state loads once at mount into a ref plus React state (the tuning pattern).
The simulation loop reads via the ref; UI actions run reducers, update both, and persist.
Score settle is the single point where earnings and challenge evaluation happen.

## Error handling

- Corrupt or missing localStorage state → fresh starter state; never crash the game.
- Unknown stone or challenge ids in stored state (from future catalog changes) → dropped
  on load; unknown equipped id falls back to Pebble.
- Persistence failures are swallowed (existing `catch {}` pattern); the session still
  plays, progression just does not persist.
- `buy` validates funds and non-ownership; `equip` validates ownership; `earn` caps below
  `Number.MAX_SAFE_INTEGER`.

## Testing

Unit tests in `tests/unit/`, following existing conventions:

- **stones.test.ts** — ladder monotonicity across every stat; strictly increasing
  prices; valid tints; shape indices in range.
- **progression-state.test.ts** — reducers (earn adds to both totals, buy checks funds
  and duplicates, equip requires ownership); sanitization of garbage payloads; fallback
  to starter state.
- **challenges.test.ts** — each predicate fires on the right summary; bounties pay once.
- **collectables.test.ts** — seeded spawn rate; hit radius; effect math (+2 skips caps
  at 15, depth tier clamps to `DEPTH_OPTIONS`).
- **pricing.test.ts** — simulation of typical throw scores per stone documents that
  stone N+1 costs about 4–6 typical throws with stone N.

The existing `npm test` gate (unit tests + build + rendered-html check) stays the
verification command.

## Out of scope for v1

- Rotating or daily challenges (fixed ladder only).
- Multiple collectables per throw.
- Server-side persistence or sync (local-first like scores).
- Sidegrade stones, gacha, or cosmetic-only items.
- Prestige/reset mechanics.
