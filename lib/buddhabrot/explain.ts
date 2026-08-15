export type Complex = { re: number; im: number };

export type ExplainPart = {
  title: string;
  body: string;
  film: "iterate" | "escape" | "stack";
  formula?: string;
};

/** Seeds that escape quickly so a short looping film can show the hop. */
export const DEMO_SEEDS: Complex[] = [
  { re: -0.64, im: 0.39 },
  { re: 0.32, im: 0.47 },
  { re: -0.24, im: 0.71 },
];

/** Well-spaced hops for the “what is iteration” film. */
export const ITERATE_SEED: Complex = { re: -0.4, im: 0.95 };

/** Flies off the right side of the map after a few hops. */
export const ESCAPE_SEED: Complex = { re: -0.7, im: 0.69 };

/** A point that hops forever inside the circle — used to show “stays”. */
export const TRAPPED_SEED: Complex = { re: -0.2, im: 0.55 };

/** Escaping splash points stacked into a tiny nebula. */
export const STACK_SEEDS: Complex[] = [
  { re: -0.64, im: 0.39 },
  { re: 0.32, im: 0.47 },
  { re: -0.24, im: 0.71 },
  { re: -1.36, im: 0.33 },
  { re: -0.92, im: 0.51 },
  { re: -0.7, im: 0.69 },
  { re: -0.48, im: 0.87 },
  { re: -1.14, im: 0.51 },
  { re: -0.64, im: -0.39 },
  { re: -0.92, im: -0.51 },
  { re: -0.7, im: -0.69 },
  { re: 0.32, im: -0.47 },
];

export const EXPLAIN_PARTS: ExplainPart[] = [
  {
    title: "1. Iteration",
    film: "iterate",
    formula: "z → z² + c",
    body: "Iteration means repeating the same small step. Start at the center. Each hop squares your position, then adds the splash. That hop is one iteration.",
  },
  {
    title: "2. Escape",
    film: "escape",
    body: "If the hops fly past the circle, the path has escaped — it never comes back. Other splash points hop in a tiny loop and stay on the map forever.",
  },
  {
    title: "3. The nebula",
    film: "stack",
    body: "The Buddhabrot paints every hop of the paths that escape. Stack thousands of those trails and the glow appears. Paths that never leave stay dark.",
  },
];

export function squarePlus(z: Complex, c: Complex): Complex {
  return {
    re: z.re * z.re - z.im * z.im + c.re,
    im: 2 * z.re * z.im + c.im,
  };
}

export function magnitudeSq(z: Complex): number {
  return z.re * z.re + z.im * z.im;
}

export function escapingOrbit(c: Complex, maxSteps = 64): Complex[] {
  const points: Complex[] = [];
  let z = { re: 0, im: 0 };
  for (let step = 0; step < maxSteps; step++) {
    z = squarePlus(z, c);
    points.push({ re: z.re, im: z.im });
    if (magnitudeSq(z) > 4) break;
  }
  return points;
}

/** Backing-store size so the film stays sharp on retina and when CSS stretches it. */
export function canvasBackingSize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
  const dpr = Math.max(2, Number(devicePixelRatio) || 1);
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
  };
}
