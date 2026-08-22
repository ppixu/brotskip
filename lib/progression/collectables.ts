import { DEPTH_OPTIONS } from "../orbit-tuning.ts";

export type CollectableType = "multiplier" | "extraSkips" | "depthSurge";

export type Collectable = { type: CollectableType; x: number; y: number };

export const COLLECTABLE_SPAWN_CHANCE = 0.25;
export const COLLECTABLE_RADIUS_PX = 26;
export const COLLECTABLE_DIRECT_HIT_RADIUS_PX = 14;
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
