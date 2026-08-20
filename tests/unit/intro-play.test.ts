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

test("play alignment eases size and FOV together, then the splat fades longer over the pond", () => {
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
  assert.ok(introPlayZoomT(INTRO_PLAY_ALIGN_MS / 2) > 0.65);
  assert.ok(introPlayAlignT(INTRO_PLAY_ALIGN_MS / 2) > 0.65);
  assert.equal(introPlayAlignT(10, true), 1);
  for (const elapsed of [0, INTRO_PLAY_FACE_MS, INTRO_PLAY_ALIGN_MS / 2, INTRO_PLAY_ALIGN_MS]) {
    assert.equal(introPlayDollyT(elapsed), introPlayZoomT(elapsed), "FOV and size share one ease-out");
  }

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
  assert.ok(faced.fov < INTRO_PLAY_FOV - 1, "FOV starts with the size zoom, not after it");
  assert.ok(faced.fov > INTRO_PLAY_END_FOV + 1);

  const end = introPlayPose(from, INTRO_PLAY_ALIGN_MS);
  assert.ok(Math.abs(end.yaw - to.yaw) < 1e-9);
  assert.ok(Math.abs(end.fov - INTRO_PLAY_END_FOV) < 1e-9);
  assert.ok(Math.abs(end.distance - to.distance) < 1e-9);
  assert.ok(end.distance > from.distance, "narrower FOV dollies the camera back");
  assert.ok(introPlayApparentHalfY(end) < introPlayApparentHalfY(from), "Buddha keeps zooming in");
  assert.ok(faced.distance > from.distance, "camera must not dive in before the FOV lerp");

  let previousYaw = from.yaw;
  let previousSize = introPlayApparentHalfY(from);
  let previousFov = from.fov;
  let previousDistance = from.distance;
  for (let elapsed = 0; elapsed <= INTRO_PLAY_ALIGN_MS; elapsed += 40) {
    const pose = introPlayPose(from, elapsed);
    const size = introPlayApparentHalfY(pose);
    assert.ok(size <= previousSize + 1e-9, "Buddha size must ease in, never reverse");
    assert.ok(pose.fov <= previousFov + 1e-9, "FOV must ease toward ortho, never reverse");
    assert.ok(pose.distance >= previousDistance - 1e-9, "distance must not dive in then pull back");
    assert.ok((pose.yaw - previousYaw) * (to.yaw - from.yaw) >= -1e-9, "yaw must not reverse");
    previousSize = size;
    previousFov = pose.fov;
    previousDistance = pose.distance;
    previousYaw = pose.yaw;
  }
});
