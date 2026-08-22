import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const cloud = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");
const generator = readFileSync(new URL("../../tools/true_buddhabrot_splat.cpp", import.meta.url), "utf8");

test("both loading choices use the same draggable SPZ renderer", () => {
  assert.match(cloud, /"classic"/);
  assert.match(cloud, /"henon"/);
  assert.match(cloud, /true-buddhabrot-4096\.spz/);
  assert.match(cloud, /henon-buddhabrot-4096\.spz/);
  assert.match(cloud, /pointerdown/);
  assert.match(cloud, /pointermove/);
  assert.match(cloud, /setPointerCapture/);
  assert.match(cloud, /!dragging/);
  assert.doesNotMatch(cloud, /webgpu/);
  assert.ok(existsSync(new URL("../../public/true-buddhabrot-4096.spz", import.meta.url)));
  const compactUrl = new URL("../../public/true-buddhabrot-450k.bbp.gz", import.meta.url);
  assert.ok(existsSync(compactUrl));
  assert.ok(statSync(compactUrl).size < 1_600_000, "compact asset larger than budget");
  assert.match(cloud, /true-buddhabrot-450k\.bbp\.gz/);
  assert.match(cloud, /DecompressionStream\("gzip"\)/);
  assert.match(cloud, /pushSplat/);
  assert.match(cloud, /legacySplat/);
  assert.match(cloud, /decodeCompactCloud/);
});

test("the second SPZ is generated from standard escaping z squared plus c paths", () => {
  assert.match(generator, /z\.real \* z\.real - z\.imag \* z\.imag \+ c\.real/);
  assert.match(generator, /2\.0 \* z\.real \* z\.imag \+ c\.imag/);
  assert.match(generator, /norm_squared\(z\) > 4\.0/);
  assert.match(generator, /-\(z\.real \+ 0\.5\),\s*c\.imag/);
  assert.doesNotMatch(generator, /DEPTH_HALF/);
  assert.doesNotMatch(generator, /orbit time/);
});
