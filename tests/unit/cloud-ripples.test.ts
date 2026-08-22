import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");

test("the intro cloud is doubled and emits fading 3D rings from real splats", () => {
  assert.match(source, /const RIPPLE_DELAYS = \[0\] as const/);
  assert.match(source, /INTRO_START_DISTANCE/);
  assert.match(source, /classic \? INTRO_START_DISTANCE\.classic : INTRO_START_DISTANCE\.henon/);
  assert.match(source, /packed\.getSplat\(Math\.floor\(Math\.random\(\) \* count\)\)/);
  assert.match(source, /spawnRippleAt\(now, sample\.center, sample\.quaternion\)/);
  assert.match(source, /group\.position\.copy\(position\)/);
  assert.match(source, /group\.quaternion\.copy\(quaternion\)/);
  assert.match(source, /new THREE\.Quaternion\(\)\.random\(\)/);
  assert.match(source, /quaternion\.multiply/);
  assert.match(source, /new THREE\.RingGeometry/);
  assert.match(source, /new THREE\.Sprite/);
  assert.match(source, /beacon\.scale\.setScalar\(0\.09\)/);
  assert.match(source, /beacon\.scale\.setScalar\(0\.06 \+ Math\.sin\(beaconT \* Math\.PI\) \* 0\.065\)/);
  assert.match(source, /material\.opacity = Math\.sin/);
  assert.match(source, /removeRipple\(ripple\)/);
  assert.match(source, /introPlayPose\(alignFrom, elapsed, reduceMotion, tuneRef\.current\)/);
  assert.match(source, /introPlayFlatten/);
  assert.match(source, /splat\.scale\.z/);
  assert.match(source, /onProgress:/);
  assert.match(source, /event\.loaded \/ event\.total/);
  assert.match(source, /onLoadProgress\?\.\(1\)/);
  assert.match(source, /onReady\?\.\(\)/);
  assert.match(source, /fadingRef/);
  assert.match(source, /alpha:\s*true/);
  assert.match(source, /setClearColor\(0x000000,\s*0\)/);
  assert.doesNotMatch(source, /camera\.fov = pose\.fov/);
  assert.match(source, /camera\.fov = INTRO_PLAY_FOV/);
  assert.match(source, /updateProjectionMatrix\(\)/);
  assert.doesNotMatch(source, /OrbitComet|spawnComet|THREE\.Line/);
});
