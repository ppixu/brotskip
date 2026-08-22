import assert from "node:assert/strict";
import test from "node:test";
import {
  GLYPH_COUNT,
  SACRED_PATH_COUNTS,
  SACRED_SHAPE_COUNT,
  sacredShapeOffset,
} from "../../lib/sacred-geometry.ts";

test("eight shapes with matching path counts", () => {
  assert.equal(GLYPH_COUNT, 7);
  assert.equal(SACRED_SHAPE_COUNT, 8);
  assert.equal(SACRED_PATH_COUNTS.length, 8);
});

test("every shape, path, and t yields a finite offset within the glyph radius", () => {
  for (let shape = 0; shape < SACRED_SHAPE_COUNT; shape++) {
    for (let path = 0; path < SACRED_PATH_COUNTS[shape]; path++) {
      for (let step = 0; step <= 32; step++) {
        const offset = sacredShapeOffset(shape, path, step / 32);
        assert.ok(Number.isFinite(offset.x) && Number.isFinite(offset.y), `shape ${shape} path ${path}`);
        assert.ok(Math.hypot(offset.x, offset.y) <= 1.35, `shape ${shape} path ${path} radius`);
      }
    }
  }
});

test("the philosopher shape is not a plain copy of the halo", () => {
  const halo = sacredShapeOffset(0, 0, 0.4);
  const philosopher = sacredShapeOffset(7, 2, 0.4);
  assert.ok(Math.hypot(halo.x - philosopher.x, halo.y - philosopher.y) > 0.05);
});
