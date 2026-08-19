import assert from "node:assert/strict";
import test from "node:test";
import {
  SACRED_BALL_ARRANGEMENTS,
  SACRED_BALL_BLEND_MS,
  SACRED_BALL_PERIOD_MS,
  SACRED_BALL_POINTS,
  SACRED_BALL_RADIUS,
  projectSacredBall,
  sacredBallArrangement,
  sacredBallPose,
} from "../../lib/sacred-ball.ts";

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test("the sacred ball is a larger geodesic lattice with several 3D arrangements", () => {
  assert.equal(SACRED_BALL_POINTS, 42);
  assert.ok(SACRED_BALL_ARRANGEMENTS >= 4);
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

test("the lattice holds a shape then morphs to the next one every two seconds", () => {
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

  const mid = sacredBallPose(SACRED_BALL_PERIOD_MS - SACRED_BALL_BLEND_MS / 2);
  let moved = 0;
  for (let index = 0; index < mid.length; index++) {
    assert.ok(Math.abs(Math.hypot(mid[index].x, mid[index].y, mid[index].z) - 1) < 1e-6);
    if (dist(mid[index], first[index]) > 0.02 && dist(mid[index], second[index]) > 0.02) moved += 1;
  }
  assert.ok(moved > 10, "mid-blend points should sit between the two lattices");
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
