# Prime & Mandelbrot Bonuses — Design

**Goal:** Add a bonus layer and in-game announcements built on real number-theoretic structure of the Mandelbrot set: bulb periods, primality, coprimality (totient), Farey mediants, and Fibonacci bulb chains.

**Status:** Design presented in chat 2026-08-22 and accepted; numbers below are starting points flagged for tuning.

## Background

Per-skip scoring today (`scoreForOrbit` in `app/MandelbrotSkipping.tsx`): depth + coverage + area terms, times a skip-index multiplier. Orbit termination (`lib/orbit-end.ts`) resolves on escape, tiny-hop convergence, offscreen streak, or depth cap. Tiny-hop convergence only catches period-1 attractors — an orbit in a period-q≥2 bulb hops between q distinct points forever and today just grinds to the depth cap. The game therefore already rewards bulb landings (max depth) but never knows the period. Period detection is the one new primitive; everything else hangs off it.

## New primitive: period detection

For each scoring orbit that stays bounded:

- Start checking only once `distanceContraction` has stayed positive for a stretch (the orbit is settling) or depth passes a threshold — escaping orbits never pay the cost.
- Keep a ring buffer of the last 64 z-values (f32 pairs). Every `SCORE_SAMPLE_STRIDE` steps, compare the current z against the buffer with an epsilon; the smallest lag q that matches stably across several consecutive rounds is the period. Detection cap: q ≤ 64.
- A skip's period is the **mode** of detected periods among its orbits, with a quorum: ≥ 50 % of converged orbits must agree (glyph dots can straddle a bulb boundary). No quorum → no bulb bonus, no announcement.
- On detection the orbit may resolve early; its depth score is credited as if it reached the cap, so detection never loses points. Side effect: less CPU burned grinding known-periodic orbits to 2 M iterations.

Test anchors: c = −1 → period 2; c = −0.122561 + 0.744862i (Douady rabbit) → period 3; c = −1.7549 → period 3; a cardioid interior point → period 1.

## Rules & bonuses

| Rule | Trigger | Bonus (initial values) | Expected frequency |
|---|---|---|---|
| Bulb landing | Skip period q ≥ 2 detected | +8,000 × q, times the existing skip-index multiplier | Common (the period-2 disk is large) |
| Prime bulb | q prime | Bulb bonus doubled: +16,000 × q | Common at q = 2, rare and large at q ≥ 5 |
| Coprime chain | Consecutive bulb skips with gcd(qᵢ, qᵢ₊₁) = 1 | Chain length n multiplies each new bulb bonus by n; a shared factor resets | Occasional |
| Farey mediant | Three consecutive bulb skips q₁, q₂, q₁+q₂ | +120,000 | Rare jackpot |
| Fibonacci cascade | Detected periods contain a consecutive Fibonacci run (2,3,5 / 3,5,8 / 5,8,13), in order, any positions | +40,000 × run length | Rare jackpot |
| Prime escape | Deepest *escaped* orbit's escape depth is prime | +75 × √depth | ~7 % of throws at ~1 M depth |
| Prime skips | Final skip count prime (2,3,5,7,11,13) | Final score × 1.05 | ~Half of throws, small on purpose |

All constants live in one tuning block. Scale reference: an inside-set orbit at the default 2 M cap scores ≈ 166 k today.

## Announcements

Transient callout banner, top-center, one at a time with a rarity-priority queue, fade family matching the impact labels, `aria-live="polite"`. Copy:

- `PERIOD 3 BULB` — *orbit locked into a 3-cycle*
- `PRIME BULB — period 5` — *one of φ(5) = 4 five-bulbs on the cardioid*
- `COPRIME CHAIN ×3` — *gcd(3, 5) = 1 — the chain holds*
- `CHAIN BROKEN` — *gcd(2, 4) = 2 — shared factor* (small, quiet)
- `FAREY MEDIANT — 2 ⊕ 3 → 5` — *the biggest bulb between two bulbs*
- `FIBONACCI CASCADE — 2 · 3 · 5` — *Farey addition builds the Fibonacci bulbs*
- `PRIME ESCAPE — 1,299,709 iterations` — *the deepest orbit escaped at a prime*
- `PRIME SKIPS — 7` — *a prime number of skips*

Result panel gains a **Bonuses** breakdown (one line per fired rule) plus one rotating educational footnote with an inline Wikipedia link, e.g. the totient bulb count, or for prime bulbs the necklace fact: *"(2⁵ − 2)/5 = 6 orbits of exact period 5 — Fermat's little theorem, counted by the pond."*

Audio: rarity-tiered stings through the existing `gameAudio` surface — blip for bulb, arpeggio for prime bulb/chain, flourish for Farey/Fibonacci.

## Storage & share compatibility

The bonus total folds into the existing `score`; `ScoreEntry` optionally gains a `bonuses` summary (additive field, old entries remain valid, no version bump). Shared-throw replays recompute bonuses deterministically from the same seed, so existing links keep working.

## Deliberately out of scope

- Internal-angle p/q rotation-number detection (period alone carries the design).
- Any claimed link to prime distribution or zeta zeros (no rigorous basis; the game stays honest).
- Persistent "bulb almanac" collection meta — a possible future layer.

## Testing

- Unit: period detector against the anchor points above (pure function over an iterated sequence); mode-with-quorum vote; gcd chain logic; Fibonacci-run scan; primality helper; bonus arithmetic.
- Manual: land in the period-2 disk (prime bulb at q = 2 announces), verify announcement queue ordering when several rules fire on one throw, verify replay parity on a shared link.
