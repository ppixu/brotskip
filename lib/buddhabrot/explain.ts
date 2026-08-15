export type Complex = { re: number; im: number };

/** Seeds that escape quickly so a short looping film can show the hop. */
export const DEMO_SEEDS: Complex[] = [
  { re: -0.64, im: 0.39 },
  { re: 0.32, im: 0.47 },
  { re: -0.24, im: 0.71 },
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
