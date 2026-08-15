export const MIN_SKIPS = 2;
export const MAX_SKIPS = 15;
export const SKIP_COUNT_DECAY = 0.76;

export function sampleSkipCount(random: () => number, decay = SKIP_COUNT_DECAY): number {
  const span = MAX_SKIPS - MIN_SKIPS + 1;
  const total = (1 - decay ** span) / (1 - decay);
  let remaining = Math.min(Math.max(random(), 0), 0.999999999) * total;
  for (let count = MIN_SKIPS; count <= MAX_SKIPS; count++) {
    remaining -= decay ** (count - MIN_SKIPS);
    if (remaining < 0) return count;
  }
  return MAX_SKIPS;
}
