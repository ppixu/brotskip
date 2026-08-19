import assert from "node:assert/strict";
import test from "node:test";
import { COVERAGE_GRID, orbitShape } from "../../lib/orbit-shape.ts";

test("empty sums produce all-zero stats", () => {
  const stats = orbitShape({ distinct: 0, sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0 });
  assert.deepEqual(stats, {
    area: 0, coverage: 0, spread: 0, elongation: 0,
    orientation: 0, density: 0, centroidX: 0, centroidY: 0,
  });
});

test("two horizontally separated cells form a fully elongated shape", () => {
  // Cells (10,16) and (20,16): meanX=15, meanY=16, varX=25, varY=0, cov=0.
  const stats = orbitShape({ distinct: 2, sumX: 30, sumY: 32, sumXX: 500, sumYY: 512, sumXY: 480 });
  assert.equal(stats.area, 0);
  assert.equal(stats.elongation, 1);
  assert.equal(stats.orientation, 0);
  assert.equal(stats.density, 1);
  assert.ok(Math.abs(stats.centroidX - (15 / (COVERAGE_GRID - 1) * 2 - 1)) < 1e-12);
  assert.ok(Math.abs(stats.centroidY - (16 / (COVERAGE_GRID - 1) * 2 - 1)) < 1e-12);
});

test("coverage grows with distinct cell count", () => {
  const few = orbitShape({ distinct: 4, sumX: 60, sumY: 64, sumXX: 1000, sumYY: 1024, sumXY: 960 });
  const many = orbitShape({ distinct: 400, sumX: 6000, sumY: 6400, sumXX: 100000, sumYY: 102400, sumXY: 96000 });
  assert.ok(many.coverage > few.coverage);
  assert.ok(many.coverage <= 1);
});
