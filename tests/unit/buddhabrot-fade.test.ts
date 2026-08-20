import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buddhabrotBackgroundAlpha } from "../../lib/buddhabrot-fade.ts";
import { BUDDHABROT_OUTLINE_ALPHA } from "../../lib/buddhabrot-outline.ts";
import { INTRO_PLAY_FADE_DELAY_MS, INTRO_PLAY_FADE_MS } from "../../lib/intro-play.ts";

test("cached background Buddha fades smoothly before the flashlight handoff", () => {
  assert.equal(buddhabrotBackgroundAlpha(0), BUDDHABROT_OUTLINE_ALPHA);
  assert.equal(buddhabrotBackgroundAlpha(INTRO_PLAY_FADE_DELAY_MS), BUDDHABROT_OUTLINE_ALPHA);
  const midpoint = buddhabrotBackgroundAlpha(INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS / 2);
  assert.ok(Math.abs(midpoint - BUDDHABROT_OUTLINE_ALPHA / 2) < 1e-12);
  assert.equal(buddhabrotBackgroundAlpha(INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS), 0);
});

test("the game draws the cached Buddha with the time-based fade", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /buddhabrotBackgroundAlpha\(now - buddhabrotFadeStarted\)/);
  assert.match(source, /ctx\.globalAlpha = alpha/);
  assert.match(source, /drawBuddhabrotOutline\(now\)/);
});
