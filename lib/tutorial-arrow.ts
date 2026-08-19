export const TUTORIAL_ARROW_LABEL = "Pull back to throw";

const STRETCH_PERIOD_MS = 1800;
const SHAFT_GAP = 12;
const MIN_LENGTH_RATIO = 0.048;
const MAX_LENGTH_RATIO = 0.105;
const HEAD_WIDTH = 7;
const HEAD_LENGTH = 10;
const LABEL_GAP = 14;
const BOTTOM_PAD = 28;

export type TutorialArrowPoint = { x: number; y: number };

export type TutorialArrowGeometry = {
  from: TutorialArrowPoint;
  to: TutorialArrowPoint;
  head: [TutorialArrowPoint, TutorialArrowPoint, TutorialArrowPoint];
  label: TutorialArrowPoint;
  alpha: number;
};

export function tutorialArrowStretch(nowMs: number, reduceMotion: boolean) {
  if (reduceMotion) return 0.62;
  const period = ((nowMs % STRETCH_PERIOD_MS) + STRETCH_PERIOD_MS) % STRETCH_PERIOD_MS;
  const t = period / STRETCH_PERIOD_MS;
  if (t < 0.58) {
    const p = t / 0.58;
    return 1 - (1 - p) ** 2;
  }
  const p = (t - 0.58) / 0.42;
  return (1 - p) ** 2;
}

export function tutorialArrowGeometry(
  origin: TutorialArrowPoint,
  stretch: number,
  minDim: number,
  height: number,
): TutorialArrowGeometry {
  const minLength = Math.max(36, minDim * MIN_LENGTH_RATIO);
  const maxLength = Math.max(minLength + 28, minDim * MAX_LENGTH_RATIO);
  const length = minLength + (maxLength - minLength) * stretch;
  const from = { x: origin.x, y: origin.y + SHAFT_GAP };
  const to = { x: origin.x, y: Math.min(height - BOTTOM_PAD, from.y + length) };
  const head: TutorialArrowGeometry["head"] = [
    { x: to.x, y: to.y + HEAD_LENGTH },
    { x: to.x - HEAD_WIDTH, y: to.y },
    { x: to.x + HEAD_WIDTH, y: to.y },
  ];
  return {
    from,
    to,
    head,
    label: { x: origin.x + LABEL_GAP, y: (from.y + to.y) * 0.5 },
    alpha: 0.52 + 0.38 * stretch,
  };
}

export function tutorialArrowVisible(options: {
  introActive: boolean;
  spectator: boolean;
  phase: string;
  hasThrown: boolean;
}) {
  return !options.introActive && !options.spectator && options.phase === "ready" && !options.hasThrown;
}
