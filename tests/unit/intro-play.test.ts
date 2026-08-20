import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_PLAY_ALIGN_MS,
  INTRO_PLAY_EXIT_MS,
  INTRO_PLAY_FACE_MS,
  INTRO_PLAY_FADE_DELAY_MS,
  INTRO_PLAY_FADE_MS,
  INTRO_PLAY_FOV,
  PLAY_POND_VIEW,
  PLAY_SPLAT_DISTANCE_SCALE,
  complexToSplat,
  introPlayAlignT,
  introPlayCamera,
  introPlayFaceT,
  introPlayFlatten,
  introPlayPose,
  introPlayZoomT,
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
  const framed = splatDistanceForHalfY(PLAY_POND_VIEW.halfY, INTRO_PLAY_FOV);
  assert.ok(PLAY_SPLAT_DISTANCE_SCALE < 0.9);
  assert.ok(PLAY_SPLAT_DISTANCE_SCALE > 0.7);
  assert.ok(Math.abs(camera.distance - framed * PLAY_SPLAT_DISTANCE_SCALE) < 1e-9);
  assert.ok(camera.distance < framed);
  assert.ok(Math.abs(camera.target.y - target.y) < 1e-9);
});

test("Play takes the shortest turn to face-on, without an extra full spin", () => {
  const tau = Math.PI * 2;
  const classic = playAlignYaw(0.16);
  const henon = playAlignYaw(0.72);
  const spun = playAlignYaw(5.8);
  assert.ok(Math.abs(classic) < 1e-9);
  assert.ok(Math.abs(henon) < 1e-9);
  assert.ok(Math.abs(classic - 0.16) < Math.PI);
  assert.ok(Math.abs(henon - 0.72) < Math.PI);
  assert.ok(Math.abs(((spun % tau) + tau) % tau) < 1e-9);
  assert.ok(Math.abs(spun - 5.8) < Math.PI);
});

test("flatten waits until the Buddha faces the camera, then settles flat", () => {
  assert.ok(INTRO_PLAY_FACE_MS < INTRO_PLAY_ALIGN_MS);
  assert.equal(introPlayFlatten(0), 1);
  assert.equal(introPlayFlatten(INTRO_PLAY_FACE_MS * 0.5), 1);
  assert.ok(introPlayFlatten(INTRO_PLAY_ALIGN_MS) < 0.08);
});

test("play alignment faces the camera first, then zooms with an ease-out that never reverses", () => {
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
    target: { x: 0, y: 0, z: 0 },
  };
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw));
  const faced = introPlayPose(from, INTRO_PLAY_FACE_MS);
  assert.ok(Math.abs(faced.yaw - to.yaw) < 1e-6);
  assert.ok(Math.abs(faced.pitch - to.pitch) < 1e-6);
  assert.ok(faced.distance > to.distance + 0.2);

  const end = introPlayPose(from, INTRO_PLAY_ALIGN_MS);
  assert.ok(Math.abs(end.yaw - to.yaw) < 1e-9);
  assert.ok(Math.abs(end.distance - to.distance) < 1e-9);

  let previousDistance = from.distance;
  let previousYaw = from.yaw;
  for (let elapsed = 0; elapsed <= INTRO_PLAY_ALIGN_MS; elapsed += 40) {
    const pose = introPlayPose(from, elapsed);
    assert.ok(pose.distance <= previousDistance + 1e-9, "zoom must not pull back");
    assert.ok((pose.yaw - previousYaw) * (to.yaw - from.yaw) >= -1e-9, "yaw must not reverse");
    previousDistance = pose.distance;
    previousYaw = pose.yaw;
  }

  const late = introPlayPose(from, INTRO_PLAY_ALIGN_MS * 0.8);
  assert.ok((late.distance - to.distance) < (from.distance - to.distance) * 0.12);
});
