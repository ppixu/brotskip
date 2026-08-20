import { BUDDHABROT_OUTLINE_ALPHA } from "./buddhabrot-outline.ts";
import { INTRO_PLAY_FADE_DELAY_MS, INTRO_PLAY_FADE_MS } from "./intro-play.ts";

export function buddhabrotBackgroundAlpha(elapsedMs: number) {
  const progress = Math.max(0, Math.min(1, (elapsedMs - INTRO_PLAY_FADE_DELAY_MS) / INTRO_PLAY_FADE_MS));
  const eased = progress * progress * (3 - 2 * progress);
  return BUDDHABROT_OUTLINE_ALPHA * (1 - eased);
}
