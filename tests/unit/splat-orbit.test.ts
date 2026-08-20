import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { complexToSplat, SPLAT_RE_OFFSET } from "../../lib/intro-play.ts";
import {
  SPLAT_DEPTH_HALF,
  splatOrbitDepth,
  splatOrbitPoint,
} from "../../lib/splat-orbit.ts";

test("splat XY is the rotated z-plane Buddhabrot; Z is a thin orbit-time slab", () => {
  assert.ok(SPLAT_DEPTH_HALF > 0.25);
  assert.ok(SPLAT_DEPTH_HALF < 0.6);
  assert.equal(splatOrbitDepth(0, 100), splatOrbitDepth(99, 100) * -1);
  assert.ok(Math.abs(splatOrbitDepth(50, 100)) < SPLAT_DEPTH_HALF * 0.05);
  assert.ok(Math.abs(splatOrbitPoint(-1, 0.4, 10, 40).z) < SPLAT_DEPTH_HALF);
  const mid = splatOrbitPoint(-0.58, 0, 20, 40);
  const pond = complexToSplat(-0.58, 0);
  assert.equal(mid.x, pond.x);
  assert.equal(mid.y, pond.y);
  assert.equal(SPLAT_RE_OFFSET, 0.5);
  assert.ok(Math.abs(mid.z) < 0.02);
});

test("the C++ generator writes the same XYT mapping, not Im(c) as depth", () => {
  const generator = readFileSync(new URL("../../tools/true_buddhabrot_splat.cpp", import.meta.url), "utf8");
  assert.match(generator, /DEPTH_HALF/);
  assert.match(generator, /normalized orbit time|orbit time/);
  assert.match(generator, /t \* DEPTH_HALF/);
  assert.match(generator, /-\(z\.real \+ 0\.5\)/);
  assert.doesNotMatch(generator, /-\(z\.real \+ 0\.5\),\s*c\.imag/);
  assert.doesNotMatch(generator, /projected to Im\(z\), -Re\(z\), Im\(c\)/);
});
