/**
 * Named ellipsoid regions of the intro Buddhabrot splat cloud, in splat
 * space: x = Im(z), y = -(Re(z) + 0.5), z = Im(c). See lib/splat-orbit.ts.
 * Centers and radii are calibrated with the ?regions=1 mode in
 * app/BuddhabrotCloudCanvas.tsx.
 */

export type Vec3 = { x: number; y: number; z: number };

export type SplatRegion = {
  id: string;
  name: string;
  blurb: string;
  center: readonly [number, number, number];
  radii: readonly [number, number, number];
  link?: string;
};

const BUDDHABROT_WIKI = "https://en.wikipedia.org/wiki/Buddhabrot";

export const SPLAT_REGIONS: readonly SplatRegion[] = [
  {
    id: "spire",
    name: "Spire",
    blurb: "The needle — escape paths whose parameters ride the real axis out toward c = −2.",
    center: [0, 1.52, 0],
    radii: [0.16, 0.5, 0.5],
  },
  {
    id: "ushnisha",
    name: "Ushnisha",
    blurb: "The oval crown — orbits that linger longest before escaping stack their final hops here.",
    center: [0, 1.04, 0],
    radii: [0.24, 0.2, 0.6],
    link: BUDDHABROT_WIKI,
  },
  {
    id: "tika",
    name: "Tika",
    blurb: "The forehead mark — a dense knot of near-periodic escapes just above the head.",
    center: [0, 0.86, 0],
    radii: [0.1, 0.09, 0.5],
    link: BUDDHABROT_WIKI,
  },
  {
    id: "head",
    name: "Head",
    blurb: "Escapes seeded around the period-2 disk trace the head's glow.",
    center: [0, 0.62, 0],
    radii: [0.36, 0.3, 0.7],
  },
  {
    id: "shoulders",
    name: "Shoulders",
    blurb: "The folded arms — mid-length orbits sweeping wide of the imaginary axis.",
    center: [0, 0.08, 0],
    radii: [0.95, 0.3, 0.8],
  },
  {
    id: "body",
    name: "Body",
    blurb: "The seated body — the broad bulk of short escape paths around the main cardioid.",
    center: [0, -0.55, 0],
    radii: [0.9, 0.6, 0.95],
  },
];

export function regionVolume(region: SplatRegion): number {
  return region.radii[0] * region.radii[1] * region.radii[2];
}

/**
 * Distance along the ray to the ellipsoid surface, 0 if the origin is
 * inside, null on a miss. Works in the ellipsoid's unit-sphere frame.
 */
export function rayEllipsoidEntry(origin: Vec3, direction: Vec3, region: SplatRegion): number | null {
  const [rx, ry, rz] = region.radii;
  if (!(rx > 0) || !(ry > 0) || !(rz > 0)) return null;
  const ox = (origin.x - region.center[0]) / rx;
  const oy = (origin.y - region.center[1]) / ry;
  const oz = (origin.z - region.center[2]) / rz;
  const dx = direction.x / rx;
  const dy = direction.y / ry;
  const dz = direction.z / rz;
  const a = dx * dx + dy * dy + dz * dz;
  if (a <= 0) return null;
  const b = ox * dx + oy * dy + oz * dz;
  const c = ox * ox + oy * oy + oz * oz - 1;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const far = (-b + root) / a;
  if (far < 0) return null;
  const near = (-b - root) / a;
  return Math.max(0, near);
}

/** Among all regions the ray hits, the most specific (smallest volume) wins. */
export function pickRegion(
  origin: Vec3,
  direction: Vec3,
  regions: readonly SplatRegion[] = SPLAT_REGIONS,
): { region: SplatRegion; entry: number } | null {
  let best: { region: SplatRegion; entry: number } | null = null;
  for (const region of regions) {
    const entry = rayEllipsoidEntry(origin, direction, region);
    if (entry === null) continue;
    if (!best || regionVolume(region) < regionVolume(best.region)) best = { region, entry };
  }
  return best;
}
