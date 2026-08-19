/**
 * Converts live orbitScores into a compact FeatureFrame the chiptune engine
 * consumes, and detects coverage milestones ("a big form just appeared").
 * Pure math — safe to import and unit test in Node.
 */
import { orbitShape, type OrbitShapeSums } from "../orbit-shape.ts";

export type OrbitFeatureInput = OrbitShapeSums & {
  skip: number;
  glyph: number;
  zr: number;
  zi: number;
  cr: number;
  ci: number;
  shownDepth: number;
  stepDistance: number;
  distanceContraction: number;
  resolved: boolean;
};

export type GlyphGroupFeatures = {
  skip: number;
  glyph: number;
  area: number;
  spread: number;
  elongation: number;
  orientation: number;
  density: number;
  centroidX: number;
  centroidY: number;
  zAngle: number;
  zRadius: number;
  coverage: number;
  coverageMotion: number;
  presence: number;
  activity: number;
  deepest: number;
};

export type FeatureFrame = {
  landing: { cr: number; ci: number } | null;
  groups: GlyphGroupFeatures[];
  glyphCount: number;
  activeRatio: number;
  dispersion: number;
  chaos: number;
  growth: number;
  contraction: number;
  proximity: number;
  depthBand: number;
  deepest: number;
  coverage: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function upperQuantile(values: number[]) {
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(values.length * .8))];
}

export function createFeatureTracker() {
  const lastGroupCoverage = new Map<number, number>();
  let lastTotalCoverage = 0;

  function extract(orbits: readonly OrbitFeatureInput[]): FeatureFrame {
    if (!orbits.length) {
      return {
        landing: null, groups: [], glyphCount: 0, activeRatio: 0, dispersion: 0,
        chaos: 0, growth: 0, contraction: 0, proximity: 0, depthBand: 0, deepest: 0, coverage: 0,
      };
    }
    const shapes = orbits.map(orbitShape);
    const skips = Array.from(new Set(orbits.map((orbit) => orbit.skip))).sort((a, b) => a - b);
    const groups: GlyphGroupFeatures[] = skips.map((skip) => {
      const indices = orbits.flatMap((orbit, index) => orbit.skip === skip ? [index] : []);
      const count = Math.max(1, indices.length);
      const mean = (select: (index: number) => number) =>
        indices.reduce((sum, index) => sum + select(index), 0) / count;
      const orientationSin = mean((index) => Math.sin(shapes[index].orientation * 2));
      const orientationCos = mean((index) => Math.cos(shapes[index].orientation * 2));
      const angleSin = mean((index) => Math.sin(Math.atan2(orbits[index].zi, orbits[index].zr)));
      const angleCos = mean((index) => Math.cos(Math.atan2(orbits[index].zi, orbits[index].zr)));
      const coverage = indices.reduce((sum, index) => sum + orbits[index].distinct, 0);
      const previous = lastGroupCoverage.get(skip) || 0;
      const coverageMotion = Math.max(0, coverage - previous);
      lastGroupCoverage.set(skip, coverage);
      return {
        skip,
        glyph: orbits[indices[0]].glyph,
        area: mean((index) => shapes[index].area),
        spread: mean((index) => shapes[index].spread),
        elongation: mean((index) => shapes[index].elongation),
        density: mean((index) => shapes[index].density),
        centroidX: mean((index) => shapes[index].centroidX),
        centroidY: mean((index) => shapes[index].centroidY),
        orientation: .5 * Math.atan2(orientationSin, orientationCos),
        zAngle: Math.atan2(angleSin, angleCos),
        zRadius: mean((index) => Math.min(1, Math.hypot(orbits[index].zr, orbits[index].zi) / 2)),
        coverage,
        coverageMotion,
        presence: Math.min(1, Math.log2(coverage + 1) / 10),
        activity: Math.min(1, Math.log2(coverageMotion + 1) / 5),
        deepest: indices.reduce((best, index) => Math.max(best, orbits[index].shownDepth), 0),
      };
    });
    const meanShape = (select: (shape: typeof shapes[number]) => number) =>
      shapes.reduce((sum, shape) => sum + select(shape), 0) / shapes.length;
    const spreadMean = meanShape((shape) => shape.spread);
    const elongationMean = meanShape((shape) => shape.elongation);
    const densityMean = meanShape((shape) => shape.density);
    const centroidX = meanShape((shape) => shape.centroidX);
    const centroidY = meanShape((shape) => shape.centroidY);
    const dispersion = Math.min(1, Math.sqrt(shapes.reduce((sum, shape) =>
      sum + (shape.centroidX - centroidX) ** 2 + (shape.centroidY - centroidY) ** 2, 0) / shapes.length * .5));
    const featureVariance = Math.min(1, Math.sqrt(
      meanShape((shape) => (shape.spread - spreadMean) ** 2)
      + meanShape((shape) => (shape.elongation - elongationMean) ** 2)
      + meanShape((shape) => (shape.density - densityMean) ** 2),
    ));
    const instability = orbits.reduce((sum, orbit) =>
      sum + Math.min(1, Math.hypot(orbit.zr, orbit.zi) / 2), 0) / orbits.length;
    const coverage = orbits.reduce((sum, orbit) => sum + orbit.distinct, 0);
    const coverageMotion = Math.max(0, coverage - lastTotalCoverage);
    lastTotalCoverage = coverage;
    const travel = orbits.filter((orbit) => Number.isFinite(orbit.stepDistance) && orbit.stepDistance > 0);
    const deepest = orbits.reduce((best, orbit) => Math.max(best, orbit.shownDepth), 0);
    return {
      landing: { cr: orbits[0].cr, ci: orbits[0].ci },
      groups,
      glyphCount: groups.filter((group) => group.coverage > 0).length,
      activeRatio: orbits.reduce((count, orbit) => count + (orbit.resolved ? 0 : 1), 0) / orbits.length,
      dispersion,
      chaos: Math.min(1, featureVariance * 1.7 + (1 - densityMean) * .24 + instability * .28),
      growth: Math.min(1, Math.log2(coverageMotion + 1) / 4.5),
      contraction: upperQuantile(travel.map((orbit) => clamp01(orbit.distanceContraction / 1.5))),
      proximity: upperQuantile(travel.map((orbit) =>
        clamp01((-Math.log2(Math.max(orbit.stepDistance, 1e-12)) - .25) / 15))),
      depthBand: Math.log2(deepest + 1),
      deepest,
      coverage,
    };
  }

  function reset() {
    lastGroupCoverage.clear();
    lastTotalCoverage = 0;
  }

  return { extract, reset };
}

