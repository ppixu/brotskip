/**
 * Turns a log-density histogram into the percentile cut points the colorize
 * pass normalizes between. Mirrors the percentile step in
 * scripts/generate-buddhabrot.py, which takes percentiles over occupied
 * pixels only — the histogram likewise counts only pixels with density > 0.
 */

export const HISTOGRAM_BINS = 1024;

/**
 * Fixed upper bound of the log1p scale. Any density this generator produces
 * stays far below e^20, so binning needs no prior knowledge of the maximum.
 */
export const HISTOGRAM_MAX_LOG = 20;

export const LOW_PERCENTILE = 54;
export const HIGH_PERCENTILE = 99.92;

export type PercentileCuts = { low: number; high: number };

function valueAtPercentile(
  histogram: Uint32Array | number[],
  maxLogDensity: number,
  percentile: number,
): number {
  const bins = histogram.length;
  let total = 0;
  for (let bin = 0; bin < bins; bin++) total += histogram[bin];
  if (total === 0) return 0;

  const target = total * percentile / 100;
  let cumulative = 0;
  for (let bin = 0; bin < bins; bin++) {
    const count = histogram[bin];
    if (count > 0 && cumulative + count >= target) {
      // Interpolate inside the bin so the cut moves smoothly between chunks.
      const withinBin = (target - cumulative) / count;
      return (bin + withinBin) / bins * maxLogDensity;
    }
    cumulative += count;
  }
  return maxLogDensity;
}

export function cutsFromHistogram(
  histogram: Uint32Array | number[],
  maxLogDensity: number = HISTOGRAM_MAX_LOG,
): PercentileCuts {
  if (!(maxLogDensity > 0)) return { low: 0, high: 1 };
  const low = valueAtPercentile(histogram, maxLogDensity, LOW_PERCENTILE);
  const high = valueAtPercentile(histogram, maxLogDensity, HIGH_PERCENTILE);
  // A degenerate range would divide by zero in the shader.
  return { low, high: Math.max(high, low + 1e-9) };
}
