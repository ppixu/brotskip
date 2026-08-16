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
export const INTRO_BACKGROUND_SPAWN_MS = 120;
export const INTRO_TRAIL_FADE_MS = 4200;
export const INTRO_NEBULA_SEEDS_PER_WAVE = 16;

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

export function introNebulaSeed(random: () => number = Math.random) {
  return {
    x: -2.05 + random() * 2.55,
    y: (random() - 0.5) * 2.7,
  };
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
