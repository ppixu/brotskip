import { escapingOrbit, magnitudeSq, type Complex } from "./explain.ts";

/** Matches `BOUNDS` in shaders.ts so throws land on the same pond. */
export const THROW_BOUNDS = { xMin: -2.2, xMax: 1.2, yMin: -1.5, yMax: 1.5 };

/** Short orbits keep the opening sequence inside about five seconds. */
export const INTRO_MAX_ITERATIONS = 80;

export const INTRO_SAMPLE_BUDGET: Record<number, number> = {
  2048: 4_000_000,
  4096: 10_000_000,
};

export const INTRO_THROWS_PER_FRAME = 3;
export const INTRO_THROW_LIFE_MS = 1400;
export const INTRO_SOURCE_RADIUS_PX = 10;
export const INTRO_SEED_DOTS = 18;
export const SKIP_TINTS = [
  [80, 214, 255],
  [92, 255, 196],
  [186, 255, 120],
  [255, 230, 110],
  [255, 168, 92],
  [255, 122, 186],
  [196, 146, 255],
] as const;

export const GLYPH_COUNT = 7;
export const SACRED_PATH_COUNTS = [2, 2, 2, 4, 2, 3, 7] as const;

export function samplePolygon(vertices: Array<{ x: number; y: number }>, t: number) {
  const position = ((t % 1) + 1) % 1 * vertices.length;
  const edge = Math.floor(position) % vertices.length;
  const local = position - Math.floor(position);
  const a = vertices[edge];
  const b = vertices[(edge + 1) % vertices.length];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

export function regularVertices(sides: number, rotation = -Math.PI / 2) {
  const tau = Math.PI * 2;
  return Array.from({ length: sides }, (_, index) => ({
    x: Math.cos(rotation + index * tau / sides),
    y: Math.sin(rotation + index * tau / sides),
  }));
}

export function sacredShapeOffset(shape: number, path: number, t: number) {
  const tau = Math.PI * 2;
  const circle = (cx: number, cy: number, radius: number) => ({
    x: cx + Math.cos(t * tau - Math.PI / 2) * radius,
    y: cy + Math.sin(t * tau - Math.PI / 2) * radius,
  });
  switch (shape % GLYPH_COUNT) {
    case 0: return circle(0, 0, path === 0 ? 1 : 0.46); // concentric halo
    case 1: return path === 0 ? samplePolygon(regularVertices(3), t) : circle(0, 0, 0.48); // triangle mandala
    case 2: return circle(path === 0 ? -0.32 : 0.32, 0, 0.68); // vesica piscis
    case 3: { // four-petal rose
      const angle = path * Math.PI / 2;
      return circle(Math.cos(angle) * 0.43, Math.sin(angle) * 0.43, 0.52);
    }
    case 4: { // pentagram and inner seal
      if (path === 1) return circle(0, 0, 0.34);
      const vertices = regularVertices(5);
      return samplePolygon([vertices[0], vertices[2], vertices[4], vertices[1], vertices[3]], t);
    }
    case 5: return path < 2
      ? samplePolygon(regularVertices(3, -Math.PI / 2 + path * Math.PI), t)
      : circle(0, 0, 0.34); // hexagram and inner seal
    default: { // flower of life
      if (path === 0) return circle(0, 0, 0.42);
      const angle = (path - 1) * tau / 6 - Math.PI / 2;
      return circle(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0.42);
    }
  }
}

export function sampleSplash(random: () => number): Complex {
  return {
    re: THROW_BOUNDS.xMin + random() * (THROW_BOUNDS.xMax - THROW_BOUNDS.xMin),
    im: THROW_BOUNDS.yMin + random() * (THROW_BOUNDS.yMax - THROW_BOUNDS.yMin),
  };
}

export function sampleEscapingSplash(random: () => number, maxSteps = INTRO_MAX_ITERATIONS) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const splash = sampleSplash(random);
    const orbit = escapingOrbit(splash, maxSteps);
    if (orbit.length >= 5 && magnitudeSq(orbit[orbit.length - 1]) > 4) {
      return { ...splash, orbit };
    }
  }
  const splash = { re: -0.7, im: 0.69 };
  return { ...splash, orbit: escapingOrbit(splash, maxSteps) };
}

