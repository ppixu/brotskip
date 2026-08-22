import assert from "node:assert/strict";
import test from "node:test";
import {
  pickRegion,
  rayEllipsoidEntry,
  regionVolume,
  SPLAT_REGIONS,
  type SplatRegion,
} from "../../lib/splat-regions.ts";

function region(partial: Partial<SplatRegion>): SplatRegion {
  return {
    id: "test", name: "Test", blurb: "", center: [0, 0, 0], radii: [1, 1, 1],
    ...partial,
  } as SplatRegion;
}

test("a ray toward a centered unit sphere enters at distance minus radius", () => {
  const entry = rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, region({}));
  assert.ok(entry !== null && Math.abs(entry - 4) < 1e-9);
});

test("a ray that misses returns null", () => {
  assert.equal(rayEllipsoidEntry({ x: 0, y: 5, z: 5 }, { x: 0, y: 0, z: -1 }, region({})), null);
});

test("a ray pointing away returns null", () => {
  assert.equal(rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 1 }, region({})), null);
});

test("an origin inside the ellipsoid reports entry 0", () => {
  assert.equal(rayEllipsoidEntry({ x: 0.2, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, region({})), 0);
});

test("anisotropic radii stretch the hit test", () => {
  const flat = region({ radii: [2, 0.1, 0.1] });
  assert.ok(rayEllipsoidEntry({ x: 1.5, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, flat) !== null);
  assert.equal(rayEllipsoidEntry({ x: 1.5, y: 0.5, z: 5 }, { x: 0, y: 0, z: -1 }, flat), null);
});

test("degenerate radii and zero direction are safe", () => {
  assert.equal(rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, region({ radii: [0, 1, 1] })), null);
  assert.equal(rayEllipsoidEntry({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }, region({})), null);
});

test("pickRegion prefers the most specific (smallest) overlapping region", () => {
  const big = region({ id: "big", radii: [1, 1, 1] });
  const small = region({ id: "small", radii: [0.2, 0.2, 0.2] });
  const picked = pickRegion({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -1 }, [big, small]);
  assert.equal(picked?.region.id, "small");
  assert.ok(regionVolume(small) < regionVolume(big));
});

test("pickRegion returns null when nothing is hit", () => {
  assert.equal(pickRegion({ x: 0, y: 9, z: 5 }, { x: 0, y: 0, z: -1 }, [region({})]), null);
});

test("the shipped catalogue is well-formed", () => {
  assert.ok(SPLAT_REGIONS.length >= 5);
  const ids = new Set(SPLAT_REGIONS.map((entry) => entry.id));
  assert.equal(ids.size, SPLAT_REGIONS.length);
  for (const entry of SPLAT_REGIONS) {
    assert.ok(entry.name.length > 0 && entry.blurb.length > 0);
    for (const radius of entry.radii) assert.ok(radius > 0);
    for (const coordinate of entry.center) assert.ok(Math.abs(coordinate) < 2.35);
  }
  // The tika sits inside the head, so specificity ordering matters.
  const tika = SPLAT_REGIONS.find((entry) => entry.id === "tika")!;
  const head = SPLAT_REGIONS.find((entry) => entry.id === "head")!;
  assert.ok(regionVolume(tika) < regionVolume(head));
});
