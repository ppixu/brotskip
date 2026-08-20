import type { ViewTransform } from "./view-map.ts";

export const INTRO_PLAY_ALIGN_MS = 1800;
export const INTRO_PLAY_FACE_MS = 700;
export const INTRO_PLAY_FADE_DELAY_MS = 1800;
export const INTRO_PLAY_FADE_MS = 1400;
export const INTRO_PLAY_EXIT_MS = INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS + 180;
export const INTRO_PLAY_FOV = 42;
export const INTRO_PLAY_END_FOV = 5;
/** Matches tools/true_buddhabrot_splat.cpp: y = -(Re(z) + 0.5). */
export const SPLAT_RE_OFFSET = 0.5;
/** Zoom the gaussian in so its silhouette matches the 2D pond Buddha. */
export const PLAY_SPLAT_DISTANCE_SCALE = 0.56;
/** Look higher in splat space so the Buddha sits lower on screen. */
export const PLAY_SPLAT_TARGET_Y_LIFT = 0.14;
/** Face-on is 45° past the z-plane so the Buddha looks at the camera. */
export const PLAY_ALIGN_YAW = -Math.PI / 4;
export const PLAY_POND_VIEW: ViewTransform = { centerX: -0.58, centerY: 0, halfY: 0.8 };

export type IntroCameraTarget = { x: number; y: number; z: number };

export type IntroCameraPose = {
  yaw: number;
  pitch: number;
  distance: number;
  fov: number;
  target: IntroCameraTarget;
};

export function complexToSplat(re: number, im: number): IntroCameraTarget {
  return { x: im, y: -(re + SPLAT_RE_OFFSET), z: 0 };
}

export function splatDistanceForHalfY(halfY: number, fovDeg = INTRO_PLAY_FOV) {
  return halfY / Math.tan((fovDeg * Math.PI) / 360);
}

export function introPlayApparentHalfY(pose: Pick<IntroCameraPose, "distance" | "fov">) {
  return pose.distance * Math.tan((pose.fov * Math.PI) / 360);
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

function playSplatHalfY(view: ViewTransform = PLAY_POND_VIEW) {
  return view.halfY * PLAY_SPLAT_DISTANCE_SCALE;
}

/** Face-on look at the rotated z-plane, framed like the play pond. */
export function introPlayCamera(view: ViewTransform = PLAY_POND_VIEW, yaw = PLAY_ALIGN_YAW): IntroCameraPose {
  const pond = complexToSplat(view.centerX, view.centerY);
  return {
    yaw,
    pitch: 0,
    fov: INTRO_PLAY_END_FOV,
    distance: splatDistanceForHalfY(playSplatHalfY(view), INTRO_PLAY_END_FOV),
    target: { x: pond.x, y: pond.y + PLAY_SPLAT_TARGET_Y_LIFT, z: pond.z },
  };
}

/** Shortest yaw to the play face, 45° past a square-on z-plane. */
export function playAlignYaw(current: number, target = PLAY_ALIGN_YAW) {
  const tau = Math.PI * 2;
  const delta = ((target - current) % tau + tau) % tau;
  return delta <= Math.PI ? current + delta : current + delta - tau;
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
  return easeOutQuad(elapsed / INTRO_PLAY_FACE_MS);
}

export function introPlayDollyT(elapsed: number, reduceMotion = false) {
  if (reduceMotion) return 1;
  return easeOutQuad((elapsed - INTRO_PLAY_FACE_MS) / (INTRO_PLAY_ALIGN_MS - INTRO_PLAY_FACE_MS));
}

export function introPlayAlignT(elapsed: number, reduceMotion = false) {
  if (reduceMotion) return 1;
  return easeOutQuad(elapsed / INTRO_PLAY_ALIGN_MS);
}

export function lerpIntroCamera(from: IntroCameraPose, to: IntroCameraPose, t: number): IntroCameraPose {
  const amount = Math.max(0, Math.min(1, t));
  return {
    yaw: lerp(from.yaw, to.yaw, amount),
    pitch: lerp(from.pitch, to.pitch, amount),
    distance: lerp(from.distance, to.distance, amount),
    fov: lerp(from.fov, to.fov, amount),
    target: {
      x: lerp(from.target.x, to.target.x, amount),
      y: lerp(from.target.y, to.target.y, amount),
      z: lerp(from.target.z, to.target.z, amount),
    },
  };
}

export function introPlayPose(from: IntroCameraPose, elapsed: number, reduceMotion = false): IntroCameraPose {
  const fromFov = from.fov ?? INTRO_PLAY_FOV;
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw));
  const faceT = introPlayFaceT(elapsed, reduceMotion);
  const sizeT = introPlayZoomT(elapsed, reduceMotion);
  const dollyT = introPlayDollyT(elapsed, reduceMotion);
  const halfY = lerp(introPlayApparentHalfY({ distance: from.distance, fov: fromFov }), playSplatHalfY(), sizeT);
  const fov = lerp(fromFov, to.fov, dollyT);
  return {
    yaw: lerp(from.yaw, to.yaw, faceT),
    pitch: lerp(from.pitch, to.pitch, faceT),
    fov,
    distance: splatDistanceForHalfY(halfY, fov),
    target: {
      x: lerp(from.target.x, to.target.x, sizeT),
      y: lerp(from.target.y, to.target.y, sizeT),
      z: lerp(from.target.z, to.target.z, sizeT),
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
