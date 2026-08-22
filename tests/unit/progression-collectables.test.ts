import assert from "node:assert/strict";
import test from "node:test";
import { DEPTH_OPTIONS } from "../../lib/orbit-tuning.ts";
import {
  COLLECTABLE_RADIUS_PX,
  COLLECTABLE_SPAWN_CHANCE,
  collectableHit,
  rollCollectable,
  surgedDepth,
} from "../../lib/progression/collectables.ts";

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("spawn rate tracks the configured chance", () => {
  const random = lcg(11);
  let spawned = 0;
  for (let index = 0; index < 4000; index++) if (rollCollectable(random, 800, 600)) spawned += 1;
  const rate = spawned / 4000;
  assert.ok(Math.abs(rate - COLLECTABLE_SPAWN_CHANCE) < 0.04, `rate ${rate}`);
});

test("spawns land inside the central band and cover all three types", () => {
  const random = lcg(23);
  const types = new Set<string>();
  for (let index = 0; index < 4000; index++) {
    const collectable = rollCollectable(random, 800, 600);
    if (!collectable) continue;
    types.add(collectable.type);
    assert.ok(collectable.x >= 200 && collectable.x <= 600);
    assert.ok(collectable.y >= 120 && collectable.y <= 360);
  }
  assert.deepEqual([...types].sort(), ["depthSurge", "extraSkips", "multiplier"]);
});

test("hit test uses the radius", () => {
  const collectable = { type: "multiplier" as const, x: 100, y: 100 };
  assert.ok(collectableHit(collectable, 100 + COLLECTABLE_RADIUS_PX, 100));
  assert.ok(!collectableHit(collectable, 100 + COLLECTABLE_RADIUS_PX + 1, 100));
});

test("surgedDepth steps one tier and clamps at the top", () => {
  assert.equal(surgedDepth(DEPTH_OPTIONS[0]), DEPTH_OPTIONS[1]);
  const top = DEPTH_OPTIONS[DEPTH_OPTIONS.length - 1];
  assert.equal(surgedDepth(top), top);
});
