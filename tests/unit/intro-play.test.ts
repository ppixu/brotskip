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
  splatDistanceForHalfY,
} from "../../lib/intro-play.ts";

test("play camera looks at a larger, lower Buddha and ends near-orthographic", () => {
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
  assert.ok(PLAY_SPLAT_DISTANCE_SCALE <= 0.62);
  assert.ok(PLAY_SPLAT_DISTANCE_SCALE >= 0.45);
  assert.ok(PLAY_SPLAT_TARGET_Y_LIFT >= 0.1);
  const halfY = PLAY_POND_VIEW.halfY * PLAY_SPLAT_DISTANCE_SCALE;
  assert.ok(Math.abs(camera.distance - splatDistanceForHalfY(halfY, INTRO_PLAY_END_FOV)) < 1e-9);
  assert.ok(camera.target.y > pond.y + 0.08);
  assert.ok(Math.abs(camera.target.y - (pond.y + PLAY_SPLAT_TARGET_Y_LIFT)) < 1e-9);
});

test("Play turns 45 degrees past plane-on, without an extra full spin", () => {
  const tau = Math.PI * 2;
  assert.ok(Math.abs(PLAY_ALIGN_YAW + Math.PI / 4) < 1e-9);
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

test("play alignment faces first, then dollies back to FOV 5 at constant Buddha size", () => {
  assert.ok(INTRO_PLAY_ALIGN_MS >= 1600);
  assert.ok(INTRO_PLAY_FACE_MS <= INTRO_PLAY_ALIGN_MS * 0.45);
  assert.ok(INTRO_PLAY_FADE_DELAY_MS >= INTRO_PLAY_ALIGN_MS);
  assert.ok(INTRO_PLAY_FADE_MS >= 1100);
  assert.ok(INTRO_PLAY_EXIT_MS >= INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS);

  assert.equal(introPlayFaceT(0), 0);
  assert.equal(introPlayFaceT(INTRO_PLAY_FACE_MS), 1);
  assert.ok(introPlayFaceT(INTRO_PLAY_FACE_MS / 2) > 0.65);
  assert.equal(introPlayZoomT(0), 0);
  assert.equal(introPlayZoomT(INTRO_PLAY_ALIGN_MS), 1);
  assert.ok(introPlayZoomT(INTRO_PLAY_ALIGN_MS / 2) > 0.65);
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
  assert.ok(Math.abs(faced.fov - INTRO_PLAY_FOV) < 1e-6);

  const end = introPlayPose(from, INTRO_PLAY_ALIGN_MS);
  assert.ok(Math.abs(end.yaw - to.yaw) < 1e-9);
  assert.ok(Math.abs(end.fov - INTRO_PLAY_END_FOV) < 1e-9);
  assert.ok(Math.abs(end.distance - to.distance) < 1e-9);
  assert.ok(end.distance > faced.distance, "dolly zooms the camera back");
  assert.ok(
    Math.abs(introPlayApparentHalfY(faced) - introPlayApparentHalfY(end)) < 0.02,
    "Buddha size stays constant during the dolly",
  );

  let previousYaw = from.yaw;
  let previousSize = introPlayApparentHalfY(from);
  for (let elapsed = 0; elapsed <= INTRO_PLAY_ALIGN_MS; elapsed += 40) {
    const pose = introPlayPose(from, elapsed);
    const size = introPlayApparentHalfY(pose);
    assert.ok(size <= previousSize + 1e-9, "Buddha must not shrink back");
    assert.ok((pose.yaw - previousYaw) * (to.yaw - from.yaw) >= -1e-9, "yaw must not reverse");
    previousSize = size;
    previousYaw = pose.yaw;
  }
});
