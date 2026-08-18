import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const spz = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");
const live = readFileSync(new URL("../../app/TrueBuddhabrotCanvas.tsx", import.meta.url), "utf8");

test("both loading clouds support drag orbiting", () => {
  for (const source of [spz, live]) {
    assert.match(source, /pointerdown/);
    assert.match(source, /pointermove/);
    assert.match(source, /setPointerCapture/);
    assert.match(source, /!dragging/);
  }
});

test("the true Buddhabrot mode computes escaping z squared plus c paths on the GPU", () => {
  assert.match(live, /getContext\("webgpu"\)/);
  assert.match(live, /fn iterate\(z: vec2f, c: vec2f\)/);
  assert.match(live, /z\.x \* z\.x - z\.y \* z\.y/);
  assert.match(live, /if \(dot\(z, z\) > 4\.0\)/);
  assert.match(live, /step >= escapeAt/);
  assert.match(live, /orbitTime/);
});
