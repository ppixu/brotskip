import assert from "node:assert/strict";
import test from "node:test";
import {
  FLASHLIGHT_HALF_ANGLE,
  FLASHLIGHT_MAX_DEPTH,
  FLASHLIGHT_SOURCE_CAP,
  FLASHLIGHT_SOURCE_DOTS,
  pointInFlashlightCone,
  sampleRayInCone,
  flashlightSkipLandings,
} from "../../lib/flashlight-probe.ts";
import { allocateSources } from "../../lib/orbit-sources.ts";

const cone = {
  apexX: 100,
  apexY: 180,
  directionX: 0,
  directionY: -1,
  range: 200,
};

test("flashlight budget stays light enough to aim without hitching", () => {
  assert.equal(FLASHLIGHT_SOURCE_DOTS, 6);
  assert.ok(FLASHLIGHT_MAX_DEPTH <= 8_000);
  assert.ok(FLASHLIGHT_SOURCE_CAP <= 36);
});

test("a point along the aim ray sits inside the flashlight cone", () => {
  assert.equal(pointInFlashlightCone(100, 80, cone, FLASHLIGHT_HALF_ANGLE), true);
  assert.equal(pointInFlashlightCone(10, 180, cone, FLASHLIGHT_HALF_ANGLE), false);
});

test("sampled cone rays stay inside the cone and in range", () => {
  let seed = 1;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 20; i++) {
    const ray = sampleRayInCone(cone, random);
    assert.ok(pointInFlashlightCone(ray.x, ray.y, cone, FLASHLIGHT_HALF_ANGLE));
    assert.ok(ray.distance > 0 && ray.distance <= cone.range);
  }
});

test("invisible skip landings hop forward from the apex", () => {
  const landings = flashlightSkipLandings({
    x: 200,
    y: 300,
    angle: -Math.PI / 2,
    power: 0.7,
    pondScale: 400,
    width: 400,
    height: 400,
    plannedSkips: 3,
  });
  assert.ok(landings.length >= 1);
  assert.ok(landings[0].y < 300);
  assert.equal(landings[0].index, 1);
});

test("source allocation wraps inside the live cap", () => {
  const first = allocateSources(0, 0, 6, 36);
  assert.deepEqual(first, { start: 0, nextSource: 6, sourceCount: 6 });
  const wrap = allocateSources(34, 36, 6, 36);
  assert.equal(wrap.start, 0);
  assert.equal(wrap.nextSource, 6);
  assert.equal(wrap.sourceCount, 36);
});
