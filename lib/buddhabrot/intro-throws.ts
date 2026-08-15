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
export const INTRO_THROW_LIFE_MS = 900;

export function sampleSplash(random: () => number): Complex {
  return {
    re: THROW_BOUNDS.xMin + random() * (THROW_BOUNDS.xMax - THROW_BOUNDS.xMin),
    im: THROW_BOUNDS.yMin + random() * (THROW_BOUNDS.yMax - THROW_BOUNDS.yMin),
  };
}

export function complexToIntroCanvas(re: number, im: number, size: number) {
  return {
    x: (re - THROW_BOUNDS.xMin) / (THROW_BOUNDS.xMax - THROW_BOUNDS.xMin) * size,
    y: (THROW_BOUNDS.yMax - im) / (THROW_BOUNDS.yMax - THROW_BOUNDS.yMin) * size,
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
