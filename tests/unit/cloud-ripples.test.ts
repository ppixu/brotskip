import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");

test("the intro cloud is doubled and emits fading 3D rings from real splats", () => {
  assert.match(source, /const distance = 3\.15/);
  assert.match(source, /packed\.getSplat\(Math\.floor\(Math\.random\(\) \* count\)\)/);
  assert.match(source, /group\.position\.copy\(sample\.center\)/);
  assert.match(source, /group\.quaternion\.copy\(sample\.quaternion\)/);
  assert.match(source, /new THREE\.RingGeometry/);
  assert.match(source, /new THREE\.Sprite/);
  assert.match(source, /material\.opacity = Math\.sin/);
  assert.match(source, /removeRipple\(ripple\)/);
});
