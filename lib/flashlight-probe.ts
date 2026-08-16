export const FLASHLIGHT_SOURCE_DOTS = 1;
export const FLASHLIGHT_MAX_DEPTH = 8_000;
export const FLASHLIGHT_SOURCE_CAP = 36;
export const FLASHLIGHT_SPAWN_MS = 240;
export const FLASHLIGHT_PLANNED_SKIPS = 3;
export const FLASHLIGHT_HALF_ANGLE = 0.29;
export const FLASHLIGHT_EDGE_BLUR_PX = 32;
export const INTRO_THROWS_PER_WAVE = 16;
export const INTRO_THROW_STAGGER_MS = 45;
export const INTRO_ROCK_DRAW_EVERY = 50;
export const INTRO_SOURCE_DOTS = 6;
export const INTRO_MAX_DEPTH = 2_000_000;
export const INTRO_SETTLE_MS = 5400;
export const INTRO_BACKGROUND_SPAWN_MS = 90;
export const INTRO_TRAIL_FADE_MS = 4200;
export const INTRO_NEBULA_SEEDS_PER_WAVE = 32;

export function introLaunchOrigin(
  width: number,
  height: number,
  random: () => number = Math.random,
) {
  const margin = 36;
  return {
    x: margin + random() * Math.max(8, width - margin * 2),
    y: margin + random() * Math.max(8, height - margin * 2),
  };
}

export function isMandelbrotInterior(x: number, y: number): boolean {
  const xOffset = x - 0.25;
  const q = xOffset * xOffset + y * y;
  if (q * (q + xOffset) <= 0.25 * y * y - 0.0005) return true;
  const p2x = x + 1.0;
  if (p2x * p2x + y * y <= 0.0625 - 0.0005) return true;
  const p3x = x + 0.125;
  const absY = Math.abs(y);
  if (p3x * p3x + (absY - 0.745) * (absY - 0.745) <= 0.008) return true;
  return false;
}

export function introNebulaSeed(random: () => number = Math.random) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const mode = random();
    let seed: { x: number; y: number };
    if (mode < 0.45) {
      // Cardioid boundary with micro-offset (rich thousands-step chaotic orbits)
      const theta = random() * Math.PI * 2;
      const nx = Math.cos(theta) - 0.5 * Math.cos(2 * theta);
      const ny = Math.sin(theta) - 0.5 * Math.sin(2 * theta);
      const nlen = Math.hypot(nx, ny) || 1;
      const push = 0.0008 + random() * 0.0045;
      const cReal = 0.5 * Math.cos(theta) - 0.25 * Math.cos(2 * theta) + (nx / nlen) * push;
      const cImag = 0.5 * Math.sin(theta) - 0.25 * Math.sin(2 * theta) + (ny / nlen) * push;
      seed = { x: cReal, y: cImag };
    } else if (mode < 0.72) {
      // Period-2 bulb boundary with micro-offset
      const theta = random() * Math.PI * 2;
      const rad = 0.25 + 0.0008 + random() * 0.0045;
      seed = {
        x: -1.0 + Math.cos(theta) * rad,
        y: Math.sin(theta) * rad,
      };
    } else if (mode < 0.88) {
      // Antenna and filament valleys
      const x = -2.0 + random() * 1.35;
      const y = (random() - 0.5) * 0.25;
      seed = { x, y };
    } else {
      // Broad domain
      seed = {
        x: -2.05 + random() * 3.10,
        y: (random() - 0.5) * 2.70,
      };
    }
    if (!isMandelbrotInterior(seed.x, seed.y)) {
      return seed;
    }
  }
  return { x: -0.75 + (random() - 0.5) * 0.15, y: 0.15 + (random() - 0.5) * 0.15 };
}

export type OrbitAtmosphere = {
  drawLines: boolean;
  grayscale: boolean;
  energy: number;
  hiddenSteps: number;
};

export const PLAY_ATMOSPHERE: OrbitAtmosphere = {
  drawLines: true,
  grayscale: false,
  energy: 0.18,
  hiddenSteps: 0,
};

export const INTRO_ATMOSPHERE: OrbitAtmosphere = {
  drawLines: false,
  grayscale: true,
  energy: 0.14,
  hiddenSteps: 1,
};

export const FLASHLIGHT_ATMOSPHERE: OrbitAtmosphere = {
  drawLines: false,
  grayscale: true,
  energy: 0.028,
  hiddenSteps: 24,
};

export type FlashlightCone = {
  apexX: number;
  apexY: number;
  directionX: number;
  directionY: number;
  range: number;
};

export function pointInFlashlightCone(
  x: number,
  y: number,
  cone: FlashlightCone,
  halfAngle = FLASHLIGHT_HALF_ANGLE,
) {
  const dx = x - cone.apexX;
  const dy = y - cone.apexY;
  const distance = Math.hypot(dx, dy);
  if (distance < 8 || distance > cone.range) return false;
  const along = (dx * cone.directionX + dy * cone.directionY) / distance;
  return along >= Math.cos(halfAngle);
}

export function sampleRayInCone(
  cone: FlashlightCone,
  random: () => number,
  halfAngle = FLASHLIGHT_HALF_ANGLE,
) {
  const angle = Math.atan2(cone.directionY, cone.directionX) + (random() - 0.5) * 2 * halfAngle;
  const distance = Math.min(cone.range, 36 + random() * Math.max(40, cone.range * 0.62));
  return {
    x: cone.apexX + Math.cos(angle) * distance,
    y: cone.apexY + Math.sin(angle) * distance,
    angle,
    distance,
  };
}

export function flashlightSkipLandings(input: {
  x: number;
  y: number;
  angle: number;
  power: number;
  pondScale: number;
  width: number;
  height: number;
  plannedSkips: number;
}) {
  const power = input.power * input.power * (3 - 2 * input.power);
  const speed = input.pondScale * (0.32 + 0.56 * power);
  let x = input.x;
  let y = input.y;
  let vx = Math.cos(input.angle) * speed;
  let vy = Math.sin(input.angle) * speed;
  let vz = input.pondScale * (0.38 + 0.20 * power);
  let z = 1;
  let skips = 0;
  const gravity = input.pondScale * 1.65;
  const dt = 1 / 120;
  const landings: Array<{ x: number; y: number; index: number }> = [];
  for (let step = 0; step < 120 * 12 && skips < input.plannedSkips; step++) {
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    vz -= gravity * dt;
    const drag = Math.exp(-0.06 * dt);
    vx *= drag;
    vy *= drag;
    if (z > 0 || vz >= 0) continue;
    z = 0;
    if (x < 24 || x > input.width - 24 || y < 24 || y > input.height - 24) break;
    skips += 1;
    landings.push({ x, y, index: skips });
    const remaining = input.plannedSkips - skips;
    vz = Math.max(Math.abs(vz) * 0.56, input.pondScale * (0.05 + remaining * 0.008));
    vx *= 0.79;
    vy *= 0.79;
    if (skips >= input.plannedSkips) break;
    if (x < -50 || x > input.width + 50 || y < -50 || y > input.height + 50) break;
  }
  return landings;
}
