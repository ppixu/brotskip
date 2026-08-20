import assert from "node:assert/strict";
import test from "node:test";
import { TRAIL_BOUNDS, complexToScreen } from "../../lib/view-map.ts";
import {
  buddhabrotImageTransform,
  extractBuddhabrotOutline,
} from "../../lib/buddhabrot-outline.ts";

test("outline keeps edge pixels and clears the interior", () => {
  const width = 5;
  const height = 5;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 1; y <= 3; y++) {
    for (let x = 1; x <= 3; x++) {
      const index = (y * width + x) * 4;
      pixels[index] = 200;
      pixels[index + 1] = 220;
      pixels[index + 2] = 255;
      pixels[index + 3] = 255;
    }
  }
  const outline = extractBuddhabrotOutline(pixels, width, height);
  const alpha = (x: number, y: number) => outline[(y * width + x) * 4 + 3];
  assert.equal(alpha(2, 2), 0);
  assert.ok(alpha(1, 1) > 180);
  assert.ok(alpha(1, 2) > 180);
  assert.equal(alpha(0, 0), 0);
});

test("Buddhabrot image transform follows rotate-right so the head sits above the pond", () => {
  const view = { centerX: -0.58, centerY: 0, halfY: 0.8 };
  const transform = buddhabrotImageTransform(100, 100, 200, 200, view, true);
  const head = complexToScreen(TRAIL_BOUNDS.xMin, 0, 200, 200, view, true);
  const base = complexToScreen(TRAIL_BOUNDS.xMax, 0, 200, 200, view, true);
  const imageHead = {
    x: transform.e + transform.a * 0 + transform.c * 50,
    y: transform.f + transform.b * 0 + transform.d * 50,
  };
  assert.ok(head.y < base.y);
  assert.ok(Math.abs(imageHead.x - head.x) < 1e-6);
  assert.ok(Math.abs(imageHead.y - head.y) < 1e-6);
});
