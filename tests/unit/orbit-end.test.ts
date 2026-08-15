import assert from "node:assert/strict";
import test from "node:test";
import {
  ESCAPE_RADIUS_SQ,
  OFFSCREEN_STREAK,
  TINY_HOP_PX,
  TINY_HOP_STREAK,
  updateOrbitEnd,
} from "../../lib/orbit-end.ts";

const base = {
  magSq: 0.5,
  hopPx: 4,
  onScreen: true,
  offscreenStreak: 0,
  tinyHopStreak: 0,
  maxHopPx: 2000,
};

test("a visible spiral hop does not resolve", () => {
  const next = updateOrbitEnd(base);
  assert.equal(next.resolved, false);
  assert.equal(next.tinyHopStreak, 0);
  assert.equal(next.offscreenStreak, 0);
});

test("a large on-screen hop keeps iterating", () => {
  const next = updateOrbitEnd({ ...base, hopPx: 5000 });
  assert.equal(next.resolved, false);
});

test("escape radius ends the orbit", () => {
  const next = updateOrbitEnd({ ...base, magSq: ESCAPE_RADIUS_SQ + 0.01 });
  assert.equal(next.resolved, true);
});

test("a single sub-pixel hop does not resolve", () => {
  const next = updateOrbitEnd({ ...base, hopPx: TINY_HOP_PX / 2 });
  assert.equal(next.resolved, false);
  assert.equal(next.tinyHopStreak, 1);
});

test("a long run of sub-pixel hops resolves as converged", () => {
  let streak = 0;
  let resolved = false;
  for (let step = 0; step < TINY_HOP_STREAK; step++) {
    const next = updateOrbitEnd({ ...base, hopPx: TINY_HOP_PX / 2, tinyHopStreak: streak });
    streak = next.tinyHopStreak;
    resolved = next.resolved;
  }
  assert.equal(resolved, true);
  assert.equal(streak, TINY_HOP_STREAK);
});

test("a slow visible spiral keeps iterating", () => {
  let streak = 0;
  for (let step = 0; step < 200; step++) {
    const next = updateOrbitEnd({ ...base, hopPx: 0.12, tinyHopStreak: streak });
    streak = next.tinyHopStreak;
    assert.equal(next.resolved, false);
  }
});

test("a spiral that grazes off-screen for a while keeps iterating", () => {
  let streak = 0;
  for (let step = 0; step < 120; step++) {
    const next = updateOrbitEnd({ ...base, onScreen: false, offscreenStreak: streak });
    streak = next.offscreenStreak;
    assert.equal(next.resolved, false);
  }
});

test("a long off-screen run resolves as no longer visible", () => {
  let streak = 0;
  let resolved = false;
  for (let step = 0; step < OFFSCREEN_STREAK; step++) {
    const next = updateOrbitEnd({ ...base, onScreen: false, offscreenStreak: streak });
    streak = next.offscreenStreak;
    resolved = next.resolved;
  }
  assert.equal(resolved, true);
});

test("returning on-screen clears the off-screen streak", () => {
  const next = updateOrbitEnd({ ...base, onScreen: true, offscreenStreak: OFFSCREEN_STREAK - 1 });
  assert.equal(next.resolved, false);
  assert.equal(next.offscreenStreak, 0);
});

test("a huge hop off-screen still iterates while inside the escape radius", () => {
  const next = updateOrbitEnd({ ...base, onScreen: false, hopPx: 5000 });
  assert.equal(next.resolved, false);
});
