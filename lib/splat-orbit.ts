/** Matches tools/true_buddhabrot_splat.cpp: y = -(Re(z) + 0.5). */
export const SPLAT_RE_OFFSET = 0.5;

/** Standard 3D Buddhabrot: XY is the z-orbit plane, Z is Im(c). */
export function splatOrbitPoint(re: number, im: number, cIm: number) {
  return {
    x: im,
    y: -(re + SPLAT_RE_OFFSET),
    z: cIm,
  };
}
