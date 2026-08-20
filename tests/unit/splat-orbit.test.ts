import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { complexToSplat, SPLAT_RE_OFFSET } from "../../lib/intro-play.ts";
import { splatOrbitPoint } from "../../lib/splat-orbit.ts";

test("splat XY is the rotated z-plane Buddhabrot; Z is Im(c)", () => {
  const head = splatOrbitPoint(-1, 0, 0);
  const body = splatOrbitPoint(0.25, 0, 0);
  assert.ok(head.y > body.y, "period-2 head sits above the cardioid body");
  assert.equal(splatOrbitPoint(0, 0.4, -0.7).x, 0.4);
  assert.equal(splatOrbitPoint(0, 0.4, -0.7).z, -0.7);
  const mid = splatOrbitPoint(-0.58, 0, 0);
  const pond = complexToSplat(-0.58, 0);
  assert.equal(mid.x, pond.x);
  assert.equal(mid.y, pond.y);
  assert.equal(mid.z, 0);
  assert.equal(SPLAT_RE_OFFSET, 0.5);
});

test("the C++ generator writes Im(z), -Re(z), Im(c) — not orbit-time depth", () => {
  const generator = readFileSync(new URL("../../tools/true_buddhabrot_splat.cpp", import.meta.url), "utf8");
  assert.match(generator, /-\(z\.real \+ 0\.5\),\s*c\.imag/);
  assert.match(generator, /Im\(z\), -Re\(z\), Im\(c\)/);
  assert.doesNotMatch(generator, /DEPTH_HALF/);
  assert.doesNotMatch(generator, /orbit time/);
});
