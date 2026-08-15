export const DEPTH_OPTIONS = [
  10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000,
  5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000, 200_000_000,
] as const;

export const MIN_ACCELERATION = 0.5;
export const MAX_ACCELERATION = 10;
export const DEFAULT_ACCELERATION = 6;
export const BASE_STEPS_PER_SOURCE = 4;

export function clampAcceleration(value: number): number {
  const rounded = Math.round((Number(value) || DEFAULT_ACCELERATION) * 10) / 10;
  return Math.max(MIN_ACCELERATION, Math.min(MAX_ACCELERATION, rounded));
}

export function acceleratedSteps(depth: number, maxDepth: number, budget: number, curve: number): number {
  const progress = Math.max(0, Math.min(1, depth / Math.max(maxDepth, 1)));
  const extra = Math.pow(progress, curve) * Math.max(0, budget - BASE_STEPS_PER_SOURCE);
  return Math.min(budget, Math.max(BASE_STEPS_PER_SOURCE, Math.floor(BASE_STEPS_PER_SOURCE + extra)));
}
