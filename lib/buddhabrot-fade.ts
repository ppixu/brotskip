import { BUDDHABROT_OUTLINE_ALPHA } from "./buddhabrot-outline.ts";
import { INTRO_PLAY_FADE_DELAY_MS, INTRO_PLAY_FADE_MS } from "./intro-play.ts";

export const BUDDHABROT_SLING_FADE_MS = 650;
export const BUDDHABROT_SHADE_FADE_MS = 1800;
export const BUDDHABROT_SHADE_GAIN = 0.7;

function smoothstep(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export function buddhabrotIntroCrossfadeAlpha(elapsedMs: number) {
  const progress = Math.max(0, Math.min(1, (elapsedMs - INTRO_PLAY_FADE_DELAY_MS) / INTRO_PLAY_FADE_MS));
  return BUDDHABROT_OUTLINE_ALPHA * smoothstep(progress);
}

export function buddhabrotSlingFadeAlpha(elapsedMs: number) {
  return BUDDHABROT_OUTLINE_ALPHA * (1 - smoothstep(elapsedMs / BUDDHABROT_SLING_FADE_MS));
}

export function buddhabrotShadeFadeAlpha(elapsedMs: number) {
  const progress = Math.max(0, Math.min(1, elapsedMs / BUDDHABROT_SHADE_FADE_MS));
  return BUDDHABROT_OUTLINE_ALPHA * BUDDHABROT_SHADE_GAIN * smoothstep(progress);
}
