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
  if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") return freshProgression();
  try {
    return sanitizeProgression(JSON.parse(localStorage.getItem(PROGRESSION_KEY) || "null"), knownChallengeIds);
  } catch {
    return freshProgression();
  }
}

export function storeProgression(state: ProgressionState): void {
  if (typeof localStorage === "undefined" || typeof localStorage.setItem !== "function") return;
  try { localStorage.setItem(PROGRESSION_KEY, JSON.stringify(state)); } catch { /* progression still works for this session */ }
}