export function impactSeedCloud(
  x: number,
  y: number,
  canvasSize: number,
  shape: number,
  count: number,
): Complex[] {
  const points: Complex[] = [];
  const paths = SACRED_PATH_COUNTS[shape % SACRED_PATH_COUNTS.length];
  for (let index = 0; index < count; index++) {
    const path = index % paths;
    const pathIndex = Math.floor(index / paths);
    const samplesOnPath = Math.ceil((count - path) / paths);
    const offset = sacredShapeOffset(shape, path, pathIndex / Math.max(samplesOnPath, 1));
    points.push(introCanvasToComplex(
      x + offset.x * INTRO_SOURCE_RADIUS_PX,
      y + offset.y * INTRO_SOURCE_RADIUS_PX,
      canvasSize,
    ));
  }
  return points;
}

function nearestEscaping(c: Complex, random: () => number, maxSteps: number) {
  const tryCandidate = (candidate: Complex) => {
    const orbit = escapingOrbit(candidate, maxSteps);
    if (orbit.length >= 5 && magnitudeSq(orbit[orbit.length - 1]) > 4) {
      return { seed: candidate, orbit };
    }
    return null;
  };
  const exact = tryCandidate(c);
  if (exact) return exact;
  for (let attempt = 0; attempt < 48; attempt++) {
    const radius = 0.02 + (attempt / 48) * 0.4;
    const angle = random() * Math.PI * 2;
    const found = tryCandidate({
      re: c.re + Math.cos(angle) * radius,
      im: c.im + Math.sin(angle) * radius,
    });
    if (found) return found;
  }
  const fallback = sampleEscapingSplash(random, maxSteps);
  return { seed: { re: fallback.re, im: fallback.im }, orbit: fallback.orbit };
}

export function complexToIntroCanvas(re: number, im: number, size: number) {
  return {
    x: (re - THROW_BOUNDS.xMin) / (THROW_BOUNDS.xMax - THROW_BOUNDS.xMin) * size,
    y: (THROW_BOUNDS.yMax - im) / (THROW_BOUNDS.yMax - THROW_BOUNDS.yMin) * size,
  };
}

export function introCanvasToComplex(x: number, y: number, size: number): Complex {
  return {
    re: THROW_BOUNDS.xMin + (x / size) * (THROW_BOUNDS.xMax - THROW_BOUNDS.xMin),
    im: THROW_BOUNDS.yMax - (y / size) * (THROW_BOUNDS.yMax - THROW_BOUNDS.yMin),
  };
}

export type IntroSkipImpact = {
  x: number;
  y: number;
  t: number; // time in seconds since launch when impact happens
  skipIndex: number;
  complex: Complex;
  seeds: Complex[];
  orbitPoints: Array<{ x: number; y: number }>;
};

export type IntroTrajectoryPoint = {
  x: number;
  y: number;
  z: number;
  t: number;
};

export type IntroRockThrow = {
  shape: number;
  duration: number; // total seconds of flight
  trajectory: IntroTrajectoryPoint[];
  impacts: IntroSkipImpact[];
};

/**
 * Generates a simulated rock throw across the intro canvas that skips on the pond,
 * with each skip impact generating a Mandelbrot iteration orbit.
 */
