export const DEPTH_OPTIONS = [
  10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000,
  5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000, 200_000_000,
  500_000_000, 1_000_000_000, 2_000_000_000,
] as const;

export const MIN_ACCELERATION = 0.5;
export const MAX_ACCELERATION = 90;
export const DEFAULT_ACCELERATION = 30;
export const BASE_STEPS_PER_SOURCE = 4;
export const FAST_FORWARD_MULTIPLIER = 10;

export function clampAcceleration(value: number): number {
  const rounded = Math.round((Number(value) || DEFAULT_ACCELERATION) * 10) / 10;
  return Math.max(MIN_ACCELERATION, Math.min(MAX_ACCELERATION, rounded));
}

export function acceleratedSteps(depth: number, maxDepth: number, budget: number, multiplier: number): number {
  const progress = Math.max(0, Math.min(1, depth / Math.max(maxDepth, 1)));
  const safeMultiplier = Math.max(1, Number.isFinite(multiplier) ? multiplier : 1);
  const steps = BASE_STEPS_PER_SOURCE * Math.pow(safeMultiplier, progress);
  return Math.min(budget, Math.max(BASE_STEPS_PER_SOURCE, Math.floor(steps)));
}

export function fastForwardSteps(depth: number, maxDepth: number, budget: number, multiplier: number): number {
  return Math.min(budget, acceleratedSteps(depth, maxDepth, budget, multiplier) * FAST_FORWARD_MULTIPLIER);
}
