import type { ViewTransform } from "./view-map.ts";

export const INTRO_PLAY_ALIGN_MS = 1400;
export const INTRO_PLAY_FADE_DELAY_MS = 1100;
export const INTRO_PLAY_FADE_MS = 600;
export const INTRO_PLAY_EXIT_MS = INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS + 180;
export const INTRO_PLAY_FOV = 42;
/** Matches tools/true_buddhabrot_splat.cpp: y = -(Re(z) + 0.5). */
export const SPLAT_RE_OFFSET = 0.5;
export const PLAY_POND_VIEW: ViewTransform = { centerX: -0.58, centerY: 0, halfY: 0.8 };

export type IntroCameraTarget = { x: number; y: number; z: number };

export type IntroCameraPose = {
  yaw: number;
  pitch: number;
  distance: number;
  target: IntroCameraTarget;
};

export function complexToSplat(re: number, im: number): IntroCameraTarget {
  return { x: im, y: -(re + SPLAT_RE_OFFSET), z: 0 };
}

export function splatDistanceForHalfY(halfY: number, fovDeg = INTRO_PLAY_FOV) {
  return halfY / Math.tan((fovDeg * Math.PI) / 360);
}

/** Face-on look at the rotated z-plane, framed like the play pond. */
export function introPlayCamera(view: ViewTransform = PLAY_POND_VIEW, yaw = 0): IntroCameraPose {
  return {
    yaw,
    pitch: 0,
    distance: splatDistanceForHalfY(view.halfY),
    target: complexToSplat(view.centerX, view.centerY),
  };
}

/** Keep spinning in the idle direction until the next face-on yaw. */
export function playAlignYaw(current: number) {
  const tau = Math.PI * 2;
  const wrapped = ((current % tau) + tau) % tau;
  let remaining = (tau - wrapped) % tau;
  if (remaining < Math.PI / 2) remaining += tau;
  return current + remaining;
}

export function introPlayFlatten(alignT: number) {
  const t = Math.max(0, Math.min(1, (alignT - 0.55) / 0.45));
  const s = t * t * (3 - 2 * t);
  return 1 - s * 0.96;
}

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
    target: {
      x: from.target.x + (to.target.x - from.target.x) * amount,
      y: from.target.y + (to.target.y - from.target.y) * amount,
      z: from.target.z + (to.target.z - from.target.z) * amount,
    },
  };
}

export function lerpView(from: ViewTransform, to: ViewTransform, t: number): ViewTransform {
  const amount = Math.max(0, Math.min(1, t));
  return {
    centerX: from.centerX + (to.centerX - from.centerX) * amount,
    centerY: from.centerY + (to.centerY - from.centerY) * amount,
    halfY: from.halfY + (to.halfY - from.halfY) * amount,
  };
}
