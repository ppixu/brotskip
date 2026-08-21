export type Complex = { re: number; im: number };

export const BUDDHABROT_EXPLAIN = {
  trigger: "Buddhabrot",
  title: "Buddhabrot",
  formula: "z → z² + c",
  paragraphs: [
    "The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.",
    "Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. During the opening, a finished Complex Hénon escape cloud is loaded as one million tiny Gaussian splats and rotated live — the same precomputed 3D artifact, not a video or a blurred slice.",
  ],
  image: {
    src: "buddhabrot-paper.png",
    alt: "Buddhabrot density map of escaping Mandelbrot trajectories",
  },
  wikipedia: {
    journal: "Fractal density of escaping orbits",
    title: "Buddhabrot",
    sentences: [
      {
        text: "The Buddhabrot is the probability distribution over the trajectories of points that escape the Mandelbrot fractal.",
        cite: 1,
      },
      {
        text: "Its name reflects its pareidolic resemblance to classical depictions of Gautama Buddha, seated in a meditation pose with a forehead mark (tika), a traditional oval crown (ushnisha), and ringlet of hair.",
        cite: 2,
      },
    ],
    references: [
      {
        n: 1,
        text: "Green, M. The Buddhabrot Technique. Superliminal, 1993.",
        url: "https://www.superliminal.com/fractals/bbrot/bbrot.htm",
      },
      {
        n: 2,
        text: "Wikipedia contributors. Buddhabrot. Wikipedia, The Free Encyclopedia. CC BY-SA 4.0.",
        url: "https://en.wikipedia.org/wiki/Buddhabrot",
      },
    ],
  },
} as const;

export const MANDELBROT_EXPLAIN = {
  journal: "The set of orbits that never escape",
  title: "Mandelbrot Set",
  lede: "The Mandelbrot set is a famous mathematical pattern and fractal named after mathematician Benoît Mandelbrot. It is plotted on a 2D complex number plane using a simple repeating formula, generating infinite visual complexity, self-similar shapes, and stunning colorful boundary details.",
  source: {
    text: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Mandelbrot_set",
  },
  image: {
    src: "mandelbrot-paper.png",
    alt: "The Mandelbrot set plotted on the complex plane",
  },
} as const;

export function squarePlus(z: Complex, c: Complex): Complex {  return {
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
