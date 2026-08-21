import assert from "node:assert/strict";
import test from "node:test";
import { TRAIL_BOUNDS, complexToScreen } from "../../lib/view-map.ts";
import { BUDDHABROT_OUTLINE_ALPHA, buddhabrotImageTransform } from "../../lib/buddhabrot-outline.ts";

test("cached Buddha is 25% brighter before sling", () => {
  assert.ok(Math.abs(BUDDHABROT_OUTLINE_ALPHA - 0.063 * 1.25) < 1e-9);
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
