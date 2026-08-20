import type { ViewTransform } from "./view-map.ts";

export const INTRO_PLAY_ALIGN_MS = 1800;
export const INTRO_PLAY_FACE_MS = 700;
export const INTRO_PLAY_FADE_DELAY_MS = 1800;
export const INTRO_PLAY_FADE_MS = 1400;
export const INTRO_PLAY_EXIT_MS = INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS + 180;
export const INTRO_PLAY_FOV = 42;
/** Matches tools/true_buddhabrot_splat.cpp: y = -(Re(z) + 0.5). */
export const SPLAT_RE_OFFSET = 0.5;
/** Zoom the gaussian in so its silhouette matches the 2D pond Buddha. */
export const PLAY_SPLAT_DISTANCE_SCALE = 0.82;
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

function easeOutCubic(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - (1 - x) ** 3;
}

function easeOutQuad(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - (1 - x) ** 2;
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

/** Face-on look at the rotated z-plane, framed like the play pond. */
export function introPlayCamera(view: ViewTransform = PLAY_POND_VIEW, yaw = 0): IntroCameraPose {
  return {
    yaw,
    pitch: 0,
    distance: splatDistanceForHalfY(view.halfY) * PLAY_SPLAT_DISTANCE_SCALE,
    target: complexToSplat(view.centerX, view.centerY),
  };
}

/** Shortest yaw to a face-on view of the rotated z-plane. */
export function playAlignYaw(current: number) {
  const tau = Math.PI * 2;
  const wrapped = ((current % tau) + tau) % tau;
  if (wrapped <= Math.PI) return current - wrapped;
  return current + (tau - wrapped);
}

export function introPlayFlatten(elapsed: number, reduceMotion = false) {
  if (reduceMotion) return 0.04;
  if (elapsed <= INTRO_PLAY_FACE_MS) return 1;
  const t = Math.max(0, Math.min(1, (elapsed - INTRO_PLAY_FACE_MS) / (INTRO_PLAY_ALIGN_MS - INTRO_PLAY_FACE_MS)));
  const s = t * t * (3 - 2 * t);
  return 1 - s * 0.96;
}

export function introPlayFaceT(elapsed: number, reduceMotion = false) {
  if (reduceMotion) return 1;
  return easeOutCubic(elapsed / INTRO_PLAY_FACE_MS);
}

export function introPlayZoomT(elapsed: number, reduceMotion = false) {
  if (reduceMotion) return 1;
  return easeOutQuad(elapsed / INTRO_PLAY_ALIGN_MS);
}

export function introPlayAlignT(elapsed: number, reduceMotion = false) {
  return introPlayZoomT(elapsed, reduceMotion);
}

export function lerpIntroCamera(from: IntroCameraPose, to: IntroCameraPose, t: number): IntroCameraPose {
  const amount = Math.max(0, Math.min(1, t));
  return {
    yaw: lerp(from.yaw, to.yaw, amount),
    pitch: lerp(from.pitch, to.pitch, amount),
    distance: lerp(from.distance, to.distance, amount),
    target: {
      x: lerp(from.target.x, to.target.x, amount),
      y: lerp(from.target.y, to.target.y, amount),
      z: lerp(from.target.z, to.target.z, amount),
    },
  };
}

export function introPlayPose(from: IntroCameraPose, elapsed: number, reduceMotion = false): IntroCameraPose {
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw));
  const faceT = introPlayFaceT(elapsed, reduceMotion);
  const zoomT = introPlayZoomT(elapsed, reduceMotion);
  return {
    yaw: lerp(from.yaw, to.yaw, faceT),
    pitch: lerp(from.pitch, to.pitch, faceT),
    distance: lerp(from.distance, to.distance, zoomT),
    target: {
      x: lerp(from.target.x, to.target.x, zoomT),
      y: lerp(from.target.y, to.target.y, zoomT),
      z: lerp(from.target.z, to.target.z, zoomT),
    },
  };
}

export function lerpView(from: ViewTransform, to: ViewTransform, t: number): ViewTransform {
  const amount = Math.max(0, Math.min(1, t));
  return {
    centerX: lerp(from.centerX, to.centerX, amount),
    centerY: lerp(from.centerY, to.centerY, amount),
    halfY: lerp(from.halfY, to.halfY, amount),
  };
}
