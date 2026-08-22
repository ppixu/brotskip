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
