import type { ViewTransform } from "./view-map.ts";
import { SPLAT_RE_OFFSET } from "./splat-orbit.ts";

export { SPLAT_RE_OFFSET };

export const INTRO_PLAY_ALIGN_MS = 1800;
export const INTRO_PLAY_FACE_MS = 700;
export const INTRO_PLAY_FADE_DELAY_MS = 400;
export const INTRO_PLAY_FADE_MS = 2400;
export const INTRO_PLAY_EXIT_MS = INTRO_PLAY_FADE_DELAY_MS + INTRO_PLAY_FADE_MS + 180;
export const INTRO_PLAY_FOV = 10;
export const INTRO_PLAY_END_FOV = 10;
export const INTRO_START_SCALE = 0.2;
export const INTRO_START_DISTANCE = {
  classic: 25,
  henon: 15.75,
} as const;
export const PLAY_SPLAT_DISTANCE_SCALE = 0.71;
export const INTRO_SPLAT_SIZE = 1.35;
/** Look at the pond center so the splat head lines up with the 2D Buddha. */
export const PLAY_SPLAT_TARGET_Y_LIFT = 0.03;
/** Face the z-plane so the front view is the 2D Buddhabrot. */
export const PLAY_ALIGN_YAW = 0;
export const PLAY_POND_VIEW: ViewTransform = { centerX: -0.58, centerY: 0, halfY: 0.8 };

export type IntroCameraTarget = { x: number; y: number; z: number };

export type IntroCameraPose = {
  yaw: number;
  pitch: number;
  distance: number;
  fov: number;
  target: IntroCameraTarget;
};

export type IntroPlayTune = {
  targetX: number;
  targetY: number;
  scale: number;
  endFov: number;
  splatSize: number;
};

export function defaultIntroPlayTune(): IntroPlayTune {
  return {
    targetX: 0,
    targetY: PLAY_SPLAT_TARGET_Y_LIFT,
    scale: PLAY_SPLAT_DISTANCE_SCALE,
    endFov: INTRO_PLAY_END_FOV,
    splatSize: INTRO_SPLAT_SIZE,
  };
}

export function resolveIntroPlayTune(tune?: Partial<IntroPlayTune> | null): IntroPlayTune {
  return { ...defaultIntroPlayTune(), ...tune };
}

export function complexToSplat(re: number, im: number): IntroCameraTarget {
  return { x: im, y: -(re + SPLAT_RE_OFFSET), z: 0 };
}

export function splatDistanceForHalfY(halfY: number, fovDeg = INTRO_PLAY_FOV) {
  return halfY / Math.tan((fovDeg * Math.PI) / 360);
}

export function introPlayApparentHalfY(pose: Pick<IntroCameraPose, "distance" | "fov">) {
  return pose.distance * Math.tan((pose.fov * Math.PI) / 360);
}

function easeInOutCubic(elapsed: number, duration: number, reduceMotion = false) {
  if (reduceMotion) return 1;
  const x = Math.max(0, Math.min(1, elapsed / duration));
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function playSplatHalfY(view: ViewTransform = PLAY_POND_VIEW, scale = PLAY_SPLAT_DISTANCE_SCALE) {
  return view.halfY * scale;
}

/** Face-on look at the rotated z-plane, framed like the play pond. */
export function introPlayCamera(
  view: ViewTransform = PLAY_POND_VIEW,
  yaw = PLAY_ALIGN_YAW,
  tune?: Partial<IntroPlayTune> | null,
): IntroCameraPose {
  const resolved = resolveIntroPlayTune(tune);
  const pond = complexToSplat(view.centerX, view.centerY);
  return {
    yaw,
    pitch: 0,
    fov: INTRO_PLAY_FOV,
    distance: splatDistanceForHalfY(playSplatHalfY(view, resolved.scale), INTRO_PLAY_FOV),
    target: { x: pond.x + resolved.targetX, y: pond.y + resolved.targetY, z: pond.z },
  };
}

/** Shortest yaw to a square-on z-plane Buddhabrot. */
export function playAlignYaw(current: number, target = PLAY_ALIGN_YAW) {
  const tau = Math.PI * 2;
  const delta = ((target - current) % tau + tau) % tau;
  return delta <= Math.PI ? current + delta : current + delta - tau;
}

export function introPlayFlatten(elapsed: number, reduceMotion = false) {
  return lerp(1, 0.04, easeInOutCubic(elapsed, INTRO_PLAY_ALIGN_MS, reduceMotion));
}

export function introPlayFaceT(elapsed: number, reduceMotion = false) {
  return easeInOutCubic(elapsed, INTRO_PLAY_ALIGN_MS, reduceMotion);
}

export function introPlayZoomT(elapsed: number, reduceMotion = false) {
  return easeInOutCubic(elapsed, INTRO_PLAY_ALIGN_MS, reduceMotion);
}

export function introPlayAlignT(elapsed: number, reduceMotion = false) {
  return easeInOutCubic(elapsed, INTRO_PLAY_ALIGN_MS, reduceMotion);
}

export function lerpIntroCamera(from: IntroCameraPose, to: IntroCameraPose, t: number): IntroCameraPose {
  const amount = Math.max(0, Math.min(1, t));
  return {
    yaw: lerp(from.yaw, to.yaw, amount),
    pitch: lerp(from.pitch, to.pitch, amount),
    distance: lerp(from.distance, to.distance, amount),
    fov: from.fov,
    target: {
      x: lerp(from.target.x, to.target.x, amount),
      y: lerp(from.target.y, to.target.y, amount),
      z: lerp(from.target.z, to.target.z, amount),
    },
  };
}

export function introPlayPose(
  from: IntroCameraPose,
  elapsed: number,
  reduceMotion = false,
  tune?: Partial<IntroPlayTune> | null,
): IntroCameraPose {
  const resolved = resolveIntroPlayTune(tune);
  const to = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(from.yaw), resolved);
  return lerpIntroCamera(from, to, introPlayZoomT(elapsed, reduceMotion));
}

export function lerpView(from: ViewTransform, to: ViewTransform, t: number): ViewTransform {
  const amount = Math.max(0, Math.min(1, t));
  return {
    centerX: lerp(from.centerX, to.centerX, amount),
    centerY: lerp(from.centerY, to.centerY, amount),
    halfY: lerp(from.halfY, to.halfY, amount),
  };
}
