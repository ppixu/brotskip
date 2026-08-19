import assert from "node:assert/strict";
import test from "node:test";
import {
  SACRED_BALL_ARRANGEMENTS,
  SACRED_BALL_BLEND_MS,
  SACRED_BALL_MIN_LIFE,
  SACRED_BALL_PERIOD_MS,
  SACRED_BALL_POINTS,
  SACRED_BALL_RADIUS,
  projectSacredBall,
  sacredBallArrangement,
  sacredBallGlyphPose,
  sacredBallHopScale,
  sacredBallHopT,
  sacredBallLifeScale,
  sacredBallPose,
} from "../../lib/sacred-ball.ts";

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test("the sacred ball has a 3D lattice for every 2D glyph", () => {
  assert.equal(SACRED_BALL_POINTS, 42);
  assert.equal(SACRED_BALL_ARRANGEMENTS, 7);
  assert.ok(SACRED_BALL_RADIUS >= 12);
  assert.ok(SACRED_BALL_RADIUS <= 20);
  assert.equal(SACRED_BALL_PERIOD_MS, 2000);
  assert.ok(SACRED_BALL_BLEND_MS < SACRED_BALL_PERIOD_MS);

  for (let index = 0; index < SACRED_BALL_ARRANGEMENTS; index++) {
    const points = sacredBallArrangement(index);
    assert.equal(points.length, SACRED_BALL_POINTS);
    for (const point of points) {
      assert.ok(Math.abs(Math.hypot(point.x, point.y, point.z) - 1) < 1e-6);
    }
  }
});

test("the idle lattice holds a shape then morphs to the next one every two seconds", () => {
  const first = sacredBallArrangement(0);
  const second = sacredBallArrangement(1);
  const held = sacredBallPose(400);
  for (let index = 0; index < first.length; index++) {
    assert.ok(dist(held[index], first[index]) < 1e-9);
  }

  const arrived = sacredBallPose(SACRED_BALL_PERIOD_MS);
  for (let index = 0; index < second.length; index++) {
    assert.ok(dist(arrived[index], second[index]) < 1e-9);
  }
});

test("in-air morphs ease from the last glyph into the next one", () => {
  const from = sacredBallArrangement(1);
  const to = sacredBallArrangement(2);
  const start = sacredBallGlyphPose(1, 2, 0);
  const end = sacredBallGlyphPose(1, 2, 1);
  for (let index = 0; index < from.length; index++) {
    assert.ok(dist(start[index], from[index]) < 1e-9);
    assert.ok(dist(end[index], to[index]) < 1e-9);
  }
  const mid = sacredBallGlyphPose(1, 2, 0.5);
  let moved = 0;
  for (let index = 0; index < mid.length; index++) {
    assert.ok(Math.abs(Math.hypot(mid[index].x, mid[index].y, mid[index].z) - 1) < 1e-6);
    if (dist(mid[index], from[index]) > 0.02 && dist(mid[index], to[index]) > 0.02) moved += 1;
  }
  assert.ok(moved > 10);
});

test("a skip hop grows at the apex and finishes as the next glyph", () => {
  assert.equal(sacredBallHopT(0, true), 0);
  assert.ok(Math.abs(sacredBallHopT(1, true) - 0.5) < 1e-9);
  assert.ok(Math.abs(sacredBallHopT(1, false) - 0.5) < 1e-9);
  assert.equal(sacredBallHopT(0, false), 1);
  assert.ok(sacredBallHopT(0.5, false) > sacredBallHopT(0.5, true));
});

test("the ball is full size at rest, pulses with hop height, and shrinks toward the last skip", () => {
  assert.equal(sacredBallHopScale(0, false), 1);
  assert.ok(sacredBallHopScale(1, true) > sacredBallHopScale(0, true));
  assert.equal(sacredBallLifeScale(0, 8), 1);
  assert.equal(sacredBallLifeScale(8, 8), SACRED_BALL_MIN_LIFE);
  assert.ok(sacredBallLifeScale(6, 8) < sacredBallLifeScale(2, 8));
  assert.ok(SACRED_BALL_MIN_LIFE >= 0.25 && SACRED_BALL_MIN_LIFE < 0.5);
});

test("projecting the ball rotates a pose as a rigid 3D body", () => {
  const pose = sacredBallPose(0);
  const identity = projectSacredBall(0, 0, 5, pose);
  assert.equal(identity.points.length, 42);
  assert.ok(identity.edges.length >= 42);

  const yaw = projectSacredBall(Math.PI / 2, 0, 5, pose);
  for (let index = 0; index < identity.points.length; index++) {
    const before = identity.points[index];
    const after = yaw.points[index];
    assert.ok(Math.abs(after.x - before.depth * 5) < 1e-9, "yaw maps z onto x");
    assert.ok(Math.abs(after.y - before.y) < 1e-9);
    assert.ok(Math.abs(after.depth * 5 + before.x) < 1e-9, "yaw maps x onto -z");
  }
});
