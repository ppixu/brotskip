/** Per-frame sample budgeting for the first-launch Buddhabrot build-up. */

/** The build-up is a deliberate opening moment, not a stutter. */
export const MIN_DURATION_MS = 5000;

/**
 * Matches the clamp the game loop already applies. Without it a backgrounded
 * tab returns with a multi-second delta and dumps the whole budget at once.
 */
export const MAX_DELTA_SECONDS = 0.05;

/** Safety net so no single dispatch janks a frame. Rarely binding in practice. */
export const DEFAULT_MAX_SAMPLES_PER_FRAME = 2_000_000;

export type PacingOptions = {
  totalSamples: number;
  minDurationMs?: number;
  maxSamplesPerFrame?: number;
};

export function clampDelta(deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return 0;
  return Math.min(deltaSeconds, MAX_DELTA_SECONDS);
}

export function samplesForFrame(deltaSeconds: number, options: PacingOptions): number {
  const ceiling = options.maxSamplesPerFrame ?? DEFAULT_MAX_SAMPLES_PER_FRAME;
  const minDurationMs = options.minDurationMs ?? MIN_DURATION_MS;
  if (minDurationMs <= 0) return ceiling;
  const share = clampDelta(deltaSeconds) * 1000 / minDurationMs;
  return Math.max(1, Math.min(ceiling, Math.floor(options.totalSamples * share)));
}
