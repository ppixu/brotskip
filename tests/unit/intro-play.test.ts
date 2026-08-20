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
  introPlayDollyT,
  introPlayFaceT,
  introPlayFlatten,
  introPlayPose,
  introPlayZoomT,
  playAlignYaw,
  resolveIntroPlayTune,
  splatDistanceForHalfY,
} from "../../lib/intro-play.ts";

test("play camera matches the pond Buddha instead of leaving it 33% larger", () => {
  assert.equal(PLAY_POND_VIEW.centerX, -0.58);
  assert.equal(PLAY_POND_VIEW.centerY, 0);
  assert.equal(PLAY_POND_VIEW.halfY, 0.8);
  const pond = complexToSplat(PLAY_POND_VIEW.centerX, PLAY_POND_VIEW.centerY);
  assert.equal(pond.x, 0);
  assert.ok(Math.abs(pond.y - 0.08) < 1e-9);
  assert.equal(pond.z, 0);
  const camera = introPlayCamera(PLAY_POND_VIEW);
  assert.equal(camera.pitch, 0);
  assert.equal(camera.fov, INTRO_PLAY_END_FOV);
  assert.ok(INTRO_PLAY_END_FOV <= 5.5);
  assert.ok(INTRO_PLAY_END_FOV >= 4.5);
  assert.ok(PLAY_SPLAT_DISTANCE_SCALE >= 0.88);
  assert.ok(PLAY_SPLAT_DISTANCE_SCALE <= 0.96);
  assert.equal(PLAY_SPLAT_TARGET_Y_LIFT, 0);
  const halfY = PLAY_POND_VIEW.halfY * PLAY_SPLAT_DISTANCE_SCALE;
  assert.ok(Math.abs(camera.distance - splatDistanceForHalfY(halfY, INTRO_PLAY_END_FOV)) < 1e-9);
  assert.ok(Math.abs(camera.target.y - pond.y) < 1e-9);
  assert.ok(Math.abs(introPlayApparentHalfY(camera) / PLAY_POND_VIEW.halfY - PLAY_SPLAT_DISTANCE_SCALE) < 1e-9);
  assert.ok(introPlayApparentHalfY(camera) < PLAY_POND_VIEW.halfY);
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

test("flatten waits until the Buddha faces the camera, then settles flat", () => {
  assert.ok(INTRO_PLAY_FACE_MS < INTRO_PLAY_ALIGN_MS);
  assert.equal(introPlayFlatten(0), 1);
  assert.equal(introPlayFlatten(INTRO_PLAY_FACE_MS * 0.5), 1);
  assert.ok(introPlayFlatten(INTRO_PLAY_ALIGN_MS) < 0.08);
});

test("play alignment zooms size and FOV on the same linear curve", () => {
  assert.ok(INTRO_PLAY_ALIGN_MS >= 1600);
  assert.ok(INTRO_PLAY_FACE_MS <= INTRO_PLAY_ALIGN_MS * 0.45);
  assert.ok(INTRO_PLAY_FADE_DELAY_MS < INTRO_PLAY_ALIGN_MS, "pond Buddha should start showing through during the zoom");
  assert.ok(INTRO_PLAY_FADE_DELAY_MS >= 800);
  assert.ok(INTRO_PLAY_FADE_MS >= 2200);
  assert.ok(INTRO_PLAY_EXIT_MS >= INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS);

  assert.equal(introPlayFaceT(0), 0);
  assert.equal(introPlayFaceT(INTRO_PLAY_FACE_MS), 1);
  assert.ok(introPlayFaceT(INTRO_PLAY_FACE_MS / 2) > 0.65);
  assert.equal(introPlayZoomT(0), 0);
  assert.equal(introPlayZoomT(INTRO_PLAY_ALIGN_MS), 1);
  assert.ok(introPlayZoomT(INTRO_PLAY_FACE_MS) < 0.85, "size zoom must still be running after the face turn");
  assert.ok(Math.abs(introPlayZoomT(INTRO_PLAY_ALIGN_MS / 2) - 0.5) < 1e-9, "size zoom is linear");
  assert.equal(introPlayDollyT(INTRO_PLAY_ALIGN_MS / 2), introPlayZoomT(INTRO_PLAY_ALIGN_MS / 2));
  assert.ok(introPlayAlignT(INTRO_PLAY_ALIGN_MS / 2) > 0.65);
  assert.equal(introPlayAlignT(10, true), 1);

  const from = {
    yaw: 0.72,
    pitch: 0.32,
    distance: 5,
    fov: INTRO_PLAY_FOV,
    target: { x: 0, y: 0, z: 0 },
  };
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw));
  const faced = introPlayPose(from, INTRO_PLAY_FACE_MS);
  assert.ok(Math.abs(faced.yaw - to.yaw) < 1e-6);
  assert.ok(Math.abs(faced.pitch - to.pitch) < 1e-6);
  const expectedFacedFov = INTRO_PLAY_FOV + (INTRO_PLAY_END_FOV - INTRO_PLAY_FOV) * introPlayDollyT(INTRO_PLAY_FACE_MS);
  assert.ok(Math.abs(faced.fov - expectedFacedFov) < 1e-9);

  const end = introPlayPose(from, INTRO_PLAY_ALIGN_MS);
  assert.ok(Math.abs(end.yaw - to.yaw) < 1e-9);
  assert.ok(Math.abs(end.fov - INTRO_PLAY_END_FOV) < 1e-9);
  assert.ok(Math.abs(end.distance - to.distance) < 1e-9);
  assert.ok(introPlayApparentHalfY(end) < introPlayApparentHalfY(from), "Buddha keeps zooming in");

  let previousYaw = from.yaw;
  let previousSize = introPlayApparentHalfY(from);
  let previousFov = from.fov;
  for (let elapsed = 0; elapsed <= INTRO_PLAY_ALIGN_MS; elapsed += 40) {
    const pose = introPlayPose(from, elapsed);
    const size = introPlayApparentHalfY(pose);
    assert.ok(size <= previousSize + 1e-9, "Buddha size must ease in, never reverse");
    assert.ok(pose.fov <= previousFov + 1e-9, "FOV must ease toward ortho, never reverse");
    assert.ok((pose.yaw - previousYaw) * (to.yaw - from.yaw) >= -1e-9, "yaw must not reverse");
    previousSize = size;
    previousFov = pose.fov;
    previousYaw = pose.yaw;
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
  assert.equal(camera.fov, 8);
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
  assert.equal(end.fov, 8);
  assert.ok(Math.abs(end.target.x - camera.target.x) < 1e-9);
  assert.ok(Math.abs(end.target.y - camera.target.y) < 1e-9);
  assert.ok(Math.abs(end.distance - camera.distance) < 1e-9);
});
