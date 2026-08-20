import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");

test("the intro cloud is doubled and emits fading 3D rings from real splats", () => {
  assert.match(source, /let distance = classic \? 5\.0 : 3\.15/);
  assert.match(source, /packed\.getSplat\(Math\.floor\(Math\.random\(\) \* count\)\)/);
  assert.match(source, /group\.position\.copy\(sample\.center\)/);
  assert.match(source, /group\.quaternion\.copy\(sample\.quaternion\)/);
  assert.match(source, /new THREE\.Quaternion\(\)\.random\(\)/);
  assert.match(source, /quaternion\.multiply/);
  assert.match(source, /new THREE\.RingGeometry/);
  assert.match(source, /new THREE\.Sprite/);
  assert.match(source, /material\.opacity = Math\.sin/);
  assert.match(source, /removeRipple\(ripple\)/);
  assert.match(source, /introPlayPose\(alignFrom, elapsed, reduceMotion, tuneRef\.current\)/);
  assert.match(source, /introPlayFlatten/);
  assert.match(source, /splat\.scale\.z/);
  assert.match(source, /fadingRef/);
  assert.match(source, /alpha:\s*true/);
  assert.match(source, /setClearColor\(0x000000,\s*0\)/);
  assert.doesNotMatch(source, /camera\.fov = pose\.fov/);
  assert.match(source, /camera\.fov = INTRO_PLAY_FOV/);
  assert.match(source, /updateProjectionMatrix\(\)/);
});
