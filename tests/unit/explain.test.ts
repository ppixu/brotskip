import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_SEEDS,
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
