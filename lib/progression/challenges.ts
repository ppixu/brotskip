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
