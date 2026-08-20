import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_PLAY_ALIGN_MS,
  INTRO_PLAY_EXIT_MS,
  INTRO_PLAY_FADE_DELAY_MS,
  INTRO_PLAY_FADE_MS,
  INTRO_PLAY_VIEW,
  introPlayAlignT,
  lerpIntroCamera,
} from "../../lib/intro-play.ts";

test("play alignment is a frontal view of the rotated z-plane, matching the pond Buddha", () => {
  assert.equal(INTRO_PLAY_VIEW.yaw, 0);
  assert.equal(INTRO_PLAY_VIEW.pitch, 0);
  assert.ok(INTRO_PLAY_VIEW.distance.classic < 5);
  assert.ok(INTRO_PLAY_VIEW.distance.classic > 1.6);
  assert.ok(INTRO_PLAY_VIEW.distance.henon < 3.15);
  assert.ok(INTRO_PLAY_VIEW.distance.henon > 1.2);
});

test("play alignment eases from the current orbit to the pond pose, then the overlay can exit", () => {
  assert.ok(INTRO_PLAY_ALIGN_MS >= 700);
  assert.ok(INTRO_PLAY_FADE_DELAY_MS >= 600);
  assert.ok(INTRO_PLAY_FADE_MS >= 400);
  assert.ok(INTRO_PLAY_EXIT_MS >= INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS);
  assert.equal(introPlayAlignT(0), 0);
  assert.equal(introPlayAlignT(INTRO_PLAY_ALIGN_MS), 1);
  assert.ok(introPlayAlignT(INTRO_PLAY_ALIGN_MS / 2) > 0.4);
  assert.ok(introPlayAlignT(INTRO_PLAY_ALIGN_MS / 2) < 0.6);
  assert.equal(introPlayAlignT(10, true), 1);

  const from = { yaw: 0.72, pitch: 0.32, distance: 5 };
  const to = { yaw: 0, pitch: 0, distance: 2.22 };
  const mid = lerpIntroCamera(from, to, 0.5);
  assert.ok(Math.abs(mid.yaw - 0.36) < 1e-9);
  assert.ok(Math.abs(mid.distance - 3.61) < 1e-9);
});
