export type Vec3 = { x: number; y: number; z: number };

export type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
};

export type ProjectedEdge = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  depth: number;
};

export const SACRED_BALL_POINTS = 42;
export const SACRED_BALL_PERIOD_MS = 2000;
export const SACRED_BALL_BLEND_MS = 700;
export const SACRED_BALL_RADIUS = 14;
export const SACRED_BALL_MIN_LIFE = 0.32;

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;
const NEIGHBOR_COUNT = 5;
const NEIGHBOR_MAX = 1.05;

function normalize(point: Vec3): Vec3 {
  const length = Math.hypot(point.x, point.y, point.z) || 1;
  return { x: point.x / length, y: point.y / length, z: point.z / length };
}

function dist(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function keyOf(point: Vec3) {
  return `${Math.round(point.x * 1e5)}:${Math.round(point.y * 1e5)}:${Math.round(point.z * 1e5)}`;
}

function collect(raw: Vec3[]) {
  const seen = new Set<string>();
  const points: Vec3[] = [];
  for (const point of raw) {
    const unit = normalize(point);
    const key = keyOf(unit);
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(unit);
  }
  return points;
}

function canon(points: Vec3[]) {
  return [...points].sort((a, b) => {
    const azimuth = Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
    if (Math.abs(azimuth) > 1e-9) return azimuth;
    return a.y - b.y;
  });
}

function minEdge(points: Vec3[]) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const gap = dist(points[i], points[j]);
      if (gap > 1e-6 && gap < best) best = gap;
    }
  }
  return best;
}

function withMidpoints(seeds: Vec3[]) {
  const edge = minEdge(seeds);
  const raw = [...seeds];
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      if (Math.abs(dist(seeds[i], seeds[j]) - edge) > edge * 0.08) continue;
      raw.push({
        x: seeds[i].x + seeds[j].x,
        y: seeds[i].y + seeds[j].y,
        z: seeds[i].z + seeds[j].z,
      });
    }
  }
  return collect(raw);
}

function icosahedron() {
  const seeds: Vec3[] = [];
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      seeds.push({ x: 0, y: s, z: t * PHI });
      seeds.push({ x: s, y: t * PHI, z: 0 });
      seeds.push({ x: s * PHI, y: 0, z: t });
    }
  }
  return collect(seeds);
}

function octahedron() {
  return collect([
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ]);
}

function tetrahedron() {
  return collect([
    { x: 1, y: 1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
  ]);
}

function slerp(a: Vec3, b: Vec3, t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  if (dot > 0.9995) return normalize({
    x: a.x + (b.x - a.x) * clamped,
    y: a.y + (b.y - a.y) * clamped,
    z: a.z + (b.z - a.z) * clamped,
  });
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta) || 1;
  const wa = Math.sin((1 - clamped) * theta) / sinTheta;
  const wb = Math.sin(clamped * theta) / sinTheta;
  return {
    x: a.x * wa + b.x * wb,
    y: a.y * wa + b.y * wb,
    z: a.z * wa + b.z * wb,
  };
}

function concentricHalo() {
  const seeds: Vec3[] = [];
  for (const y of [0, 0.55]) {
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    for (let index = 0; index < 21; index++) {
      const angle = index * TAU / 21 - Math.PI / 2;
      seeds.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
    }
  }
  return collect(seeds);
}

function vesicaRings() {
  const seeds: Vec3[] = [];
  const n = 21;
  const cos60 = 0.5;
  const sin60 = Math.sqrt(3) / 2;
  for (let index = 0; index < n; index++) {
    const t = index * TAU / n;
    seeds.push({ x: Math.cos(t), y: Math.sin(t), z: 0 });
    seeds.push({ x: Math.cos(t), y: Math.sin(t) * cos60, z: Math.sin(t) * sin60 });
  }
  return collect(seeds);
}

function crystallize(targets: Vec3[], amount: number) {
  return canon(fibonacciSphere().map((point) => {
    let nearest = targets[0];
    let best = dist(point, targets[0]);
    for (const target of targets) {
      const gap = dist(point, target);
      if (gap < best) {
        nearest = target;
        best = gap;
      }
    }
    return slerp(point, nearest, amount);
  }));
}

function geodesicIcosa() {
  return withMidpoints(icosahedron());
}

function hexRings() {
  const seeds: Vec3[] = [];
  for (let ring = 0; ring < 7; ring++) {
    const y = 1 - 2 * (ring + 0.5) / 7;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const turn = ring * Math.PI / 6;
    for (let index = 0; index < 6; index++) {
      const angle = index * TAU / 6 + turn;
      seeds.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
    }
  }
  return collect(seeds);
}

function fibonacciSphere() {
  const seeds: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < SACRED_BALL_POINTS; index++) {
    const y = 1 - (index + 0.5) / SACRED_BALL_POINTS * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * golden;
    seeds.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
  }
  return collect(seeds);
}