export function createIntroRockThrow(
  canvasSize: number,
  random: () => number = Math.random,
  maxSteps = INTRO_MAX_ITERATIONS,
): IntroRockThrow {
  const pondScale = canvasSize * 0.9;
  const gravity = pondScale * 1.65;
  const shape = Math.floor(random() * GLYPH_COUNT);

  for (let attempt = 0; attempt < 12; attempt++) {
    // Launch from lower bounds aiming upward/inward
    const launchX = canvasSize * (0.18 + random() * 0.64);
    const launchY = canvasSize * (0.86 + random() * 0.10);

    const target = sampleEscapingSplash(random, maxSteps);
    const aimed = complexToIntroCanvas(target.re, target.im, canvasSize);
    const targetX = aimed.x;
    const targetY = aimed.y;

    const dx = targetX - launchX;
    const dy = targetY - launchY;
    const angle = Math.atan2(dy, dx);
    const power = 0.55 + random() * 0.42;

    const speed = pondScale * (0.34 + 0.48 * power);
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let vz = pondScale * (0.34 + 0.18 * power);
    let x = launchX;
    let y = launchY;
    let z = 1;

    const plannedSkips = 2 + Math.floor(random() * 3); // 2 to 4 skips
    let skips = 0;

    const trajectory: IntroTrajectoryPoint[] = [{ x, y, z, t: 0 }];
    const impacts: IntroSkipImpact[] = [];

    const dt = 1 / 120;
    let t = 0;
    const maxFlightTime = 2.4;

    while (t < maxFlightTime && skips < plannedSkips) {
      t += dt;
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
      vz -= gravity * dt;

      const drag = Math.exp(-0.06 * dt);
      vx *= drag;
      vy *= drag;

      if (trajectory.length === 0 || t - trajectory[trajectory.length - 1].t >= 0.016) {
        trajectory.push({ x, y, z: Math.max(0, z), t });
      }

      // Check for impact on water surface
      if (z <= 0 && vz < 0) {
        z = 0;
        if (x < 12 || x > canvasSize - 12 || y < 12 || y > canvasSize - 12) {
          break;
        }

        skips += 1;
        const landed = introCanvasToComplex(x, y, canvasSize);
        const { seed, orbit } = nearestEscaping(landed, random, maxSteps);
        const origin = complexToIntroCanvas(seed.re, seed.im, canvasSize);
        const seeds = [seed, ...impactSeedCloud(x, y, canvasSize, shape, INTRO_SEED_DOTS)];
        const orbitPoints = [
          origin,
          ...orbit.map((pt) => complexToIntroCanvas(pt.re, pt.im, canvasSize)),
        ];

        impacts.push({
          x,
          y,
          t,
          skipIndex: skips,
          complex: seed,
          seeds,
          orbitPoints,
        });

        // Skip bounce dynamics
        const remaining = plannedSkips - skips;
        vz = Math.max(Math.abs(vz) * 0.56, pondScale * (0.05 + remaining * 0.008));
        vx *= 0.79;
        vy *= 0.79;

        const jitter = (random() - 0.5) * (Math.PI / 30);
        const cos = Math.cos(jitter);
        const sin = Math.sin(jitter);
        const nvx = vx * cos - vy * sin;
        const nvy = vx * sin + vy * cos;
        vx = nvx;
        vy = nvy;

        if (skips >= plannedSkips) {
          // Add a short trailing settling arc after the final skip
          for (let settle = 0; settle < 25; settle++) {
            t += dt;
            x += vx * dt;
            y += vy * dt;
            z += vz * dt;
            vz -= gravity * dt;
            if (z < 0) z = 0;
            trajectory.push({ x, y, z, t });
            if (z === 0) break;
          }
          break;
        }
      }
    }

    if (impacts.length >= 2) {
      return {
        shape,
        duration: t,
        trajectory,
        impacts,
      };
    }
  }

  // Fallback if attempts didn't produce >= 2 impacts
  const fallbackSeed = sampleEscapingSplash(random, maxSteps);
  const fallbackOrigin = complexToIntroCanvas(fallbackSeed.re, fallbackSeed.im, canvasSize);
  const fallbackImpact: IntroSkipImpact = {
    x: fallbackOrigin.x,
    y: fallbackOrigin.y,
    t: 0.3,
    skipIndex: 1,
    complex: { re: fallbackSeed.re, im: fallbackSeed.im },
    seeds: [fallbackSeed, ...impactSeedCloud(fallbackOrigin.x, fallbackOrigin.y, canvasSize, shape, INTRO_SEED_DOTS)],
    orbitPoints: [
      fallbackOrigin,
      ...fallbackSeed.orbit.map((pt) => complexToIntroCanvas(pt.re, pt.im, canvasSize)),
    ],
  };

  return {
    shape,
    duration: 1.0,
    trajectory: [
      { x: canvasSize * 0.5, y: canvasSize * 0.9, z: 0, t: 0 },
      { x: canvasSize * 0.5, y: canvasSize * 0.5, z: 0, t: 1.0 },
    ],
    impacts: [fallbackImpact],
  };
}

export function introThrowToCanvas(random: () => number, canvasSize: number, maxSteps = INTRO_MAX_ITERATIONS) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const splash = sampleSplash(random);
    const orbit = escapingOrbit(splash, maxSteps);
    if (orbit.length < 3) continue;
    const escaped = magnitudeSq(orbit[orbit.length - 1]) > 4;
    if (!escaped && attempt < 9) continue;
    if (!escaped) continue;
    const origin = complexToIntroCanvas(0, 0, canvasSize);
    return {
      splash,
      points: [origin, ...orbit.map((point) => complexToIntroCanvas(point.re, point.im, canvasSize))],
    };
  }
  return null;
}
