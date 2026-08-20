import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_PLAY_ALIGN_MS,
  INTRO_PLAY_END_FOV,
  INTRO_PLAY_EXIT_MS,
  INTRO_PLAY_FACE_MS,
  INTRO_PLAY_FADE_DELAY_MS,
  INTRO_PLAY_FADE_MS,
  INTRO_PLAY_FOV,
  PLAY_ALIGN_YAW,
  PLAY_POND_VIEW,
  PLAY_SPLAT_DISTANCE_SCALE,
  PLAY_SPLAT_TARGET_Y_LIFT,
  complexToSplat,
  introPlayAlignT,
  introPlayApparentHalfY,
  introPlayCamera,
  introPlayFaceT,
  introPlayFlatten,
  introPlayPose,
  introPlayZoomT,
  playAlignYaw,
  resolveIntroPlayTune,
  splatDistanceForHalfY,
} from "../../lib/intro-play.ts";

test("play camera uses the tuned pond framing as defaults", () => {
  assert.equal(PLAY_POND_VIEW.centerX, -0.58);
  assert.equal(PLAY_POND_VIEW.centerY, 0);
  assert.equal(PLAY_POND_VIEW.halfY, 0.8);
  const pond = complexToSplat(PLAY_POND_VIEW.centerX, PLAY_POND_VIEW.centerY);
  assert.equal(pond.x, 0);
  assert.ok(Math.abs(pond.y - 0.08) < 1e-9);
  assert.equal(pond.z, 0);
  const camera = introPlayCamera(PLAY_POND_VIEW);
  assert.equal(camera.pitch, 0);
  assert.equal(INTRO_PLAY_FOV, 10);
  assert.equal(INTRO_PLAY_END_FOV, 10);
  assert.equal(camera.fov, INTRO_PLAY_FOV);
  assert.equal(PLAY_SPLAT_DISTANCE_SCALE, 0.71);
  assert.equal(PLAY_SPLAT_TARGET_Y_LIFT, 0.03);
  const halfY = PLAY_POND_VIEW.halfY * PLAY_SPLAT_DISTANCE_SCALE;
  assert.ok(Math.abs(camera.distance - splatDistanceForHalfY(halfY, INTRO_PLAY_FOV)) < 1e-9);
  assert.ok(Math.abs(camera.target.y - (pond.y + PLAY_SPLAT_TARGET_Y_LIFT)) < 1e-9);
  assert.ok(Math.abs(introPlayApparentHalfY(camera) / PLAY_POND_VIEW.halfY - PLAY_SPLAT_DISTANCE_SCALE) < 1e-9);
});

test("Play looks along Z at the Buddhabrot plane, without an extra spin", () => {
  const tau = Math.PI * 2;
  assert.equal(PLAY_ALIGN_YAW, 0);
  const classic = playAlignYaw(0.16);
  const henon = playAlignYaw(0.72);
  const spun = playAlignYaw(5.8);
  assert.ok(Math.abs(classic - PLAY_ALIGN_YAW) < 1e-9);
  assert.ok(Math.abs(henon - PLAY_ALIGN_YAW) < 1e-9);
  assert.ok(Math.abs(classic - 0.16) < Math.PI);
  assert.ok(Math.abs(henon - 0.72) < Math.PI);
  const wrapped = ((spun % tau) + tau) % tau;
  const targetWrapped = ((PLAY_ALIGN_YAW % tau) + tau) % tau;
  assert.ok(Math.abs(wrapped - targetWrapped) < 1e-9);
  assert.ok(Math.abs(spun - 5.8) < Math.PI);
});

test("flatten eases in and out over the whole alignment", () => {
  assert.ok(INTRO_PLAY_FACE_MS < INTRO_PLAY_ALIGN_MS);
  assert.equal(introPlayFlatten(0), 1);
  assert.ok(Math.abs(introPlayFlatten(INTRO_PLAY_ALIGN_MS / 2) - 0.52) < 1e-9);
  assert.ok(introPlayFlatten(INTRO_PLAY_ALIGN_MS / 4) > 0.9, "flatten starts slowly");
  assert.ok(Math.abs(introPlayFlatten(INTRO_PLAY_ALIGN_MS) - 0.04) < 1e-9);
});

