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
  { id: "river-stone", name: "River Stone", rarity: "common", tint: [158, 163, 176], tintStrength: 0.06, dots: 12, depthCap: 250_000, skipDecay: 0.72, shapeIndex: 1, price: 2709830 },
  { id: "slate", name: "Slate", rarity: "uncommon", tint: [110, 231, 160], tintStrength: 0.12, dots: 20, depthCap: 1_000_000, skipDecay: 0.74, shapeIndex: 2, price: 6263685 },
  { id: "jade", name: "Jade", rarity: "uncommon", tint: [52, 211, 153], tintStrength: 0.18, dots: 28, depthCap: 2_000_000, skipDecay: 0.76, shapeIndex: 3, price: 23144530 },
  { id: "azurite", name: "Azurite", rarity: "rare", tint: [96, 165, 250], tintStrength: 0.24, dots: 40, depthCap: 10_000_000, skipDecay: 0.78, shapeIndex: 4, price: 52186315 },
  { id: "meteorite", name: "Meteorite", rarity: "rare", tint: [59, 130, 246], tintStrength: 0.30, dots: 56, depthCap: 50_000_000, skipDecay: 0.80, shapeIndex: 5, price: 236145775 },
  { id: "amethyst", name: "Amethyst", rarity: "epic", tint: [192, 132, 252], tintStrength: 0.38, dots: 80, depthCap: 200_000_000, skipDecay: 0.83, shapeIndex: 6, price: 1235460845 },
  { id: "philosopher", name: "Philosopher's Stone", rarity: "legendary", tint: [250, 204, 21], tintStrength: 0.46, dots: 128, depthCap: 2_000_000_000, skipDecay: 0.86, shapeIndex: 7, price: 6435949315 },
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
