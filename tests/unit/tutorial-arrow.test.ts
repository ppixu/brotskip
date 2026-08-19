import assert from "node:assert/strict";
import test from "node:test";
import {
  TUTORIAL_ARROW_LABEL,
  tutorialArrowGeometry,
  tutorialArrowStretch,
  tutorialArrowVisible,
} from "../../lib/tutorial-arrow.ts";

test("the first-throw hint tells the player to pull back", () => {
  assert.equal(TUTORIAL_ARROW_LABEL, "Pull back to throw");
});

test("the tutorial arrow stretches and recedes unless motion is reduced", () => {
  const samples = [0, 400, 800, 1200, 1600].map((now) => tutorialArrowStretch(now, false));
  for (const stretch of samples) {
    assert.ok(stretch >= 0 && stretch <= 1);
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) > 0.3);
  assert.equal(tutorialArrowStretch(0, true), tutorialArrowStretch(900, true));
});

test("the arrow grows backward from the rock, down the screen", () => {
  const origin = { x: 200, y: 410 };
  const short = tutorialArrowGeometry(origin, 0, 500, 500);
  const long = tutorialArrowGeometry(origin, 1, 500, 500);
  assert.ok(short.from.y > origin.y);
  assert.equal(short.from.x, origin.x);
  assert.equal(short.to.x, origin.x);
  assert.ok(short.to.y > short.from.y);
  assert.ok(long.to.y - long.from.y > short.to.y - short.from.y);
  assert.ok(long.head.every((point) => point.y >= long.to.y - 1));
  assert.ok(long.label.x > origin.x);
});

test("the first-throw arrow only shows on the idle stone before a throw", () => {
  assert.equal(tutorialArrowVisible({ introActive: false, spectator: false, phase: "ready", hasThrown: false }), true);
  assert.equal(tutorialArrowVisible({ introActive: true, spectator: false, phase: "ready", hasThrown: false }), false);
  assert.equal(tutorialArrowVisible({ introActive: false, spectator: true, phase: "ready", hasThrown: false }), false);
  assert.equal(tutorialArrowVisible({ introActive: false, spectator: false, phase: "aiming", hasThrown: false }), false);
  assert.equal(tutorialArrowVisible({ introActive: false, spectator: false, phase: "ready", hasThrown: true }), false);
});
