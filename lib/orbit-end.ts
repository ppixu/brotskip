/** Shared stop rules for GPU trails and CPU scoring. */

export const ESCAPE_RADIUS_SQ = 4;
export const TINY_HOP_PX = 0.04;
export const TINY_HOP_STREAK = 500;
export const OFFSCREEN_STREAK = 800;

export type OrbitEndInput = {
  magSq: number;
  hopPx: number;
  onScreen: boolean;
  offscreenStreak: number;
  tinyHopStreak: number;
  maxHopPx: number;
};

export type OrbitEndResult = {
  resolved: boolean;
  offscreenStreak: number;
  tinyHopStreak: number;
};

export function updateOrbitEnd(input: OrbitEndInput): OrbitEndResult {
  const offscreenStreak = input.onScreen ? 0 : input.offscreenStreak + 1;
  const tinyHopStreak = input.hopPx <= TINY_HOP_PX ? input.tinyHopStreak + 1 : 0;
  const invalid = !Number.isFinite(input.hopPx) || !Number.isFinite(input.magSq);
  const escaped = input.magSq > ESCAPE_RADIUS_SQ;
  const converged = tinyHopStreak >= TINY_HOP_STREAK;
  const gone = offscreenStreak >= OFFSCREEN_STREAK;
  return {
    resolved: invalid || escaped || converged || gone,
    offscreenStreak,
    tinyHopStreak,
  };
}
