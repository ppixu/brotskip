export const INTRO_PLAY_ALIGN_MS = 920;
export const INTRO_PLAY_FADE_DELAY_MS = 720;
export const INTRO_PLAY_FADE_MS = 500;
export const INTRO_PLAY_EXIT_MS = INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS + 180;

/** Frontal look at the splat XY plane, which is already the rotated z-plane the pond uses. */
export const INTRO_PLAY_VIEW = {
  yaw: 0,
  pitch: 0,
  distance: { classic: 2.22, henon: 1.88 },
} as const;

export type IntroCameraPose = {
  yaw: number;
  pitch: number;
  distance: number;
};

export function introPlayAlignT(elapsed: number, reduceMotion = false) {
  if (reduceMotion) return 1;
  const t = Math.max(0, Math.min(1, elapsed / INTRO_PLAY_ALIGN_MS));
  return 0.5 - 0.5 * Math.cos(t * Math.PI);
}

export function lerpIntroCamera(from: IntroCameraPose, to: IntroCameraPose, t: number): IntroCameraPose {
  const amount = Math.max(0, Math.min(1, t));
  return {
    yaw: from.yaw + (to.yaw - from.yaw) * amount,
    pitch: from.pitch + (to.pitch - from.pitch) * amount,
    distance: from.distance + (to.distance - from.distance) * amount,
  };
}