test("play alignment zooms and rotates with ease-in-out cubic and holds FOV", () => {
  assert.ok(INTRO_PLAY_ALIGN_MS >= 1600);
  assert.ok(INTRO_PLAY_FADE_DELAY_MS < INTRO_PLAY_ALIGN_MS, "pond Buddha should start showing through during the zoom");
  assert.ok(INTRO_PLAY_FADE_DELAY_MS >= 800);
  assert.ok(INTRO_PLAY_FADE_MS >= 3800, "splat fade should linger");
  assert.ok(INTRO_PLAY_EXIT_MS >= INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS);

  const quarter = INTRO_PLAY_ALIGN_MS / 4;
  const half = INTRO_PLAY_ALIGN_MS / 2;
  assert.equal(introPlayFaceT(0), 0);
  assert.equal(introPlayFaceT(INTRO_PLAY_ALIGN_MS), 1);
  assert.ok(Math.abs(introPlayFaceT(half) - 0.5) < 1e-9);
  assert.ok(introPlayFaceT(quarter) < 0.12, "face turn eases in");
  assert.equal(introPlayZoomT(0), 0);
  assert.equal(introPlayZoomT(INTRO_PLAY_ALIGN_MS), 1);
  assert.ok(Math.abs(introPlayZoomT(half) - 0.5) < 1e-9);
  assert.ok(introPlayZoomT(quarter) < 0.12, "zoom eases in");
  assert.equal(introPlayFaceT(quarter), introPlayZoomT(quarter));
  assert.ok(Math.abs(introPlayAlignT(half) - 0.5) < 1e-9);
  assert.equal(introPlayAlignT(10, true), 1);

  const from = {
    yaw: 0.72,
    pitch: 0.32,
    distance: 5,
    fov: INTRO_PLAY_FOV,
    target: { x: 0, y: 0, z: 0 },
  };
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw));
  const mid = introPlayPose(from, half);
  assert.ok(Math.abs(mid.yaw - (from.yaw + to.yaw) / 2) < 1e-9);
  assert.ok(Math.abs(mid.pitch - (from.pitch + to.pitch) / 2) < 1e-9);
  assert.equal(mid.fov, from.fov);
  assert.ok(Math.abs(mid.distance - (from.distance + to.distance) / 2) < 1e-9);

  const end = introPlayPose(from, INTRO_PLAY_ALIGN_MS);
  assert.ok(Math.abs(end.yaw - to.yaw) < 1e-9);
  assert.equal(end.fov, from.fov);
  assert.equal(end.fov, INTRO_PLAY_FOV);
  assert.ok(Math.abs(end.distance - to.distance) < 1e-9);

  let previousYaw = from.yaw;
  let previousDistance = from.distance;
  for (let elapsed = 0; elapsed <= INTRO_PLAY_ALIGN_MS; elapsed += 40) {
    const pose = introPlayPose(from, elapsed);
    assert.equal(pose.fov, from.fov, "FOV must stay put");
    assert.ok((pose.yaw - previousYaw) * (to.yaw - from.yaw) >= -1e-9, "yaw must not reverse");
    assert.ok((pose.distance - previousDistance) * (to.distance - from.distance) >= -1e-9, "distance must not reverse");
    previousYaw = pose.yaw;
    previousDistance = pose.distance;
  }
});

test("intro play tune overrides end position, scale, and FOV", () => {
  const defaults = resolveIntroPlayTune();
  assert.equal(defaults.scale, PLAY_SPLAT_DISTANCE_SCALE);
  assert.equal(defaults.endFov, INTRO_PLAY_END_FOV);
  assert.equal(defaults.targetX, 0);
  assert.equal(defaults.targetY, PLAY_SPLAT_TARGET_Y_LIFT);

  const tune = resolveIntroPlayTune({ targetX: 0.2, targetY: -0.15, scale: 0.7, endFov: 8 });
  const camera = introPlayCamera(PLAY_POND_VIEW, PLAY_ALIGN_YAW, tune);
  const pond = complexToSplat(PLAY_POND_VIEW.centerX, PLAY_POND_VIEW.centerY);
  assert.equal(camera.fov, INTRO_PLAY_FOV);
  assert.ok(Math.abs(camera.target.x - (pond.x + 0.2)) < 1e-9);
  assert.ok(Math.abs(camera.target.y - (pond.y - 0.15)) < 1e-9);
  assert.ok(Math.abs(introPlayApparentHalfY(camera) - PLAY_POND_VIEW.halfY * 0.7) < 1e-9);

  const from = {
    yaw: 0,
    pitch: 0,
    distance: 5,
    fov: INTRO_PLAY_FOV,
    target: { x: 0, y: 0, z: 0 },
  };
  const end = introPlayPose(from, INTRO_PLAY_ALIGN_MS, false, tune);
  assert.equal(end.fov, INTRO_PLAY_FOV);
  assert.ok(Math.abs(end.target.x - camera.target.x) < 1e-9);
  assert.ok(Math.abs(end.target.y - camera.target.y) < 1e-9);
  assert.ok(Math.abs(end.distance - camera.distance) < 1e-9);
});
