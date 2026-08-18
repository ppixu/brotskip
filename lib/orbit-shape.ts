/** Coverage-grid shape statistics shared by scoring, HUD, and the audio engines. */

export const COVERAGE_GRID = 32;
export const COVERAGE_WORDS = COVERAGE_GRID * COVERAGE_GRID / 32;
export const FULL_GRID_VARIANCE = (COVERAGE_GRID * COVERAGE_GRID - 1) / 12;

export type OrbitShapeSums = {
  distinct: number;
  sumX: number;
  sumY: number;
  sumXX: number;
  sumYY: number;
  sumXY: number;
};

export type OrbitShapeStats = {
  area: number;
  coverage: number;
  spread: number;
  elongation: number;
  orientation: number;
  density: number;
  centroidX: number;
  centroidY: number;
};

export function orbitShape(orbit: OrbitShapeSums): OrbitShapeStats {
  const n = orbit.distinct;
  if (!n) return { area: 0, coverage: 0, spread: 0, elongation: 0, orientation: 0, density: 0, centroidX: 0, centroidY: 0 };
  const meanX = orbit.sumX / n;
  const meanY = orbit.sumY / n;
  const varianceX = Math.max(0, orbit.sumXX / n - meanX * meanX);
  const varianceY = Math.max(0, orbit.sumYY / n - meanY * meanY);
  const covariance = orbit.sumXY / n - meanX * meanY;
  const determinant = Math.max(0, varianceX * varianceY - covariance * covariance);
  const discriminant = Math.sqrt((varianceX - varianceY) ** 2 + 4 * covariance * covariance);
  const major = Math.max(0, (varianceX + varianceY + discriminant) * .5);
  const minor = Math.max(0, (varianceX + varianceY - discriminant) * .5);
  const area = Math.min(1, Math.sqrt(determinant) / FULL_GRID_VARIANCE);
  const coverage = Math.min(1, Math.log2(1 + n) / Math.log2(1 + COVERAGE_GRID * COVERAGE_GRID));
  const elongation = major > .001 ? Math.min(1, 1 - Math.sqrt(minor / major)) : 0;
  const orientation = .5 * Math.atan2(2 * covariance, varianceX - varianceY);
  const estimatedCells = Math.max(1, Math.min(COVERAGE_GRID * COVERAGE_GRID, 4 * Math.PI * Math.sqrt(determinant)));
  const density = Math.min(1, n / estimatedCells);
  return {
    area,
    coverage,
    spread: Math.sqrt(area),
    elongation,
    orientation,
    density,
    centroidX: meanX / (COVERAGE_GRID - 1) * 2 - 1,
    centroidY: meanY / (COVERAGE_GRID - 1) * 2 - 1,
  };
}
