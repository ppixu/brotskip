import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compactSplatAt, decodeCompactCloud, type CompactSplat } from "../../lib/splat-cloud.ts";

const bytes = new Uint8Array(readFileSync(new URL("../fixtures/tiny-buddhabrot.bbp", import.meta.url)));

test("decodes a real generator artifact", () => {
  const cloud = decodeCompactCloud(bytes);
  assert.equal(cloud.resolution, 96);
  assert.ok(cloud.count > 100, `count was ${cloud.count}`);
  assert.equal(cloud.voxels.length, cloud.count);
  assert.equal(cloud.densities.length, cloud.count);
  for (let index = 1; index < cloud.count; index++) {
    assert.ok(cloud.voxels[index] > cloud.voxels[index - 1], `voxels not strictly increasing at ${index}`);
  }
  assert.ok(cloud.voxels[cloud.count - 1] < 96 ** 3);
});

test("every derived splat stays inside the field with sane attributes", () => {
  const cloud = decodeCompactCloud(bytes);
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  for (let index = 0; index < cloud.count; index++) {
    compactSplatAt(cloud, index, out);
    for (const value of [out.x, out.y, out.z]) {
      assert.ok(value > cloud.fieldMin && value < cloud.fieldMax);
    }
    for (const value of [out.r, out.g, out.b]) {
      assert.ok(value >= 0 && value <= 1);
    }
    assert.ok(out.alpha >= 0.01 && out.alpha <= 0.55);
  }
});
