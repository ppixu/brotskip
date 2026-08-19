export type Vec3 = { x: number; y: number; z: number };

export type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  center: boolean;
};

export type ProjectedEdge = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  depth: number;
};

/** Cuboctahedron (vector equilibrium) plus its center: 3D Metatron’s Cube. */
export const SACRED_BALL_VERTEX_COUNT = 13;
/** 24 cuboctahedron edges plus 12 radii through the center. */
export const SACRED_BALL_EDGE_COUNT = 36;
/** Thrown-stone radius in CSS pixels — smaller than the pond glyph stamps. */
export const SACRED_BALL_RADIUS = 5;

const INV_SQRT2 = 1 / Math.sqrt(2);

const SURFACE_VERTICES: readonly Vec3[] = [
  { x: INV_SQRT2, y: INV_SQRT2, z: 0 },
  { x: INV_SQRT2, y: -INV_SQRT2, z: 0 },
  { x: -INV_SQRT2, y: INV_SQRT2, z: 0 },
  { x: -INV_SQRT2, y: -INV_SQRT2, z: 0 },
  { x: INV_SQRT2, y: 0, z: INV_SQRT2 },
  { x: INV_SQRT2, y: 0, z: -INV_SQRT2 },
  { x: -INV_SQRT2, y: 0, z: INV_SQRT2 },
  { x: -INV_SQRT2, y: 0, z: -INV_SQRT2 },
  { x: 0, y: INV_SQRT2, z: INV_SQRT2 },
  { x: 0, y: INV_SQRT2, z: -INV_SQRT2 },
  { x: 0, y: -INV_SQRT2, z: INV_SQRT2 },
  { x: 0, y: -INV_SQRT2, z: -INV_SQRT2 },
];

function distSq(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function buildEdges(): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  for (let index = 0; index < SURFACE_VERTICES.length; index++) {
    edges.push([0, index + 1]);
  }
  for (let i = 0; i < SURFACE_VERTICES.length; i++) {
    for (let j = i + 1; j < SURFACE_VERTICES.length; j++) {
      if (Math.abs(distSq(SURFACE_VERTICES[i], SURFACE_VERTICES[j]) - 1) < 1e-9) {
        edges.push([i + 1, j + 1]);
      }
    }
  }
  return edges;
}

const EDGES = buildEdges();

export function sacredBallVertices(): Vec3[] {
  return [{ x: 0, y: 0, z: 0 }, ...SURFACE_VERTICES.map((vertex) => ({ ...vertex }))];
}

export function sacredBallEdges(): Array<[number, number]> {
  return EDGES.map(([a, b]) => [a, b]);
}

function rotateYawPitch(point: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const yawed = {
    x: point.x * cy + point.z * sy,
    y: point.y,
    z: -point.x * sy + point.z * cy,
  };
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return {
    x: yawed.x,
    y: yawed.y * cp - yawed.z * sp,
    z: yawed.y * sp + yawed.z * cp,
  };
}

export function projectSacredBall(yaw: number, pitch: number, radius: number) {
  const vertices = sacredBallVertices().map((vertex) => rotateYawPitch(vertex, yaw, pitch));
  const points: ProjectedPoint[] = vertices.map((vertex, index) => ({
    x: vertex.x * radius,
    y: vertex.y * radius,
    depth: vertex.z,
    center: index === 0,
  }));
  const edges: ProjectedEdge[] = EDGES.map(([a, b]) => ({
    ax: points[a].x,
    ay: points[a].y,
    bx: points[b].x,
    by: points[b].y,
    depth: (points[a].depth + points[b].depth) * 0.5,
  }));
  return { points, edges };
}
