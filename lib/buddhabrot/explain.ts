export type Complex = { re: number; im: number };

export const BUDDHABROT_EXPLAIN = {
  trigger: "Buddhabrot",
  title: "Buddhabrot",
  formula: "z → z² + c",
  paragraphs: [
    "The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.",
    "Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. Raise the iteration limit and the picture thins into finer filaments: only the longest escapes remain, as in the animation.",
  ],
  gif: {
    file: "buddhabrot-iterations.gif",
    alt: "Buddhabrot forming as the maximum iteration count increases",
    credit: "Tacodude7729 / Wikimedia Commons",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:BuddhabrotIterationAnimation7729.gif",
    articleUrl: "https://en.wikipedia.org/wiki/Buddhabrot",
  },
  wikipedia: {
    journal: "Notes on fractal geometry",
    title: "The Buddhabrot",
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
