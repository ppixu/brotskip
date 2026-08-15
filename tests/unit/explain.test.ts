import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_SEEDS,
  EXPLAIN_PARTS,
  STACK_SEEDS,
  TRAPPED_SEED,
  canvasBackingSize,
  escapingOrbit,
  magnitudeSq,
  squarePlus,
} from "../../lib/buddhabrot/explain.ts";

test("the first iterate of 0 is the seed itself", () => {
  const seed = { re: 0.28, im: 0.53 };
  assert.deepEqual(squarePlus({ re: 0, im: 0 }, seed), seed);
});

test("a demo seed escapes the radius-2 circle", () => {
  const orbit = escapingOrbit(DEMO_SEEDS[0]);
  assert.ok(orbit.length > 4);
  assert.ok(magnitudeSq(orbit[orbit.length - 1]) > 4);
});

test("escaping orbits stop once they leave the circle", () => {
  const orbit = escapingOrbit({ re: 1, im: 1 }, 64);
  assert.equal(orbit.length, 2);
  assert.ok(magnitudeSq(orbit[1]) > 4);
});

test("the overlay explains Buddhabrot in three general-audience parts", () => {
  assert.equal(EXPLAIN_PARTS.length, 3);
  assert.match(EXPLAIN_PARTS[0].title, /iteration/i);
  assert.match(EXPLAIN_PARTS[0].body, /iteration means/i);
  assert.match(EXPLAIN_PARTS[0].body, /repeat/i);
  assert.equal(EXPLAIN_PARTS[0].formula, "z → z² + c");
  assert.match(EXPLAIN_PARTS[1].title, /escape/i);
  assert.match(EXPLAIN_PARTS[2].title, /nebula/i);
});

test("a trapped seed stays inside the radius-2 circle", () => {
  const orbit = escapingOrbit(TRAPPED_SEED, 80);
  assert.equal(orbit.length, 80);
  assert.ok(orbit.every((point) => magnitudeSq(point) <= 4));
});

test("stack seeds all escape so the nebula film can paint them", () => {
  assert.ok(STACK_SEEDS.length >= 8);
  for (const seed of STACK_SEEDS) {
    const orbit = escapingOrbit(seed, 64);
    assert.ok(magnitudeSq(orbit[orbit.length - 1]) > 4);
  }
});

test("HiDPI backing store is at least 2x CSS pixels", () => {
  assert.deepEqual(canvasBackingSize(312, 96, 1), { width: 624, height: 192, dpr: 2 });
  assert.deepEqual(canvasBackingSize(312, 96, 2), { width: 624, height: 192, dpr: 2 });
  assert.deepEqual(canvasBackingSize(312, 96, 3), { width: 936, height: 288, dpr: 3 });
});
