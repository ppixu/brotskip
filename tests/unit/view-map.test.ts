import assert from "node:assert/strict";
import test from "node:test";
import {
  complexToScreen,
  screenToComplex,
  trailUvOffset,
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
