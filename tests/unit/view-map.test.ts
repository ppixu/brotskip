import assert from "node:assert/strict";
import test from "node:test";
import {
  TRAIL_ATLAS_SIZE,
  TRAIL_BOUNDS,
  complexToAtlasUv,
  complexToScreen,
  reprojectScreenPoint,
  reprojectScreenVelocity,
  screenToComplex,
  trailUvOffset,
  zoomPixelScale,
} from "../../lib/view-map.ts";

const view = { centerX: -0.58, centerY: 0, halfY: 0.8 };
const width = 200;
const height = 200;

test("screen center maps to the pond center with or without rotation", () => {
  const plain = screenToComplex(100, 100, width, height, view, false);
  const rotated = screenToComplex(100, 100, width, height, view, true);
  assert.ok(Math.abs(plain.x - view.centerX) < 1e-9);
  assert.ok(Math.abs(plain.y - view.centerY) < 1e-9);
  assert.ok(Math.abs(rotated.x - view.centerX) < 1e-9);
  assert.ok(Math.abs(rotated.y - view.centerY) < 1e-9);
});

test("rotating 90° right puts +real below the pond, where the player throws", () => {
  const pond = complexToScreen(view.centerX, view.centerY, width, height, view, true);
  const towardOne = complexToScreen(1, 0, width, height, view, true);
  assert.ok(towardOne.y > pond.y);
  const left = complexToScreen(view.centerX - 0.2, view.centerY, width, height, view, false);
  const rotatedLeft = complexToScreen(view.centerX - 0.2, view.centerY, width, height, view, true);
  assert.ok(left.x < pond.x);
  assert.ok(rotatedLeft.y < pond.y);
});

test("the trail atlas is fine enough for sharp Buddhabrot filaments", () => {
  assert.ok(TRAIL_ATLAS_SIZE >= 4096);
});

test("vertical orientation puts the period-2 bulb (Buddha head) above the pond", () => {
  const pond = complexToScreen(view.centerX, view.centerY, width, height, view, true);
  const head = complexToScreen(-1, 0, width, height, view, true);
  const shoulder = complexToScreen(view.centerX, 0.4, width, height, view, true);
  assert.ok(head.y < pond.y);
  assert.ok(Math.abs(shoulder.x - pond.x) > Math.abs(shoulder.y - pond.y));
});

test("screen and complex round-trip with rotation", () => {
  const point = { x: 42, y: 160 };
  const complex = screenToComplex(point.x, point.y, width, height, view, true);
  const back = complexToScreen(complex.x, complex.y, width, height, view, true);
  assert.ok(Math.abs(back.x - point.x) < 1e-6);
  assert.ok(Math.abs(back.y - point.y) < 1e-6);
});

test("unrotated trail offset matches a rightward pan", () => {
  const next = { ...view, centerX: view.centerX + 0.4 };
  const offset = trailUvOffset(view, next, width, height, false);
  assert.ok(offset.x > 0);
  assert.ok(Math.abs(offset.y) < 1e-12);
});

test("atlas UV maps pond bounds onto the unit square", () => {
  const topLeft = complexToAtlasUv(TRAIL_BOUNDS.xMin, TRAIL_BOUNDS.yMax);
  const bottomRight = complexToAtlasUv(TRAIL_BOUNDS.xMax, TRAIL_BOUNDS.yMin);
  assert.ok(Math.abs(topLeft.u) < 1e-9);
  assert.ok(Math.abs(topLeft.v) < 1e-9);
  assert.ok(Math.abs(bottomRight.u - 1) < 1e-9);
  assert.ok(Math.abs(bottomRight.v - 1) < 1e-9);
});

test("reprojecting a screen point after pan keeps the same pond coordinate", () => {
  const point = { x: 80, y: 150 };
  const next = { ...view, centerX: view.centerX + 0.35 };
  const moved = reprojectScreenPoint(point.x, point.y, width, height, view, next, false);
  const before = screenToComplex(point.x, point.y, width, height, view, false);
  const after = screenToComplex(moved.x, moved.y, width, height, next, false);
  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);
});

test("reprojecting velocity after zoom keeps the pond-space direction", () => {
  const next = { ...view, halfY: 0.4 };
  const moved = reprojectScreenVelocity(100, 100, 30, -10, width, height, view, next, false);
  const start = reprojectScreenPoint(100, 100, width, height, view, next, false);
  const oldEnd = screenToComplex(130, 90, width, height, view, false);
  const newEnd = screenToComplex(start.x + moved.x, start.y + moved.y, width, height, next, false);
  assert.ok(Math.abs(oldEnd.x - newEnd.x) < 1e-6);
  assert.ok(Math.abs(oldEnd.y - newEnd.y) < 1e-6);
});

test("pixel scale at the reference zoom matches min dimension", () => {
  assert.equal(zoomPixelScale(800, 0.8), 800);
  assert.ok(Math.abs(zoomPixelScale(800, 0.4) - 1600) < 1e-9);
});