function merkaba() {
  const cube = collect([
    { x: 1, y: 1, z: 1 },
    { x: 1, y: 1, z: -1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: -1, z: -1 },
  ]);
  const tetraA = [0, 3, 5, 6].map((index) => cube[index]);
  const tetraB = [1, 2, 4, 7].map((index) => cube[index]);
  const raw = [...cube, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }];
  for (const tetra of [tetraA, tetraB]) {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const a = tetra[i];
        const b = tetra[j];
        raw.push({ x: a.x * 2 + b.x, y: a.y * 2 + b.y, z: a.z * 2 + b.z });
        raw.push({ x: a.x + b.x * 2, y: a.y + b.y * 2, z: a.z + b.z * 2 });
      }
      const k = (i + 1) % 4;
      const l = (i + 2) % 4;
      const face = {
        x: tetra[i].x + tetra[k].x + tetra[l].x,
        y: tetra[i].y + tetra[k].y + tetra[l].y,
        z: tetra[i].z + tetra[k].z + tetra[l].z,
      };
      raw.push(face);
    }
  }
  return collect(raw);
}

function padToCount(points: Vec3[], count: number) {
  if (points.length === count) return canon(points);
  if (points.length > count) return canon(points).slice(0, count);
  const extra = fibonacciSphere();
  const seen = new Set(points.map(keyOf));
  const mixed = [...points];
  for (const point of extra) {
    if (mixed.length >= count) break;
    const key = keyOf(point);
    if (seen.has(key)) continue;
    seen.add(key);
    mixed.push(point);
  }
  return canon(mixed).slice(0, count);
}

const ARRANGEMENTS = [
  concentricHalo(),
  crystallize(tetrahedron(), 0.78),
  vesicaRings(),
  crystallize(octahedron(), 0.72),
  geodesicIcosa(),
  merkaba(),
  hexRings(),
].map((points) => padToCount(points, SACRED_BALL_POINTS));

export const SACRED_BALL_ARRANGEMENTS = ARRANGEMENTS.length;

export function sacredBallArrangement(index: number) {
  const wrapped = ((index % ARRANGEMENTS.length) + ARRANGEMENTS.length) % ARRANGEMENTS.length;
  return ARRANGEMENTS[wrapped].map((point) => ({ ...point }));
}

export function sacredBallGlyphPose(fromGlyph: number, toGlyph: number, t: number) {
  const from = ((fromGlyph % ARRANGEMENTS.length) + ARRANGEMENTS.length) % ARRANGEMENTS.length;
  const to = ((toGlyph % ARRANGEMENTS.length) + ARRANGEMENTS.length) % ARRANGEMENTS.length;
  const a = ARRANGEMENTS[from];
  const b = ARRANGEMENTS[to];
  const eased = 0.5 - 0.5 * Math.cos(Math.max(0, Math.min(1, t)) * Math.PI);
  return a.map((point, index) => slerp(point, b[index], eased));
}

export function sacredBallHopT(heightT: number, rising: boolean) {
  const height = Math.max(0, Math.min(1, heightT));
  return rising ? 0.5 * height : 0.5 + 0.5 * (1 - height);
}

export function sacredBallHopScale(heightT: number, flying: boolean) {
  if (!flying) return 1;
  return 0.58 + 0.42 * Math.max(0, Math.min(1, heightT));
}

export function sacredBallLifeScale(skips: number, plannedSkips: number) {
  if (plannedSkips <= 0) return 1;
  const remaining = Math.max(0, 1 - Math.max(0, skips) / plannedSkips);
  return SACRED_BALL_MIN_LIFE + (1 - SACRED_BALL_MIN_LIFE) * remaining;
}

export function sacredBallPose(now: number) {
  const elapsed = Math.max(0, now);
  const slot = Math.floor(elapsed / SACRED_BALL_PERIOD_MS);
  const local = elapsed - slot * SACRED_BALL_PERIOD_MS;
  const from = slot % ARRANGEMENTS.length;
  const to = (from + 1) % ARRANGEMENTS.length;
  const hold = SACRED_BALL_PERIOD_MS - SACRED_BALL_BLEND_MS;
  const raw = local <= hold ? 0 : (local - hold) / SACRED_BALL_BLEND_MS;
  const t = 0.5 - 0.5 * Math.cos(raw * Math.PI);
  const a = ARRANGEMENTS[from];
  const b = ARRANGEMENTS[to];
  return a.map((point, index) => slerp(point, b[index], t));
}

function nearestEdges(vertices: Vec3[]) {
  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (let i = 0; i < vertices.length; i++) {
    const neighbors = vertices
      .map((point, j) => ({ j, gap: i === j ? Infinity : dist(vertices[i], point) }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, NEIGHBOR_COUNT);
    for (const neighbor of neighbors) {
      if (neighbor.gap > NEIGHBOR_MAX) continue;
      const a = Math.min(i, neighbor.j);
      const b = Math.max(i, neighbor.j);
      const key = `${a}:${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  return edges;
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

export function projectSacredBall(yaw: number, pitch: number, radius: number, vertices = sacredBallPose(0)) {
  const rotated = vertices.map((vertex) => rotateYawPitch(vertex, yaw, pitch));
  const points: ProjectedPoint[] = rotated.map((vertex) => ({
    x: vertex.x * radius,
    y: vertex.y * radius,
    depth: vertex.z,
  }));
  const edges: ProjectedEdge[] = nearestEdges(rotated).map(([a, b]) => ({
    ax: points[a].x,
    ay: points[a].y,
    bx: points[b].x,
    by: points[b].y,
    depth: (points[a].depth + points[b].depth) * 0.5,
  }));
  return { points, edges };
}
