import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");

test("aim orbit preview is on by default", () => {
  assert.match(source, /previewOrbits: true,/);
  assert.match(source, /const previewOrbits = value\?\.previewOrbits !== false/);
});

test("the sling phase draws a fading dashed throw line", () => {
  assert.match(source, /drawPrediction\(a\);/);
  assert.match(source, /ctx\.setLineDash\(\[6, 9\]\)/);
  assert.match(source, /trajectory\.addColorStop\(1, "rgba\(255, 255, 255, 0\)"\)/);
});
