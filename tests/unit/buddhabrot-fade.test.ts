import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BUDDHABROT_SHADE_DELAY_MS,
  BUDDHABROT_SHADE_FADE_MS,
  BUDDHABROT_SLING_FADE_MS,
  buddhabrotIntroCrossfadeAlpha,
  buddhabrotShadeFadeAlpha,
  buddhabrotSlingFadeAlpha,
} from "../../lib/buddhabrot-fade.ts";
import { BUDDHABROT_OUTLINE_ALPHA } from "../../lib/buddhabrot-outline.ts";
import { INTRO_PLAY_FADE_DELAY_MS, INTRO_PLAY_FADE_MS } from "../../lib/intro-play.ts";

test("cached background Buddha fades in while the intro splat fades out", () => {
  assert.equal(buddhabrotIntroCrossfadeAlpha(0), 0);
  assert.equal(buddhabrotIntroCrossfadeAlpha(INTRO_PLAY_FADE_DELAY_MS), 0);
  const midpoint = buddhabrotIntroCrossfadeAlpha(INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS / 2);
  assert.ok(Math.abs(midpoint - BUDDHABROT_OUTLINE_ALPHA / 2) < 1e-12);
  assert.equal(
    buddhabrotIntroCrossfadeAlpha(INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS),
    BUDDHABROT_OUTLINE_ALPHA,
  );
});

test("cached background Buddha fades out only after sling drag starts", () => {
  assert.equal(buddhabrotSlingFadeAlpha(0), BUDDHABROT_OUTLINE_ALPHA);
  assert.ok(Math.abs(buddhabrotSlingFadeAlpha(BUDDHABROT_SLING_FADE_MS / 2) - BUDDHABROT_OUTLINE_ALPHA / 2) < 1e-12);
  assert.equal(buddhabrotSlingFadeAlpha(BUDDHABROT_SLING_FADE_MS), 0);
});

test("cached background Buddha shade waits, then fades in during rockskipping", () => {
  assert.ok(BUDDHABROT_SHADE_DELAY_MS >= 1000 && BUDDHABROT_SHADE_DELAY_MS <= 2000);
  assert.equal(buddhabrotShadeFadeAlpha(BUDDHABROT_SHADE_DELAY_MS), 0);
  const midpoint = buddhabrotShadeFadeAlpha(BUDDHABROT_SHADE_DELAY_MS + BUDDHABROT_SHADE_FADE_MS / 2);
  assert.ok(Math.abs(midpoint - BUDDHABROT_OUTLINE_ALPHA / 2) < 1e-12);
  assert.equal(
    buddhabrotShadeFadeAlpha(BUDDHABROT_SHADE_DELAY_MS + BUDDHABROT_SHADE_FADE_MS),
    BUDDHABROT_OUTLINE_ALPHA,
  );
});

test("the game keeps the cached Buddha after intro and starts fading it on sling drag", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /resetBuddhabrotFadeRef\.current = \(\) => \{/);
  assert.match(source, /buddhabrotSlingFadeStarted = 0/);
  assert.match(source, /buddhabrotBackgroundRevealed = true/);
  assert.match(source, /resetBuddhabrotFadeRef\.current\(\);/);
  assert.match(source, /buddhabrotIntroCrossfadeAlpha\(now - buddhabrotIntroFadeStarted\)/);
  assert.match(source, /buddhabrotBackgroundRevealed/);
  assert.match(source, /buddhabrotSlingFadeAlpha\(now - buddhabrotSlingFadeStarted\)/);
  assert.match(source, /buddhabrotShadeFadeStarted = performance\.now\(\)/);
  assert.match(source, /buddhabrotShadeFadeAlpha\(now - buddhabrotShadeFadeStarted\)/);
  assert.match(source, /buddhabrotSlingFadeStarted = performance\.now\(\)/);
  assert.match(source, /ctx\.globalAlpha = alpha/);
  assert.match(source, /drawBuddhabrotOutline\(now\)/);
});
