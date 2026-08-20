import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_PLAY_ALIGN_MS,
  INTRO_PLAY_EXIT_MS,
  INTRO_PLAY_FADE_DELAY_MS,
  INTRO_PLAY_FADE_MS,
  INTRO_PLAY_FOV,
  PLAY_POND_VIEW,
  complexToSplat,
  introPlayAlignT,
  introPlayCamera,
  introPlayFlatten,
  lerpIntroCamera,
  lerpView,
  playAlignYaw,
  splatDistanceForHalfY,
} from "../../lib/intro-play.ts";

test("play camera looks at the splat point for the pond center, scaled to the play view", () => {
  assert.equal(PLAY_POND_VIEW.centerX, -0.58);
  assert.equal(PLAY_POND_VIEW.centerY, 0);
  assert.equal(PLAY_POND_VIEW.halfY, 0.8);
  const target = complexToSplat(PLAY_POND_VIEW.centerX, PLAY_POND_VIEW.centerY);
  assert.equal(target.x, 0);
  assert.ok(Math.abs(target.y - 0.08) < 1e-9);
  assert.equal(target.z, 0);
  const camera = introPlayCamera(PLAY_POND_VIEW);
  assert.equal(camera.pitch, 0);
  assert.ok(Math.abs(camera.distance - splatDistanceForHalfY(PLAY_POND_VIEW.halfY, INTRO_PLAY_FOV)) < 1e-9);
  assert.ok(Math.abs(camera.target.y - target.y) < 1e-9);
});

test("Play keeps spinning forward to the next face-on yaw so the Gaussian can lie flat", () => {
  const classic = playAlignYaw(0.16);
  const henon = playAlignYaw(0.72);
  assert.ok(classic - 0.16 >= Math.PI / 2);
  assert.ok(henon - 0.72 >= Math.PI / 2);
  assert.ok(Math.abs(((classic % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < 1e-9);
  assert.ok(Math.abs(((henon % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < 1e-9);
  assert.equal(introPlayFlatten(0), 1);
  assert.ok(introPlayFlatten(1) < 0.08);
  assert.ok(introPlayFlatten(0.5) > 0.5);
});

test("play alignment eases from the current orbit to the pond pose, then the overlay can exit", () => {
  assert.ok(INTRO_PLAY_ALIGN_MS >= 1200);
  assert.ok(INTRO_PLAY_FADE_DELAY_MS >= INTRO_PLAY_ALIGN_MS * 0.75);
  assert.ok(INTRO_PLAY_FADE_MS >= 400);
  assert.ok(INTRO_PLAY_EXIT_MS >= INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS);
  assert.equal(introPlayAlignT(0), 0);
  assert.equal(introPlayAlignT(INTRO_PLAY_ALIGN_MS), 1);
  assert.ok(introPlayAlignT(INTRO_PLAY_ALIGN_MS / 2) > 0.4);
  assert.ok(introPlayAlignT(INTRO_PLAY_ALIGN_MS / 2) < 0.6);
  assert.equal(introPlayAlignT(10, true), 1);

  const from = {
    yaw: 0.72,
    pitch: 0.32,
    distance: 5,
    target: { x: 0, y: 0, z: 0 },
  };
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw));
  const mid = lerpIntroCamera(from, to, 0.5);
  assert.ok(mid.yaw > from.yaw);
  assert.ok(mid.distance < 5);
  assert.ok(mid.target.y > 0);

  const viewMid = lerpView(
    { centerX: -0.55, centerY: 0, halfY: 1.52 },
    PLAY_POND_VIEW,
    0.5,
  );
  assert.ok(Math.abs(viewMid.centerX - (-0.565)) < 1e-9);
  assert.ok(Math.abs(viewMid.halfY - 1.16) < 1e-9);
});
