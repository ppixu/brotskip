import assert from "node:assert/strict";
import test from "node:test";
import {
  SACRED_BALL_EDGE_COUNT,
  SACRED_BALL_RADIUS,
  SACRED_BALL_VERTEX_COUNT,
  projectSacredBall,
  sacredBallEdges,
  sacredBallVertices,
} from "../../lib/sacred-ball.ts";

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test("the sacred ball is a cuboctahedron with a center, the 3D Metatron lattice", () => {
  const vertices = sacredBallVertices();
  const edges = sacredBallEdges();
  assert.equal(vertices.length, SACRED_BALL_VERTEX_COUNT);
  assert.equal(SACRED_BALL_VERTEX_COUNT, 13);
  assert.equal(edges.length, SACRED_BALL_EDGE_COUNT);
  assert.equal(SACRED_BALL_EDGE_COUNT, 36);

  const center = vertices[0];
  assert.equal(center.x, 0);
  assert.equal(center.y, 0);
  assert.equal(center.z, 0);

  for (let index = 1; index < vertices.length; index++) {
    assert.ok(Math.abs(dist(vertices[index], center) - 1) < 1e-9);
  }

  const surface = edges.filter(([a, b]) => a !== 0 && b !== 0);
  const spokes = edges.filter(([a, b]) => a === 0 || b === 0);
  assert.equal(surface.length, 24);
  assert.equal(spokes.length, 12);
  for (const [a, b] of surface) {
    assert.ok(Math.abs(dist(vertices[a], vertices[b]) - 1) < 1e-9);
  }
});

test("the thrown stone stays a small ball, not the pond glyph radius", () => {
  assert.ok(SACRED_BALL_RADIUS <= 6);
  assert.ok(SACRED_BALL_RADIUS >= 4);
});

test("projecting the ball rotates the lattice as a rigid 3D body", () => {
  const identity = projectSacredBall(0, 0, 5);
  assert.equal(identity.points.length, 13);
  assert.equal(identity.edges.length, 36);
  const center = identity.points[0];
  assert.equal(center.x, 0);
  assert.equal(center.y, 0);
  assert.ok(center.center);

  const yaw = projectSacredBall(Math.PI / 2, 0, 5);
  for (let index = 1; index < identity.points.length; index++) {
    const before = identity.points[index];
    const after = yaw.points[index];
    assert.ok(Math.abs(after.x - before.depth * 5) < 1e-9, "yaw maps z onto x");
    assert.ok(Math.abs(after.y - before.y) < 1e-9);
    assert.ok(Math.abs(after.depth * 5 + before.x) < 1e-9, "yaw maps x onto -z");
  }

  const vertices = sacredBallVertices();
  const spun = projectSacredBall(0.7, 0.4, 1);
  for (const [a, b] of sacredBallEdges()) {
    const expected = dist(vertices[a], vertices[b]);
    const got = Math.hypot(
      spun.points[a].x - spun.points[b].x,
      spun.points[a].y - spun.points[b].y,
      spun.points[a].depth - spun.points[b].depth,
    );
    assert.ok(Math.abs(got - expected) < 1e-9);
  }
});