export type FeatureTracker = ReturnType<typeof createFeatureTracker>;

export type Milestone = {
  skip: number;
  glyph: number;
  kind: "bloom" | "doubling";
  magnitude: number;
  area: number;
};

export const BLOOM_CELLS = 8;

export function createMilestoneDetector(bloomCells = BLOOM_CELLS) {
  const states = new Map<number, { bloomed: boolean; nextDoubling: number; lastCoverage: number }>();

  function detect(groups: readonly GlyphGroupFeatures[]): Milestone[] {
    const events: Milestone[] = [];
    for (const group of groups) {
      let state = states.get(group.skip);
      if (!state) {
        state = { bloomed: false, nextDoubling: 0, lastCoverage: 0 };
        states.set(group.skip, state);
      }
      const gained = Math.max(0, group.coverage - state.lastCoverage);
      if (!state.bloomed && group.coverage >= bloomCells) {
        state.bloomed = true;
        state.nextDoubling = Math.max(bloomCells * 2, group.coverage * 2);
        events.push({
          skip: group.skip, glyph: group.glyph, kind: "bloom",
          magnitude: Math.min(1, .4 + group.area * .8 + Math.log2(gained + 1) / 12),
          area: group.area,
        });
      } else if (state.bloomed && group.coverage >= state.nextDoubling) {
        events.push({
          skip: group.skip, glyph: group.glyph, kind: "doubling",
          magnitude: Math.min(1, .25 + group.area * .6 + Math.log2(gained + 1) / 14),
          area: group.area,
        });
        state.nextDoubling *= 2;
      }
      state.lastCoverage = group.coverage;
    }
    return events;
  }

  function reset() {
    states.clear();
  }

  return { detect, reset };
}

export type MilestoneDetector = ReturnType<typeof createMilestoneDetector>;
