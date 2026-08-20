/** Matches tools/true_buddhabrot_splat.cpp: y = -(Re(z) + 0.5). */
export const SPLAT_RE_OFFSET = 0.5;
/** Thin orbit-time slab so a front view is the 2D Buddhabrot, not a cubic Im(c) slice. */
export const SPLAT_DEPTH_HALF = 0.42;

export function splatOrbitDepth(step: number, escape: number) {
  const t = (step + 0.5) / Math.max(escape, 1) - 0.5;
  return t * SPLAT_DEPTH_HALF;
}

export function splatOrbitPoint(re: number, im: number, step: number, escape: number) {
  return {
    x: im,
    y: -(re + SPLAT_RE_OFFSET),
    z: splatOrbitDepth(step, escape),
  };
}
