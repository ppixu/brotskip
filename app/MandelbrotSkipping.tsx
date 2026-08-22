"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useCallback, useEffect, useRef, useState } from "react";
import { acquireGpu, type GpuContext } from "@/lib/gpu";
import BuddhabrotIntro from "./BuddhabrotIntro";
import HowItWorks from "./HowItWorks";
import { GAME_TAGLINE, GAME_TITLE, GAME_VERSION } from "@/lib/brand";
import {
  ESCAPE_RADIUS_SQ,
  OFFSCREEN_STREAK,
  TINY_HOP_PX,
  TINY_HOP_STREAK,
  updateOrbitEnd,
} from "@/lib/orbit-end";
import { MIN_SKIPS, MAX_SKIPS, sampleSkipCount } from "@/lib/skip-count";
import { allocateSources, allocateSourcesAppend } from "@/lib/orbit-sources";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import {
  indexedDbStore,
  readCachedTexture,
  selectTextureSize,
  writeCachedTexture,
} from "@/lib/buddhabrot/cache";
import {
  FLASHLIGHT_CACHE_ALPHA,
  FLASHLIGHT_HALF_ANGLE,
  FLASHLIGHT_EDGE_BLUR_PX,
  INTRO_ATMOSPHERE,
  INTRO_BACKGROUND_SPAWN_MS,
  INTRO_MAX_DEPTH,
  INTRO_SOURCE_DOTS,
  INTRO_THROWS_PER_WAVE,
  INTRO_ROCK_DRAW_EVERY,
  INTRO_NEBULA_SEEDS_PER_WAVE,
  MRI_PREITERATE_MS,
  PLAY_ATMOSPHERE,
  AIMING_ATMOSPHERE,
  AIMING_POND_ZOOM,
  AIMING_BACKGROUND_SPAWN_MS,
  AIMING_NEBULA_SEEDS_PER_WAVE,
  AIMING_SOURCE_CAP,
  displayLayerGains,
  introMriSlice,
  introLaunchOrigin,
  introNebulaSeed,
  type FlashlightCone,
  type OrbitAtmosphere,
} from "@/lib/flashlight-probe";
import {
  ACCELERATION_CURVE_POWER,
  ACCELERATION_RAMP_DEPTH,
  acceleratedSteps,
  BASE_STEPS_PER_SOURCE,
  clampAcceleration,
  DEFAULT_ACCELERATION,
  DEPTH_OPTIONS,
  MAX_ACCELERATION,
  MIN_ACCELERATION,
} from "@/lib/orbit-tuning";
import {
  TRAIL_BOUNDS,
  complexToClip,
  complexToScreen,
  gpuBufferSize,
  gpuPixelRatio,
  mathBoundsForView,
  reprojectScreenPoint,
  reprojectScreenVelocity,
  screenToComplex,
  zoomPixelScale,
  type ViewTransform,
} from "@/lib/view-map";
import {
  initialThrowShare,
  sharePlayerLabel,
  throwShareUrl,
  type SharedThrow,
} from "@/lib/throw-share";
import { COVERAGE_GRID, COVERAGE_WORDS, orbitShape } from "@/lib/orbit-shape";
import { GLYPH_COUNT, SACRED_PATH_COUNTS, sacredShapeOffset } from "@/lib/sacred-geometry";
import { createGameAudio, finishComplexity, type GameAudio } from "@/lib/audio/index";
import {
  projectSacredBall,
  SACRED_BALL_RADIUS,
  sacredBallGlyphPose,
  sacredBallHopScale,
  sacredBallHopT,
  sacredBallLifeScale,
  sacredBallPose,
} from "@/lib/sacred-ball";
import {
  TUTORIAL_ARROW_LABEL,
  tutorialArrowGeometry,
  tutorialArrowStretch,
  tutorialArrowVisible,
} from "@/lib/tutorial-arrow";
import { INTRO_PLAY_ALIGN_MS, INTRO_PLAY_EXIT_MS, PLAY_POND_VIEW } from "@/lib/intro-play";
import { buddhabrotImageTransform } from "@/lib/buddhabrot-outline";
import {
  buddhabrotIntroCrossfadeAlpha,
  buddhabrotShadeFadeAlpha,
  buddhabrotSlingFadeAlpha,
} from "@/lib/buddhabrot-fade";
import { STONES, stoneById, clampTuningToStone, type StoneDef } from "@/lib/progression/stones";
import { expectedSkips } from "@/lib/progression/pricing";
import {
  freshProgression,
  loadProgression,
  storeProgression,
  buy as buyProgression,
  equip as equipProgression,
  earn as earnProgression,
  completeChallenges as completeProgressionChallenges,
  updateStreak as updateProgressionStreak,
  type ProgressionState,
} from "@/lib/progression/state";
import { CHALLENGES, CHALLENGE_IDS, evaluateChallenges, type ThrowSummary } from "@/lib/progression/challenges";
import {
  COLLECTABLE_COLORS,
  COLLECTABLE_EXTRA_SKIPS,
  COLLECTABLE_RADIUS_PX,
  COLLECTABLE_SCORE_MULTIPLIER,
  collectableHit,
  rollCollectable,
  surgedDepth,
  type Collectable,
} from "@/lib/progression/collectables";

type Phase = "ready" | "aiming" | "flying" | "resolving" | "result";

type Hud = {
  phase: Phase;
  score: number;
  skips: number;
  deepest: number;
  progress: number;
  coverage: number;
  spread: number;
};

type ScoreEntry = {
  id: string;
  name: string;
  score: number;
  deepest: number;
  skips: number;
  coverage: number;
  spread: number;
  createdAt: string;
};

type OrbitScore = {
  zr: number;
  zi: number;
  cr: number;
  ci: number;
  depth: number;
  shownDepth: number;
  skip: number;
  glyph: number;
  stepDistance: number;
  distanceContraction: number;
  cells: Uint32Array;
  distinct: number;
  sumX: number;
  sumY: number;
  sumXX: number;
  sumYY: number;
  sumXY: number;
  resolved: boolean;
  score: number;
  boost: number;
  offscreenStreak: number;
  tinyHopStreak: number;
};

type Tuning = {
  sourceDots: number;
  maxDepth: number;
  acceleration: number;
  linePersist: number;
  previewOrbits: boolean;
  previewIterations: number;
  skipColors: boolean;
  coordinateAxes: boolean;
  rotateRight: boolean;
  doublePixels: boolean;
};

type OrbitEngine = {
  spawn: (points: Array<{ x: number; y: number }>, skipIndex: number, cap?: number) => void;
  spawnAppend: (points: Array<{ x: number; y: number }>, skipIndex: number, cap?: number) => number;
  setView: (view: ViewTransform) => void;
  setTuning: (tuning: Tuning) => void;
  setRarity: (tint: readonly [number, number, number], strength: number) => void;
  setIterationBoost: (multiplier: number) => void;
  setAtmosphere: (atmosphere: OrbitAtmosphere) => void;
  setLayer: (layer: "pond" | "throw") => void;
  setDisplay: (display: {
    pondGain: number;
    throwGain: number;
    cone: FlashlightCone | null;
    cssWidth: number;
    cssHeight: number;
    mri?: boolean;
  }) => void;
  beginThrow: (view: ViewTransform, cssWidth: number, cssHeight: number, rotateRight: boolean) => void;
  clearPond: () => void;
  clear: () => void;
  freeze: () => void;
  isMriReady: () => boolean;
  setSuspended: (suspended: boolean) => void;
  destroy: () => void;
};

type FlyingRock = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  spin: number;
  skips: number;
  bounceAge: number;
  plannedSkips: number;
  shotId: number;
  shapeOffset: number;
  ripple: boolean;
};

const MIN_SOURCE_DOTS = 6;
const MAX_SOURCE_DOTS = 128;
const MAX_SOURCES = 4096;
const INTRO_SOURCE_CAP = 4096;
const SCORE_DEPTH_CAP = DEPTH_OPTIONS[DEPTH_OPTIONS.length - 1];
const LINE_VISIBLE_FLOOR = 0.05;
const MIN_LINE_PERSIST = 0.05;
const MAX_LINE_PERSIST = 8;
const MIN_PREVIEW_ITERATIONS = 10;
const MAX_PREVIEW_ITERATIONS = 100;
const SKIP_TINTS = [
  [80, 214, 255],
  [92, 255, 196],
  [186, 255, 120],
  [255, 230, 110],
  [255, 168, 92],
  [255, 122, 186],
  [196, 146, 255],
] as const;
const SKIP_TINT_WGSL = SKIP_TINTS
  .map(([r, g, b]) => `vec3f(${(r / 255).toFixed(5)}, ${(g / 255).toFixed(5)}, ${(b / 255).toFixed(5)})`)
  .join(", ");
const DEFAULT_TUNING: Tuning = {
  sourceDots: 64,
  maxDepth: 2_000_000,
  acceleration: DEFAULT_ACCELERATION,
  linePersist: 0.6,
  previewOrbits: true,
  previewIterations: 100,
  skipColors: true,
  coordinateAxes: false,
  rotateRight: true,
  doublePixels: false,
};
const TUNING_KEY = "mandelbrot-skipping:tuning:v9";
const SOURCE_RADIUS_PX = 10;
const IMPACT_LABEL_FADE_MS = 6400;
const SLING_DRAW_PULL_RATIO = 0.30;
const SLING_THROW_PULL_RATIO = 0.16;
const POINT_BUDGET = 400_000;
const HIDDEN_INITIAL_STEPS = 0;
const CURVE_SEGMENTS = 6;
const LINE_SEGMENT_BUDGET = 25_000;
const LINE_SEGMENT_CAPACITY = LINE_SEGMENT_BUDGET + MAX_SOURCES;
const SCORE_SAMPLE_STRIDE = 4;
const MAX_HOP_SCREEN_MULTIPLIER = 2;
const SCORE_KEY = "mandelbrot-skipping:scores:v2";
const LEGACY_SCORE_KEY = "mandelbrot-skipping:scores:v1";
const THEME_KEY = "mandelbrot-skipping:theme:v1";
const TAU = Math.PI * 2;
const POND_CENTER = { x: PLAY_POND_VIEW.centerX, y: PLAY_POND_VIEW.centerY };
const VIEW_HALF_Y = PLAY_POND_VIEW.halfY;
const INTRO_POND_CENTER = { x: -0.55, y: 0 };
const INTRO_VIEW_HALF_Y = 1.52;
const SCORE_HALF_X = 1.6;
const SCORE_HALF_Y = 1.15;

const computeShader = /* wgsl */ `
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationMultiplier: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  iterationBoost: f32,
  bounds: vec4f,
}
struct OrbitPoint { position: vec2f, depth: f32, pad: f32 }
struct CurveSegment {
  start: vec2f,
  control1: vec2f,
  control2: vec2f,
  end: vec2f,
  freshnessStart: f32,
  freshnessEnd: f32,
  depth: f32,
  pad: f32,
}
struct OrbitState {
  z: vec2f,
  c: vec2f,
  reserved: vec2f,
  step: u32,
  alive: u32,
  offscreenStreak: u32,
  tinyHopStreak: u32,
  pad: vec2u,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> vertices: array<OrbitPoint>;
@group(0) @binding(2) var<storage, read_write> states: array<OrbitState>;
struct DrawArgs {
  vertexCount: atomic<u32>,
  instanceCount: u32,
  firstVertex: u32,
  firstInstance: u32,
}
@group(0) @binding(3) var<storage, read_write> drawArgs: DrawArgs;
@group(0) @binding(4) var<storage, read_write> lineSegments: array<CurveSegment>;
@group(0) @binding(5) var<storage, read_write> lineDrawArgs: DrawArgs;

fn toClip(z: vec2f) -> vec2f {
  let delta = z - params.center;
  let oriented = select(delta, vec2f(delta.y, -delta.x), params.rotateRight > 0.5);
  return oriented / params.viewHalf;
}
fn toAtlasClip(z: vec2f) -> vec2f {
  let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
  return vec2f(
    (z.x - params.bounds.x) / span.x * 2.0 - 1.0,
    (z.y - params.bounds.z) / span.y * 2.0 - 1.0
  );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let source = id.x;
  if (source >= params.sourceCount) { return; }
  var state = states[source];
  if (state.alive == 0u || state.step >= params.maxDepth) { return; }
  let rampDepth = f32(state.step) / ${ACCELERATION_RAMP_DEPTH}.0;
  let curveAcceleration = pow(rampDepth, ${ACCELERATION_CURVE_POWER}.0);
  let curvedBatch = min(
    f32(params.batch),
    f32(${BASE_STEPS_PER_SOURCE}u) + max(params.accelerationMultiplier, ${MIN_ACCELERATION}) * curveAcceleration
  );
  let normalBatch = max(${BASE_STEPS_PER_SOURCE}u, u32(curvedBatch));
  let boost = max(1u, u32(params.iterationBoost));
  let acceleratedBatch = min(params.batch, normalBatch * boost);
  let lineCount = min(acceleratedBatch, params.lineQuota);
  let firstLineStep = acceleratedBatch - lineCount;
  for (var i = 0u; i < acceleratedBatch; i++) {
    let previousZ = state.z;
    let z = vec2f(
      state.z.x * state.z.x - state.z.y * state.z.y,
      2.0 * state.z.x * state.z.y
    ) + state.c;
    state.z = z;
    state.step += 1u;
    let previousClip = toClip(previousZ);
    let clip = toClip(z);
    let hopPx = length((clip - previousClip) * params.viewport * 0.5);
    let depthColor = log2(f32(state.step) + 1.0) / 25.6;
    let inLayer = all(abs(toAtlasClip(z)) <= vec2f(1.0));
    let onScreen = all(abs(clip) <= vec2f(1.02));
    let inPond = z.x >= ${TRAIL_BOUNDS.xMin} && z.x <= ${TRAIL_BOUNDS.xMax}
      && z.y >= ${TRAIL_BOUNDS.yMin} && z.y <= ${TRAIL_BOUNDS.yMax};
    if (inLayer || onScreen) {
      if (state.step > u32(params.hiddenSteps)) {
        let slot = atomicAdd(&drawArgs.vertexCount, 1u);
        if (slot < ${POINT_BUDGET}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inLayer || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let incomingLength = length(clip - previousClip);
        let control1 = previousZ + (z - previousZ) / 3.0;
        let control2 = z - (future - z) / 3.0;
        if (incomingLength <= 0.12 && length(z - previousZ) <= 0.12) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${CURVE_SEGMENTS * 2}u);
          let lineSlot = lineVertex / ${CURVE_SEGMENTS * 2}u;
          if (lineSlot < ${LINE_SEGMENT_CAPACITY}u) {
            lineSegments[lineSlot] = CurveSegment(
              previousZ, control1, control2, z,
              f32(i - firstLineStep) / f32(max(lineCount, 1u)),
              f32(i - firstLineStep + 1u) / f32(max(lineCount, 1u)),
              depthColor, state.reserved.x
            );
          }
        }
      }
    }
    let magSq = dot(z, z);
    state.offscreenStreak = select(state.offscreenStreak + 1u, 0u, inPond || onScreen);
    state.tinyHopStreak = select(0u, state.tinyHopStreak + 1u, hopPx <= ${TINY_HOP_PX} && hopPx == hopPx);
    if (
      magSq > ${ESCAPE_RADIUS_SQ}.0
      || state.offscreenStreak >= ${OFFSCREEN_STREAK}u
      || state.tinyHopStreak >= ${TINY_HOP_STREAK}u
      || state.step >= params.maxDepth
      || hopPx != hopPx
    ) {
      state.alive = 0u;
      break;
    }
  }
  states[source] = state;
}
`;

const pointShader = /* wgsl */ `
struct Style { alpha: f32, pulse: f32, colorMode: f32, sliceEnabled: f32, rarity: vec4f }
struct Slice { zCamera: f32, sliceHalf: f32, zoom: f32, pad: f32 }
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationMultiplier: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  iterationBoost: f32,
  bounds: vec4f,
}
@group(0) @binding(0) var<uniform> style: Style;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var<uniform> slice: Slice;
struct VSOut { @builtin(position) position: vec4f, @location(0) color: vec3f, @location(1) weight: f32 }
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${SKIP_TINT_WGSL});
  return colors[u32(max(index, 1.0) - 1.0) % 7u];
}
fn projectPoint(z: vec2f) -> vec2f {
  if (params.atlasMode > 0.5) {
    let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
    return vec2f(
      (z.x - params.bounds.x) / span.x * 2.0 - 1.0,
      (z.y - params.bounds.z) / span.y * 2.0 - 1.0
    );
  }
  let delta = z - params.center;
  let oriented = select(delta, vec2f(delta.y, -delta.x), params.rotateRight > 0.5);
  return oriented / params.viewHalf;
}
@vertex fn vs(@location(0) position: vec2f, @location(1) depth: f32, @location(2) skip: f32) -> VSOut {
  var out: VSOut;
  let t = clamp(depth, 0.0, 1.0);
  let band = (t - slice.zCamera) / max(slice.sliceHalf, 1e-4);
  let weight = select(1.0, exp(-band * band), style.sliceEnabled > 0.5);
  let zoom = select(1.0, max(slice.zoom, 1.0), style.sliceEnabled > 0.5);
  out.position = vec4f(projectPoint(position) / zoom, 0.0, 1.0);
  let depthColor = mix(vec3f(0.10, 0.78, 0.92), vec3f(0.92, 1.0, 0.82), t);
  let tinted = mix(depthColor, skipTint(skip), style.colorMode);
  let rarityTinted = mix(tinted, style.rarity.rgb, style.rarity.a);
  let gray = vec3f(mix(0.22, 1.0, t));
  out.color = mix(rarityTinted, gray, style.pulse);
  out.weight = weight;
  return out;
}
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  if (style.sliceEnabled > 0.5 && in.weight < 0.03) { discard; }
  let alpha = style.alpha * in.weight;
  return vec4f(in.color * alpha, alpha);
}
`;

const lineShader = /* wgsl */ `
struct CurveSegment {
  start: vec2f,
  control1: vec2f,
  control2: vec2f,
  end: vec2f,
  freshnessStart: f32,
  freshnessEnd: f32,
  depth: f32,
  pad: f32,
}
struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32, rarity: vec4f }
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationMultiplier: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  iterationBoost: f32,
  bounds: vec4f,
}
@group(0) @binding(0) var<storage, read> segments: array<CurveSegment>;
@group(0) @binding(1) var<uniform> style: Style;
@group(0) @binding(2) var<uniform> params: Params;
struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
}
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${SKIP_TINT_WGSL});
  return colors[u32(max(index, 1.0) - 1.0) % 7u];
}
fn projectPoint(z: vec2f) -> vec2f {
  if (params.atlasMode > 0.5) {
    let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
    return vec2f(
      (z.x - params.bounds.x) / span.x * 2.0 - 1.0,
      (z.y - params.bounds.z) / span.y * 2.0 - 1.0
    );
  }
  let delta = z - params.center;
  let oriented = select(delta, vec2f(delta.y, -delta.x), params.rotateRight > 0.5);
  return oriented / params.viewHalf;
}
fn bezier(curve: CurveSegment, t: f32) -> vec2f {
  let u = 1.0 - t;
  return u * u * u * curve.start
    + 3.0 * u * u * t * curve.control1
    + 3.0 * u * t * t * curve.control2
    + t * t * t * curve.end;
}
@vertex fn vs(@builtin(vertex_index) vertex: u32) -> VSOut {
  let curveIndex = vertex / ${CURVE_SEGMENTS * 2}u;
  let localVertex = vertex % ${CURVE_SEGMENTS * 2}u;
  let subsegment = localVertex / 2u;
  let endpoint = localVertex % 2u;
  let t = f32(subsegment + endpoint) / f32(${CURVE_SEGMENTS});
  let curve = segments[curveIndex];
  let depth = clamp(curve.depth, 0.0, 1.0);
  var out: VSOut;
  out.position = vec4f(projectPoint(bezier(curve, t)), 0.0, 1.0);
  let baseColor = mix(mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth), skipTint(curve.pad), style.colorMode);
  out.color = mix(baseColor, style.rarity.rgb, style.rarity.a);
  let directionalFreshness = mix(curve.freshnessStart, curve.freshnessEnd, t);
  out.alpha = 0.28 * pow(directionalFreshness, 0.65);
  return out;
}
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.color * in.alpha, in.alpha);
}
`;

const fullscreenVertex = /* wgsl */ `
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
`;

const fadeShader = /* wgsl */ `
${fullscreenVertex}
@group(0) @binding(0) var previous: texture_2d<f32>;
@group(0) @binding(1) var trailSampler: sampler;
struct FadeTransform {
  retention: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
}
@group(0) @binding(2) var<uniform> fade: FadeTransform;
@fragment fn fadeFs(in: VSOut) -> @location(0) vec4f {
  return textureSample(previous, trailSampler, in.uv) * fade.retention;
}
`;

const displayShader = /* wgsl */ `
${fullscreenVertex}
@group(0) @binding(0) var pondTexture: texture_2d<f32>;
@group(0) @binding(1) var throwTexture: texture_2d<f32>;
@group(0) @binding(2) var throwLineTexture: texture_2d<f32>;
@group(0) @binding(3) var liveTexture: texture_2d<f32>;
@group(0) @binding(4) var liveLineTexture: texture_2d<f32>;
@group(0) @binding(5) var displaySampler: sampler;
@group(0) @binding(6) var mriTexture: texture_2d<f32>;
struct DisplayView {
  center: vec2f,
  viewHalf: vec2f,
  rotateRight: f32,
  pad: f32,
  liveGain: f32,
  contrast: f32,
  pondBounds: vec4f,
  throwBounds: vec4f,
  pondGain: f32,
  throwGain: f32,
  coneEnabled: f32,
  coneHalfAngle: f32,
  coneApex: vec2f,
  coneDirection: vec2f,
  coneRange: f32,
  coneEdge: f32,
  viewport: vec2f,
  mriEnabled: f32,
  mriCamera: f32,
  mriSliceHalf: f32,
  mriZoom: f32,
}
@group(0) @binding(7) var<uniform> display: DisplayView;
fn layerUv(z: vec2f, bounds: vec4f) -> vec2f {
  let span = vec2f(bounds.y - bounds.x, bounds.w - bounds.z);
  return vec2f(
    (z.x - bounds.x) / span.x,
    (bounds.w - z.y) / span.y
  );
}
fn toneMap(rawRgb: vec3f, contrast: f32) -> vec3f {
  let raw = rawRgb * 3.6;
  let mapped = raw / (vec3f(1.0) + raw);
  return pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast));
}
fn coneMask(uv: vec2f, view: DisplayView) -> f32 {
  if (view.coneEnabled < 0.5) { return 1.0; }
  let px = uv * view.viewport;
  let delta = px - view.coneApex;
  let distance = length(delta);
  if (distance <= 0.0 || distance > view.coneRange) { return 0.0; }
  let along = dot(delta / distance, view.coneDirection);
  let halfCos = cos(view.coneHalfAngle);
  let edgeCos = cos(max(view.coneHalfAngle - view.coneEdge, 0.0));
  let angular = smoothstep(halfCos, edgeCos, along);
  let t = clamp(distance / max(view.coneRange, 1e-5), 0.0, 1.0);
  let radial = mix(0.9, 0.4, smoothstep(0.0, 0.55, t)) * (1.0 - smoothstep(0.55, 1.0, t));
  return angular * radial;
}
@fragment fn displayFs(in: VSOut) -> @location(0) vec4f {
  let clip = vec2f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0);
  let oriented = clip * display.viewHalf;
  let delta = select(oriented, vec2f(-oriented.y, oriented.x), display.rotateRight > 0.5);
  let z = display.center + delta;
  let contrast = max(display.contrast, 0.08);
  let liveGain = display.liveGain;
  let pondGain = display.pondGain;
  let throwGain = display.throwGain;
  let cone = coneMask(in.uv, display);
  var pondUv = layerUv(z, display.pondBounds);
  if (display.mriEnabled > 0.5) {
    pondUv = (pondUv - vec2f(0.5)) / max(display.mriZoom, 1.0) + vec2f(0.5);
  } else {
    pondUv = (pondUv - vec2f(0.5)) * max(display.mriZoom, 1.0) + vec2f(0.5);
  }
  let throwUv = layerUv(z, display.throwBounds);
  let pondInside = all(pondUv >= vec2f(0.0)) && all(pondUv <= vec2f(1.0));
  let throwInside = all(throwUv >= vec2f(0.0)) && all(throwUv <= vec2f(1.0));
  let pondRaw = select(vec3f(0.0), textureSample(pondTexture, displaySampler, pondUv).rgb, pondInside);
  let throwRaw = select(vec3f(0.0), textureSample(throwTexture, displaySampler, throwUv).rgb, throwInside);
  let mriRaw = select(vec3f(0.0), textureSample(mriTexture, displaySampler, pondUv).rgb, pondInside);
  let scanRaw = select(pondRaw, mriRaw, display.mriEnabled > 0.5);
  var mriWeight = 1.0;
  if (display.mriEnabled > 0.5) {
    let depthNumerator = max(0.0, 0.92 * scanRaw.r - 0.10 * scanRaw.b);
    let depthDenominator = max(1e-5, 0.82 * scanRaw.b + 0.10 * scanRaw.r);
    let inferredDepth = clamp(depthNumerator / depthDenominator, 0.0, 1.0);
    let band = (inferredDepth - display.mriCamera) / max(display.mriSliceHalf, 1e-4);
    mriWeight = exp(-band * band);
  }
  let raw = scanRaw * 3.6 * mriWeight;
  let mapped = raw / (vec3f(1.0) + raw);
  let glow = pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast)) * pondGain * cone;
  let throwGlow = toneMap(throwRaw, contrast);
  let lineGain = display.pad;
  let throwLines = select(vec3f(0.0), textureSample(throwLineTexture, displaySampler, throwUv).rgb, throwInside) * 1.35 * lineGain;
  let liveGlow = textureSample(liveTexture, displaySampler, in.uv).rgb * 3.6;
  let liveMapped = liveGlow / (vec3f(1.0) + liveGlow);
  let live = pow(clamp(liveMapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast)) * liveGain * cone;
  let liveLines = textureSample(liveLineTexture, displaySampler, in.uv).rgb * 1.35 * lineGain * cone;
  // pond * pondGain * cone
  let pond = glow;
  let thrown = (throwGlow + throwLines) * throwGain;
  return vec4f(pond + thrown + live + liveLines, 1.0);
}
`;

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function scoreForOrbit(orbit: OrbitScore, depth: number) {
  const capped = Math.min(depth, SCORE_DEPTH_CAP);
  const shape = orbitShape(orbit);
  const depthScore = capped * 0.03 + Math.sqrt(capped) * 75;
  const coverageScore = 80_000 * shape.coverage;
  const areaScore = 120_000 * shape.spread * Math.min(1, orbit.distinct / 24);
  return Math.round((depthScore + coverageScore + areaScore) * (1 + (orbit.skip - 1) * 0.12));
}

function makeRandom(seed: number) {
  let state = seed | 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function skipTintRgb(
  skipIndex: number,
  colored: boolean,
  rarity?: { tint: readonly [number, number, number]; strength: number },
): [number, number, number] {
  const source = colored ? SKIP_TINTS[(Math.max(1, skipIndex) - 1) % SKIP_TINTS.length] : SKIP_TINTS[0];
  const base: [number, number, number] = [source[0], source[1], source[2]];
  if (!rarity || rarity.strength <= 0) return base;
  return [
    Math.round(base[0] + (rarity.tint[0] - base[0]) * rarity.strength),
    Math.round(base[1] + (rarity.tint[1] - base[1]) * rarity.strength),
    Math.round(base[2] + (rarity.tint[2] - base[2]) * rarity.strength),
  ];
}

function formatCompact(value: number) {
  if (value >= 1_000_000_000) return `${value / 1_000_000_000}B`;
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function lineFadeRetention(dt: number, persistSeconds: number) {
  const clampedDt = Math.max(0, Math.min(0.05, dt));
  if (persistSeconds <= 0) return 0;
  if (clampedDt === 0) return 1;
  return Math.pow(LINE_VISIBLE_FLOOR, clampedDt / persistSeconds);
}

function sanitizeTuning(value: Partial<Tuning> | null | undefined): Tuning {
  const requestedDots = Math.round(Number(value?.sourceDots));
  const sourceDots = requestedDots >= MIN_SOURCE_DOTS
    ? Math.min(MAX_SOURCE_DOTS, requestedDots)
    : DEFAULT_TUNING.sourceDots;
  const requestedDepth = Number(value?.maxDepth);
  const maxDepth = DEPTH_OPTIONS.includes(requestedDepth as typeof DEPTH_OPTIONS[number]) ? requestedDepth : DEFAULT_TUNING.maxDepth;
  const acceleration = clampAcceleration(value?.acceleration ?? DEFAULT_ACCELERATION);
  const linePersist = Math.max(
    MIN_LINE_PERSIST,
    Math.min(MAX_LINE_PERSIST, Math.round((Number(value?.linePersist) || DEFAULT_TUNING.linePersist) * 20) / 20),
  );
  const previewOrbits = value?.previewOrbits !== false;
  const skipColors = value?.skipColors !== false;
  const coordinateAxes = value?.coordinateAxes === true;
  const rotateRight = value?.rotateRight !== false;
  const doublePixels = value?.doublePixels === true;
  const requestedPreview = Math.round(Number(value?.previewIterations) || DEFAULT_TUNING.previewIterations);
  const previewIterations = Math.max(
    MIN_PREVIEW_ITERATIONS,
    Math.min(MAX_PREVIEW_ITERATIONS, requestedPreview),
  );
  return { sourceDots, maxDepth, acceleration, linePersist, previewOrbits, previewIterations, skipColors, coordinateAxes, rotateRight, doublePixels };
}

function loadTuning(): Tuning {
  try { return sanitizeTuning(JSON.parse(localStorage.getItem(TUNING_KEY) || "null")); }
  catch { return DEFAULT_TUNING; }
}

function storeTuning(tuning: Tuning) {
  try { localStorage.setItem(TUNING_KEY, JSON.stringify(tuning)); } catch { /* tuning still works for this session */ }
}

function impactSources(x: number, y: number, width: number, height: number, view: ViewTransform, count: number, shape: number, rotateRight: boolean) {
  const points: Array<{ x: number; y: number }> = [];
  const paths = SACRED_PATH_COUNTS[shape % SACRED_PATH_COUNTS.length];
  for (let index = 0; index < count; index++) {
    const path = index % paths;
    const pathIndex = Math.floor(index / paths);
    const samplesOnPath = Math.ceil((count - path) / paths);
    const offset = sacredShapeOffset(shape, path, pathIndex / Math.max(samplesOnPath, 1));
    const mapped = screenToComplex(x + offset.x * SOURCE_RADIUS_PX, y + offset.y * SOURCE_RADIUS_PX, width, height, view, rotateRight);
    points.push({ x: Math.fround(mapped.x), y: Math.fround(mapped.y) });
  }
  return points;
}

function loadScores(): ScoreEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCORE_KEY) || "null");
    const normalize = (entries: unknown[], legacy = false) => entries.flatMap((entry: unknown): ScoreEntry[] => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Partial<ScoreEntry>;
      const valid = typeof item.id === "string" && typeof item.name === "string" && item.name.length <= 12 &&
        Number.isFinite(item.score) && Number.isFinite(item.deepest) && Number.isFinite(item.skips) &&
        typeof item.createdAt === "string";
      if (!valid) return [];
      return [{
        id: item.id!, name: item.name!, score: legacy ? Math.round(item.score! / 100) : item.score!,
        deepest: item.deepest!, skips: item.skips!, coverage: Number.isFinite(item.coverage) ? item.coverage! : 0,
        spread: Number.isFinite(item.spread) ? item.spread! : 0, createdAt: item.createdAt!,
      }];
    }).slice(0, 10);
    if (parsed?.version === 2 && Array.isArray(parsed.entries)) return normalize(parsed.entries);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SCORE_KEY) || "null");
    if (legacy?.version !== 1 || !Array.isArray(legacy.entries)) return [];
    const migrated = normalize(legacy.entries, true);
    storeScores(migrated);
    return migrated;
  } catch {
    return [];
  }
}

function storeScores(entries: ScoreEntry[]) {
  try { localStorage.setItem(SCORE_KEY, JSON.stringify({ version: 2, entries })); } catch { /* local play still works */ }
}

async function createOrbitEngine(canvas: HTMLCanvasElement, gpu: GpuContext, introLowRes = false): Promise<OrbitEngine | null> {
  const device = gpu.device;
  const context = canvas.getContext("webgpu") as any;
  const canvasFormat = gpu.preferredFormat;
  context.configure({ device, format: canvasFormat, alphaMode: "opaque" });
  const usage = (globalThis as any).GPUBufferUsage;
  const textureUsage = (globalThis as any).GPUTextureUsage;
  const vertexBuffer = device.createBuffer({ size: POINT_BUDGET * 16, usage: usage.STORAGE | usage.VERTEX });
  const lineSegmentBuffer = device.createBuffer({ size: LINE_SEGMENT_CAPACITY * 48, usage: usage.STORAGE });
  const stateBuffer = device.createBuffer({ size: MAX_SOURCES * 48, usage: usage.STORAGE | usage.COPY_DST });
  const indirectBuffer = device.createBuffer({ size: 16, usage: usage.STORAGE | usage.COPY_DST | usage.INDIRECT });
  const lineIndirectBuffer = device.createBuffer({ size: 16, usage: usage.STORAGE | usage.COPY_DST | usage.INDIRECT });
  const paramsBuffer = device.createBuffer({ size: 80, usage: usage.UNIFORM | usage.COPY_DST });
  const paramsAtlasBuffer = device.createBuffer({ size: 80, usage: usage.UNIFORM | usage.COPY_DST });
  const styleBuffer = device.createBuffer({ size: 32, usage: usage.UNIFORM | usage.COPY_DST });
  const sliceBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const fadeBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const lineFadeBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const displayViewBuffer = device.createBuffer({ size: 128, usage: usage.UNIFORM | usage.COPY_DST });
  const sampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
  const computeModule = device.createShaderModule({ code: computeShader });
  const pointModule = device.createShaderModule({ code: pointShader });
  const lineModule = device.createShaderModule({ code: lineShader });
  const fadeModule = device.createShaderModule({ code: fadeShader });
  const displayModule = device.createShaderModule({ code: displayShader });
  const computePipeline = device.createComputePipeline({ layout: "auto", compute: { module: computeModule, entryPoint: "main" } });
  const pointPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: pointModule,
      entryPoint: "vs",
      buffers: [{ arrayStride: 16, attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
        { shaderLocation: 1, offset: 8, format: "float32" },
        { shaderLocation: 2, offset: 12, format: "float32" },
      ] }],
    },
    fragment: { module: pointModule, entryPoint: "fs", targets: [{
      format: "rgba16float",
      blend: {
        color: { srcFactor: "one", dstFactor: "one", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one", operation: "max" },
      },
    }] },
    primitive: { topology: "point-list" },
  });
  const linePipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: lineModule, entryPoint: "vs" },
    fragment: { module: lineModule, entryPoint: "fs", targets: [{
      format: "rgba8unorm",
      blend: {
        color: { srcFactor: "one", dstFactor: "one", operation: "max" },
        alpha: { srcFactor: "one", dstFactor: "one", operation: "max" },
      },
    }] },
    primitive: { topology: "line-list" },
  });
  const fadePipeline = device.createRenderPipeline({
    layout: "auto", vertex: { module: fadeModule, entryPoint: "vs" },
    fragment: { module: fadeModule, entryPoint: "fadeFs", targets: [{ format: "rgba16float" }] },
    primitive: { topology: "triangle-list" },
  });
  const lineFadePipeline = device.createRenderPipeline({
    layout: "auto", vertex: { module: fadeModule, entryPoint: "vs" },
    fragment: { module: fadeModule, entryPoint: "fadeFs", targets: [{ format: "rgba8unorm" }] },
    primitive: { topology: "triangle-list" },
  });
  const displayPipeline = device.createRenderPipeline({
    layout: "auto", vertex: { module: displayModule, entryPoint: "vs" },
    fragment: { module: displayModule, entryPoint: "displayFs", targets: [{ format: canvasFormat }] },
    primitive: { topology: "triangle-list" },
  });
  const computeBind = device.createBindGroup({ layout: computePipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: paramsBuffer } },
    { binding: 1, resource: { buffer: vertexBuffer } },
    { binding: 2, resource: { buffer: stateBuffer } },
    { binding: 3, resource: { buffer: indirectBuffer } },
    { binding: 4, resource: { buffer: lineSegmentBuffer } },
    { binding: 5, resource: { buffer: lineIndirectBuffer } },
  ] });
  const pointBind = device.createBindGroup({ layout: pointPipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: styleBuffer } },
    { binding: 1, resource: { buffer: paramsBuffer } },
    { binding: 2, resource: { buffer: sliceBuffer } },
  ] });
  const pointAtlasBind = device.createBindGroup({ layout: pointPipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: styleBuffer } },
    { binding: 1, resource: { buffer: paramsAtlasBuffer } },
    { binding: 2, resource: { buffer: sliceBuffer } },
  ] });
  const lineBind = device.createBindGroup({ layout: linePipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: lineSegmentBuffer } },
    { binding: 1, resource: { buffer: styleBuffer } },
    { binding: 2, resource: { buffer: paramsBuffer } },
  ] });
  const lineAtlasBind = device.createBindGroup({ layout: linePipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: lineSegmentBuffer } },
    { binding: 1, resource: { buffer: styleBuffer } },
    { binding: 2, resource: { buffer: paramsAtlasBuffer } },
  ] });

  let sourceCount = 0;
  let nextSource = 0;
  let frame = 0;
  let disposed = false;
  let paused = false;
  let suspended = false;
  let pondTextures: any[] = [];
  let throwTextures: any[] = [];
  let throwLineTextures: any[] = [];
  let liveTexture: any = null;
  let liveLineTexture: any = null;
  let mriTexture: any = null;
  let pondFadeBinds: any[] = [];
  let throwFadeBinds: any[] = [];
  let throwLineFadeBinds: any[] = [];
  let displayBinds: any[] = [];
  let pondIndex = 0;
  let throwIndex = 0;
  let width = 0;
  let height = 0;
  let cssWidth = 1;
  let cssHeight = 1;
  let view: ViewTransform = { centerX: INTRO_POND_CENTER.x, centerY: INTRO_POND_CENTER.y, halfY: INTRO_VIEW_HALF_Y };
  let maxDepth = DEFAULT_TUNING.maxDepth;
  let rarityTint: [number, number, number] = [1, 1, 1];
  let rarityStrength = 0;
  let accelerationMultiplier = DEFAULT_TUNING.acceleration;
  let iterationBoost = 1;
  let linePersist = DEFAULT_TUNING.linePersist;
  let skipColors = DEFAULT_TUNING.skipColors;
  let rotateRight = DEFAULT_TUNING.rotateRight;
  let doublePixels = introLowRes;
  let drawLines = PLAY_ATMOSPHERE.drawLines;
  let grayscale = PLAY_ATMOSPHERE.grayscale;
  let pointEnergy = PLAY_ATMOSPHERE.energy;
  let hiddenSteps = PLAY_ATMOSPHERE.hiddenSteps;
  let liveGain = PLAY_ATMOSPHERE.liveGain;
  let contrast = PLAY_ATMOSPHERE.contrast;
  let pondPersist = 0;
  const introGains = displayLayerGains("intro");
  let pondGain = introGains.pondGain;
  let throwGain = introGains.throwGain;
  let cone: FlashlightCone | null = null;
  let mriEnabled = false;
  let mriFrozen = false;
  let mriWarmupStartedAt = 0;
  let mriLoopStartedAt = 0;
  let layer: "pond" | "throw" = "pond";
  let pondBounds = { ...TRAIL_BOUNDS };
  let throwBounds = { ...TRAIL_BOUNDS };
  let lastDrawTime = 0;

  const makeScreen = (format: string) => device.createTexture({
    size: [width, height],
    format,
    usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
  });

  function clearTextures(encoder: any, list: any[]) {
    for (const texture of list) {
      if (!texture) continue;
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      pass.end();
    }
  }

  function makeFadeBinds(textures: any[], buffer: any, pipeline: any) {
    return textures.map((texture) => device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
      { binding: 2, resource: { buffer } },
    ] }));
  }

  function rebuildDisplayBinds() {
    displayBinds = [];
    for (let pond = 0; pond < 2; pond++) {
      for (let thrown = 0; thrown < 2; thrown++) {
        displayBinds[pond * 2 + thrown] = device.createBindGroup({ layout: displayPipeline.getBindGroupLayout(0), entries: [
          { binding: 0, resource: pondTextures[pond].createView() },
          { binding: 1, resource: throwTextures[thrown].createView() },
          { binding: 2, resource: throwLineTextures[thrown].createView() },
          { binding: 3, resource: liveTexture.createView() },
          { binding: 4, resource: liveLineTexture.createView() },
          { binding: 5, resource: sampler },
          { binding: 6, resource: mriTexture.createView() },
          { binding: 7, resource: { buffer: displayViewBuffer } },
        ] });
      }
    }
  }

  function writeParams(buffer: any, atlasMode: number) {
    const bounds = mriEnabled && atlasMode > 0.5 ? TRAIL_BOUNDS : layer === "pond" ? pondBounds : throwBounds;
    const bytes = new ArrayBuffer(80);
    const ints = new Uint32Array(bytes);
    const floats = new Float32Array(bytes);
    ints[0] = sourceCount;
    ints[1] = Math.max(1, Math.floor(POINT_BUDGET / Math.max(sourceCount, 1)));
    ints[2] = maxDepth;
    ints[3] = drawLines ? Math.max(1, Math.floor(LINE_SEGMENT_BUDGET / Math.max(sourceCount, 1))) : 0;
    floats[4] = view.centerX;
    floats[5] = view.centerY;
    floats[6] = view.halfY * width / Math.max(height, 1);
    floats[7] = view.halfY;
    floats[8] = width;
    floats[9] = height;
    floats[10] = rotateRight ? 1 : 0;
    floats[11] = accelerationMultiplier;
    floats[12] = atlasMode;
    floats[13] = hiddenSteps;
    floats[14] = iterationBoost;
    floats[16] = bounds.xMin;
    floats[17] = bounds.xMax;
    floats[18] = bounds.yMin;
    floats[19] = bounds.yMax;
    device.queue.writeBuffer(buffer, 0, bytes);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const buffer = gpuBufferSize(rect.width, rect.height, gpuPixelRatio(globalThis.devicePixelRatio || 1, doublePixels));
    cssWidth = Math.max(1, rect.width);
    cssHeight = Math.max(1, rect.height);
    if (pondTextures.length && buffer.width === width && buffer.height === height) return;
    width = buffer.width;
    height = buffer.height;
    canvas.width = width;
    canvas.height = height;
    for (const texture of [...pondTextures, ...throwTextures, ...throwLineTextures, liveTexture, liveLineTexture, mriTexture]) {
      texture?.destroy();
    }
    pondTextures = [0, 1].map(() => makeScreen("rgba16float"));
    throwTextures = [0, 1].map(() => makeScreen("rgba16float"));
    throwLineTextures = [0, 1].map(() => makeScreen("rgba8unorm"));
    liveTexture = makeScreen("rgba16float");
    liveLineTexture = makeScreen("rgba8unorm");
    mriTexture = makeScreen("rgba16float");
    pondFadeBinds = makeFadeBinds(pondTextures, fadeBuffer, fadePipeline);
    throwFadeBinds = makeFadeBinds(throwTextures, fadeBuffer, fadePipeline);
    throwLineFadeBinds = makeFadeBinds(throwLineTextures, lineFadeBuffer, lineFadePipeline);
    rebuildDisplayBinds();
    const encoder = device.createCommandEncoder({ label: "orbit-resize" });
    clearTextures(encoder, pondTextures);
    clearTextures(encoder, throwTextures);
    clearTextures(encoder, throwLineTextures);
    clearTextures(encoder, [liveTexture, liveLineTexture, mriTexture]);
    device.queue.submit([encoder.finish()]);
    pondIndex = 0;
    throwIndex = 0;
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function scheduleDraw() {
    if (disposed || frame) return;
    frame = requestAnimationFrame(draw);
  }

  function draw() {
    frame = 0;
    if (disposed || gpu.hasFailed() || !pondTextures.length || suspended) return;
    const now = performance.now();
    const dt = lastDrawTime ? (now - lastDrawTime) / 1000 : 1 / 60;
    lastDrawTime = now;
    const lineRetention = lineFadeRetention(dt, linePersist);
    const pondRetention = layer === "pond" && pondPersist > 0 ? lineFadeRetention(dt, pondPersist) : 1;
    writeParams(paramsBuffer, 0);
    writeParams(paramsAtlasBuffer, 1);
    const mriTime = mriFrozen ? Math.max(0, now - mriLoopStartedAt) / 1000 : 0;
    const slice = mriEnabled ? introMriSlice(mriTime) : { zCamera: 0, sliceHalf: 1, zoom: 1 };
    device.queue.writeBuffer(styleBuffer, 0, new Float32Array([
      pointEnergy,
      mriEnabled ? 0 : grayscale ? 1 : 0,
      mriEnabled ? 0 : skipColors ? 1 : 0,
      0,
      rarityTint[0],
      rarityTint[1],
      rarityTint[2],
      mriEnabled ? 0 : rarityStrength,
    ]));
    device.queue.writeBuffer(sliceBuffer, 0, new Float32Array([slice.zCamera, slice.sliceHalf, slice.zoom, 0]));
    device.queue.writeBuffer(indirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    device.queue.writeBuffer(lineIndirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    device.queue.writeBuffer(fadeBuffer, 0, new Float32Array([pondRetention, 0, 0, 0]));
    device.queue.writeBuffer(lineFadeBuffer, 0, new Float32Array([lineRetention, 0, 0, 0]));
    const displayView = new Float32Array(32);
    displayView[0] = view.centerX;
    displayView[1] = view.centerY;
    displayView[2] = view.halfY * width / Math.max(height, 1);
    displayView[3] = view.halfY;
    displayView[4] = rotateRight ? 1 : 0;
    displayView[5] = drawLines ? 1 : 0;
    displayView[6] = mriEnabled ? 0 : liveGain;
    displayView[7] = contrast;
    displayView[8] = pondBounds.xMin;
    displayView[9] = pondBounds.xMax;
    displayView[10] = pondBounds.yMin;
    displayView[11] = pondBounds.yMax;
    displayView[12] = throwBounds.xMin;
    displayView[13] = throwBounds.xMax;
    displayView[14] = throwBounds.yMin;
    displayView[15] = throwBounds.yMax;
    displayView[16] = mriEnabled ? (mriFrozen ? 1 : 0) : pondGain;
    displayView[17] = mriEnabled ? 0 : throwGain;
    displayView[18] = cone ? 1 : 0;
    displayView[19] = FLASHLIGHT_HALF_ANGLE;
    displayView[20] = cone?.apexX ?? 0;
    displayView[21] = cone?.apexY ?? 0;
    displayView[22] = cone?.directionX ?? 0;
    displayView[23] = cone?.directionY ?? 0;
    displayView[24] = cone?.range ?? 0;
    displayView[25] = 0.04;
    displayView[26] = cssWidth;
    displayView[27] = cssHeight;
    displayView[28] = mriEnabled && mriFrozen ? 1 : 0;
    displayView[29] = slice.zCamera;
    displayView[30] = slice.sliceHalf;
    displayView[31] = mriEnabled ? slice.zoom : cone ? AIMING_POND_ZOOM : 1;
    device.queue.writeBuffer(displayViewBuffer, 0, displayView);
    const encoder = device.createCommandEncoder({ label: "orbit-draw" });
    if (sourceCount > 0 && !paused && (!mriEnabled || !mriFrozen)) {
      const compute = encoder.beginComputePass();
      compute.setPipeline(computePipeline);
      compute.setBindGroup(0, computeBind);
      compute.dispatchWorkgroups(Math.ceil(sourceCount / 64));
      compute.end();
    }
    const pondDestination = pondTextures[1 - pondIndex];
    const throwDestination = throwTextures[1 - throwIndex];
    const throwLineDestination = throwLineTextures[1 - throwIndex];
    if (layer === "pond") {
      const fade = encoder.beginRenderPass({ colorAttachments: [{ view: pondDestination.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      fade.setPipeline(fadePipeline);
      fade.setBindGroup(0, pondFadeBinds[pondIndex]);
      fade.draw(3);
      fade.end();
    } else {
      const fade = encoder.beginRenderPass({ colorAttachments: [{ view: throwDestination.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      fade.setPipeline(fadePipeline);
      fade.setBindGroup(0, throwFadeBinds[throwIndex]);
      fade.draw(3);
      fade.end();
      const lineFade = encoder.beginRenderPass({ colorAttachments: [{ view: throwLineDestination.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      lineFade.setPipeline(lineFadePipeline);
      lineFade.setBindGroup(0, throwLineFadeBinds[throwIndex]);
      lineFade.draw(3);
      lineFade.end();
    }
    const live = encoder.beginRenderPass({ colorAttachments: [{ view: liveTexture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    live.end();
    const liveLinesClear = encoder.beginRenderPass({ colorAttachments: [{ view: liveLineTexture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    liveLinesClear.end();
    if (sourceCount > 0 && !paused && (!mriEnabled || !mriFrozen)) {
      const layerDestination = layer === "pond" ? pondDestination : throwDestination;
      const layerPoints = encoder.beginRenderPass({ colorAttachments: [{ view: layerDestination.createView(), loadOp: "load", storeOp: "store" }] });
      layerPoints.setPipeline(pointPipeline);
      layerPoints.setBindGroup(0, pointAtlasBind);
      layerPoints.setVertexBuffer(0, vertexBuffer);
      layerPoints.drawIndirect(indirectBuffer, 0);
      layerPoints.end();
      if (mriEnabled && !mriFrozen) {
        const mriCapture = encoder.beginRenderPass({ colorAttachments: [{ view: mriTexture.createView(), loadOp: "load", storeOp: "store" }] });
        mriCapture.setPipeline(pointPipeline);
        mriCapture.setBindGroup(0, pointAtlasBind);
        mriCapture.setVertexBuffer(0, vertexBuffer);
        mriCapture.drawIndirect(indirectBuffer, 0);
        mriCapture.end();
      }
      const livePoints = encoder.beginRenderPass({ colorAttachments: [{ view: liveTexture.createView(), loadOp: "load", storeOp: "store" }] });
      livePoints.setPipeline(pointPipeline);
      livePoints.setBindGroup(0, pointBind);
      livePoints.setVertexBuffer(0, vertexBuffer);
      livePoints.drawIndirect(indirectBuffer, 0);
      livePoints.end();
      const liveLines = encoder.beginRenderPass({ colorAttachments: [{ view: liveLineTexture.createView(), loadOp: "load", storeOp: "store" }] });
      liveLines.setPipeline(linePipeline);
      liveLines.setBindGroup(0, lineBind);
      liveLines.drawIndirect(lineIndirectBuffer, 0);
      liveLines.end();
      if (layer === "throw" && drawLines) {
        const persistentLinePass = encoder.beginRenderPass({ colorAttachments: [{ view: throwLineDestination.createView(), loadOp: "load", storeOp: "store" }] });
        persistentLinePass.setPipeline(linePipeline);
        persistentLinePass.setBindGroup(0, lineAtlasBind);
        persistentLinePass.drawIndirect(lineIndirectBuffer, 0);
        persistentLinePass.end();
      }
    }
    if (layer === "pond") {
      pondIndex = 1 - pondIndex;
    } else {
      throwIndex = 1 - throwIndex;
    }
    const display = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    display.setPipeline(displayPipeline);
    display.setBindGroup(0, displayBinds[pondIndex * 2 + throwIndex]);
    display.draw(3);
    display.end();
    device.queue.submit([encoder.finish()]);
    if (mriEnabled && !mriFrozen && sourceCount > 0 && now - mriWarmupStartedAt >= MRI_PREITERATE_MS) {
      mriFrozen = true;
      mriLoopStartedAt = now;
    }
    scheduleDraw();
  }
  scheduleDraw();

  return {
    spawn(points, skipIndex, cap = MAX_SOURCES) {
      paused = false;
      const states = new Float32Array(points.length * 12);
      const uintStates = new Uint32Array(states.buffer);
      points.forEach((point, index) => {
        const offset = index * 12;
        states[offset + 2] = point.x;
        states[offset + 3] = point.y;
        states[offset + 4] = skipIndex;
        uintStates[offset + 7] = 1;
      });
      const slot = allocateSources(nextSource, sourceCount, points.length, cap);
      device.queue.writeBuffer(stateBuffer, slot.start * 48, states.buffer, states.byteOffset, states.byteLength);
      nextSource = slot.nextSource;
      sourceCount = slot.sourceCount;
    },
    spawnAppend(points, skipIndex, cap = MAX_SOURCES) {
      paused = false;
      const slot = allocateSourcesAppend(sourceCount, points.length, cap);
      if (slot.added <= 0) {
        this.spawn(points, skipIndex, cap);
        return points.length;
      }
      const batch = points.slice(0, slot.added);
      const states = new Float32Array(batch.length * 12);
      const uintStates = new Uint32Array(states.buffer);
      batch.forEach((point, index) => {
        const offset = index * 12;
        states[offset + 2] = point.x;
        states[offset + 3] = point.y;
        states[offset + 4] = skipIndex;
        uintStates[offset + 7] = 1;
      });
      device.queue.writeBuffer(stateBuffer, slot.start * 48, states.buffer, states.byteOffset, states.byteLength);
      nextSource = slot.nextSource;
      sourceCount = slot.sourceCount;
      return slot.added;
    },
    setView(nextView) {
      view = { ...nextView };
    },
    setTuning(tuning) {
      maxDepth = tuning.maxDepth;
      accelerationMultiplier = tuning.acceleration;
      linePersist = tuning.linePersist;
      skipColors = tuning.skipColors === true;
      rotateRight = tuning.rotateRight === true;
      const nextDoublePixels = tuning.doublePixels === true;
      if (nextDoublePixels !== doublePixels) {
        doublePixels = nextDoublePixels;
        resize();
      }
    },
    setRarity(tint, strength) {
      rarityTint = [tint[0] / 255, tint[1] / 255, tint[2] / 255];
      rarityStrength = Math.max(0, Math.min(1, strength));
    },
    setIterationBoost(multiplier) {
      iterationBoost = Math.max(1, Number.isFinite(multiplier) ? multiplier : 1);
    },
    setAtmosphere(atmosphere) {
      drawLines = atmosphere.drawLines;
      grayscale = atmosphere.grayscale;
      pointEnergy = atmosphere.energy;
      hiddenSteps = atmosphere.hiddenSteps;
      liveGain = atmosphere.liveGain;
      contrast = atmosphere.contrast;
      pondPersist = atmosphere.pondPersist ?? 0;
    },
    setLayer(nextLayer) {
      layer = nextLayer;
    },
    setDisplay(next) {
      pondGain = next.pondGain;
      throwGain = next.throwGain;
      cone = next.cone;
      cssWidth = next.cssWidth;
      cssHeight = next.cssHeight;
      const nextMriEnabled = next.mri === true;
      if (nextMriEnabled && !mriEnabled) {
        mriFrozen = false;
        mriWarmupStartedAt = performance.now();
        mriLoopStartedAt = 0;
        if (mriTexture) {
          const encoder = device.createCommandEncoder({ label: "mri-capture-reset" });
          clearTextures(encoder, [mriTexture]);
          device.queue.submit([encoder.finish()]);
        }
      } else if (!nextMriEnabled) {
        mriFrozen = false;
        mriWarmupStartedAt = 0;
        mriLoopStartedAt = 0;
      }
      mriEnabled = nextMriEnabled;
    },
    beginThrow(nextView, nextCssWidth, nextCssHeight, nextRotateRight) {
      view = { ...nextView };
      throwBounds = mathBoundsForView(nextView, nextCssWidth, nextCssHeight, nextRotateRight);
      layer = "throw";
      this.clear();
    },
    clearPond() {
      if (!pondTextures.length) return;
      const encoder = device.createCommandEncoder({ label: "orbit-clear-pond" });
      clearTextures(encoder, pondTextures);
      device.queue.submit([encoder.finish()]);
    },
    clear() {
      paused = false;
      sourceCount = 0;
      nextSource = 0;
      device.queue.writeBuffer(stateBuffer, 0, new Uint8Array(MAX_SOURCES * 48));
      if (!throwTextures.length) return;
      const encoder = device.createCommandEncoder({ label: "orbit-clear-throw" });
      clearTextures(encoder, throwTextures);
      clearTextures(encoder, throwLineTextures);
      clearTextures(encoder, [liveTexture, liveLineTexture].filter(Boolean));
      device.queue.submit([encoder.finish()]);
    },
    freeze() {
      paused = true;
    },
    isMriReady() {
      return mriEnabled && mriFrozen;
    },
    setSuspended(value: boolean) {
      suspended = value;
      if (!value) scheduleDraw();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      pondTextures.forEach((texture) => texture.destroy());
      throwTextures.forEach((texture) => texture.destroy());
      throwLineTextures.forEach((texture) => texture.destroy());
      liveTexture?.destroy();
      liveLineTexture?.destroy();
      mriTexture?.destroy();
      vertexBuffer.destroy();
      lineSegmentBuffer.destroy();
      stateBuffer.destroy();
      indirectBuffer.destroy();
      lineIndirectBuffer.destroy();
      paramsBuffer.destroy();
      paramsAtlasBuffer.destroy();
      styleBuffer.destroy();
      sliceBuffer.destroy();
      fadeBuffer.destroy();
      lineFadeBuffer.destroy();
      displayViewBuffer.destroy();
    },
  };
}

export default function MandelbrotSkipping() {
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrbitEngine | null>(null);
  const gameAudioRef = useRef<GameAudio | null>(null);
  const gpuPromiseRef = useRef<Promise<GpuContext | null> | null>(null);
  const viewRef = useRef<ViewTransform>({ centerX: INTRO_POND_CENTER.x, centerY: INTRO_POND_CENTER.y, halfY: INTRO_VIEW_HALF_Y });
  const restartRef = useRef<() => void>(() => {});
  const applyViewRef = useRef<(nextView: ViewTransform) => void>(() => {});
  const playerNameRef = useRef("YOU");
  const [progression, setProgression] = useState<ProgressionState>(freshProgression);
  const progressionRef = useRef<ProgressionState>(progression);
  const [challengeToast, setChallengeToast] = useState<string | null>(null);
  const stoneRef = useRef<StoneDef>(stoneById(progression.equippedId));
  const tuningRef = useRef<Tuning>({ ...DEFAULT_TUNING });
  const invalidateFlashlightRef = useRef<() => void>(() => {});
  const invalidateGridRef = useRef<() => void>(() => {});
  const introActiveRef = useRef(false);
  const introThrowsRef = useRef(0);
  const introFadingRef = useRef(false);
  const endOpeningRef = useRef<() => void>(() => {});
  const resetBuddhabrotFadeRef = useRef<() => void>(() => {});
  const currentShareRef = useRef<SharedThrow | null>(null);
  const pendingShareRef = useRef<SharedThrow | null | undefined>(undefined);
  const playThrowRef = useRef<((shot: SharedThrow, fromLink?: boolean) => void) | null>(null);
  const spectatorRef = useRef(false);
  const savedTuningRef = useRef<Tuning | null>(null);
  const throwAgainRef = useRef<() => void>(() => {});
  const introExitTimerRef = useRef(0);
  const [intro, setIntro] = useState(false);
  const [introFading, setIntroFading] = useState(false);
  const [pondReady, setPondReady] = useState(false);
  const [hasShare, setHasShare] = useState(false);
  const [watchingShare, setWatchingShare] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [replayName, setReplayName] = useState("YOU");
  const [shareStatus, setShareStatus] = useState("");
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud>({ phase: "ready", score: 0, skips: 0, deepest: 0, progress: 0, coverage: 0, spread: 0 });
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState("YOU");
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [tuning, setTuning] = useState<Tuning>({ ...DEFAULT_TUNING });
  const [railOpen, setRailOpen] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setScores(loadScores()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setLightMode(window.localStorage.getItem(THEME_KEY) === "light"); } catch { /* dark mode still works */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!challengeToast) return;
    const timer = window.setTimeout(() => setChallengeToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [challengeToast]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = loadTuning();
      tuningRef.current = saved;
      setTuning(saved);
      engineRef.current?.setTuning(saved);
      const savedProgression = loadProgression(CHALLENGE_IDS);
      progressionRef.current = savedProgression;
      setProgression(savedProgression);
      const stone = stoneById(savedProgression.equippedId);
      stoneRef.current = stone;
      engineRef.current?.setTuning(clampTuningToStone(saved, stone));
      engineRef.current?.setRarity(stone.tint, stone.tintStrength);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const canvas = gpuCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    // Assigned synchronously so the Buddhabrot boot effect can await the
    // same acquisition instead of racing it.
    const acquisition = acquireGpu(setGpuError);
    gpuPromiseRef.current = acquisition;
    acquisition.then(async (acquired) => {
      if (!acquired) return;
      if (cancelled) {
        acquired.destroy();
        return;
      }
      const engine = await createOrbitEngine(canvas, acquired, introActiveRef.current);
      if (cancelled) {
        engine?.destroy();
        return;
      }
      engineRef.current = engine;
      engine?.setView(viewRef.current);
      if (introActiveRef.current) {
        engine?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH, doublePixels: true });
        engine?.setRarity([255, 255, 255], 0);
        engine?.setAtmosphere(INTRO_ATMOSPHERE);
        engine?.setLayer("pond");
        engine?.setDisplay({ ...displayLayerGains("intro"), cone: null, cssWidth: 1, cssHeight: 1 });
      } else {
        engine?.setTuning(clampTuningToStone(tuningRef.current, stoneRef.current));
        engine?.setRarity(stoneRef.current.tint, stoneRef.current.tintStrength);
        engine?.setAtmosphere(PLAY_ATMOSPHERE);
        engine?.setLayer("throw");
        engine?.setDisplay({ ...displayLayerGains("play"), cone: null, cssWidth: 1, cssHeight: 1 });
      }
    }).catch(() => setGpuError("Orbit renderer could not start. Throwing remains playable."));
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
      gpuPromiseRef.current = null;
      void acquisition.then((acquired) => acquired?.destroy()).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const share = initialThrowShare(window.location, navigation?.type);
    pendingShareRef.current = share;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPondReady(true);
    if (share || reduceMotion) return;
    introActiveRef.current = true;
    spectatorRef.current = true;
    introThrowsRef.current = 0;
    introFadingRef.current = false;
    setIntro(true);
  }, []);

  const finishOpening = useCallback(() => {
    if (introFadingRef.current) return;
    introFadingRef.current = true;
    setIntroFading(true);
    gameAudioRef.current?.playStart();
    introExitTimerRef.current = window.setTimeout(() => {
      introExitTimerRef.current = 0;
      introActiveRef.current = false;
      spectatorRef.current = false;
      introThrowsRef.current = 0;
      introFadingRef.current = false;
      engineRef.current?.setSuspended(false);
      engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
      engineRef.current?.setLayer("throw");
      engineRef.current?.setDisplay({ ...displayLayerGains("play"), cone: null, cssWidth: 1, cssHeight: 1 });
      engineRef.current?.setTuning(tuningRef.current);
      applyViewRef.current({ centerX: POND_CENTER.x, centerY: POND_CENTER.y, halfY: VIEW_HALF_Y });
      restartRef.current();
      setIntro(false);
      setIntroFading(false);
    }, INTRO_PLAY_EXIT_MS);
  }, []);
  endOpeningRef.current = finishOpening;

  useEffect(() => {
    if (!pondReady || intro) return;
    const shot = pendingShareRef.current;
    if (!shot) return;
    let timer = 0;
    const attempt = () => {
      if (pendingShareRef.current !== shot) return;
      if (!playThrowRef.current) {
        timer = window.setTimeout(attempt, 50);
        return;
      }
      pendingShareRef.current = null;
      playThrowRef.current(shot, true);
    };
    timer = window.setTimeout(attempt, 400);
    return () => window.clearTimeout(timer);
  }, [pondReady, intro]);

  const renameCurrent = useCallback((name: string) => {
    const clean = name.toUpperCase().replace(/[^A-Z0-9 _-]/g, "").slice(0, 12);
    playerNameRef.current = clean;
    setPlayerName(clean);
    if (currentShareRef.current) {
      currentShareRef.current = { ...currentShareRef.current, name: clean || "YOU" };
    }
    setReplayName(clean || "YOU");
    const id = currentResultId;
    if (!id) return;
    setScores((previous) => {
      const next = previous.map((entry) => entry.id === id ? { ...entry, name: clean || "YOU" } : entry);
      storeScores(next);
      return next;
    });
  }, [currentResultId]);

  const updateTuning = useCallback((patch: Partial<Tuning>) => {
    const next = sanitizeTuning({ ...tuningRef.current, ...patch });
    tuningRef.current = next;
    setTuning(next);
    storeTuning(next);
    engineRef.current?.setTuning(clampTuningToStone(next, stoneRef.current));
    invalidateGridRef.current();
    invalidateFlashlightRef.current();
  }, []);

  const applyProgression = useCallback((next: ProgressionState) => {
    progressionRef.current = next;
    setProgression(next);
    storeProgression(next);
    const stone = stoneById(next.equippedId);
    stoneRef.current = stone;
    engineRef.current?.setTuning(clampTuningToStone(tuningRef.current, stone));
    engineRef.current?.setRarity(stone.tint, stone.tintStrength);
  }, []);

  const buyStone = useCallback((stoneId: string) => {
    const bought = buyProgression(progressionRef.current, stoneId);
    if (bought === progressionRef.current) return;
    applyProgression(equipProgression(bought, stoneId));
  }, [applyProgression]);

  const equipStone = useCallback((stoneId: string) => {
    applyProgression(equipProgression(progressionRef.current, stoneId));
  }, [applyProgression]);

  const toggleTheme = () => {
    setLightMode((previous) => {
      const next = !previous;
      try { window.localStorage.setItem(THEME_KEY, next ? "light" : "dark"); } catch { /* theme still toggles for this visit */ }
      return next;
    });
  };

  useEffect(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let phase: Phase = "ready";
    let pointerId = -1;
    let pointerMode: "none" | "aim" | "pan" = "none";
    let panOrigin = { x: 0, y: 0 };
    let panView: ViewTransform = { ...viewRef.current };
    let pull = { x: 0, y: 0 };
    let shotId = 0;
    let shapeOffset = 0;
    let resolveStarted = 0;
    let lastHud = 0;
    let rock = { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, spin: 0, skips: 0, bounceAge: 10 };
    let plannedSkips = MIN_SKIPS;
    let collectable: Collectable | null = null;
    let collectableHitCount = 0;
    let boostMultiplier = 1;
    let depthSurge = false;
    let impacts: Array<{ cr: number; ci: number; born: number; index: number; glyph: number }> = [];
    let ripples: Array<{ cr: number; ci: number; born: number; index: number; lifetime?: number; maxRadius?: number }> = [];
    let orbitScores: OrbitScore[] = [];
    const gameAudio = createGameAudio();
    gameAudioRef.current = gameAudio;
    function unlockIntroAudio() {
      if (!introActiveRef.current || introFadingRef.current) return;
      gameAudio.init();
    }
    if (introActiveRef.current) unlockIntroAudio();
    window.addEventListener("pointerdown", unlockIntroAudio);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gridCanvas = document.createElement("canvas");
    const gridContext = gridCanvas.getContext("2d");
    let gridDirty = true;
    const flashlightCanvas = document.createElement("canvas");
    const flashlightContext = flashlightCanvas.getContext("2d");
    const previewCanvas = document.createElement("canvas");
    const previewContext = previewCanvas.getContext("2d");
    let flashlightDirty = true;
    let buddhabrotSource: CanvasImageSource | null = null;
    let introRocks: FlyingRock[] = [];
    let lastIntroLaunch = 0;
    let lastIntroBackground = 0;
    let buddhabrotIntroFadeStarted = 0;
    let buddhabrotSlingFadeStarted = 0;
    let buddhabrotShadeFadeStarted = 0;
    let buddhabrotBackgroundRevealed = false;
    let previewKey = "";
    let hasThrown = false;
    let liveBuddhabrot: {
      generator: ReturnType<typeof createBuddhabrotGenerator>;
      canvas: OffscreenCanvas;
      context: any;
      ready: boolean;
    } | null = null;
    let liveBuddhabrotStarting = false;

    resetBuddhabrotFadeRef.current = () => {
      buddhabrotIntroFadeStarted = 0;
      buddhabrotSlingFadeStarted = 0;
      buddhabrotShadeFadeStarted = 0;
      buddhabrotBackgroundRevealed = true;
    };
    invalidateFlashlightRef.current = () => { flashlightDirty = true; };
    invalidateGridRef.current = () => { gridDirty = true; };

    let flashlightLoadCancelled = false;
    void (async () => {
      try {
        const size = selectTextureSize(window);
        const store = indexedDbStore(indexedDB);
        const cached = await readCachedTexture(size, store);
        if (cached) {
          if (flashlightLoadCancelled) return;
          buddhabrotSource = await createImageBitmap(cached);
          flashlightDirty = true;
          return;
        }
        const gpu = await gpuPromiseRef.current;
        if (!gpu || flashlightLoadCancelled) return;
        const generator = createBuddhabrotGenerator(gpu, { size });
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (flashlightLoadCancelled) {
              generator.destroy();
              resolve();
              return;
            }
            generator.step(1 / 60);
            if (generator.isComplete()) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        if (flashlightLoadCancelled) {
          generator.destroy();
          return;
        }
        const { bitmap, blobPromise } = await generator.toBitmapAndBlob();
        generator.destroy();
        if (flashlightLoadCancelled) {
          bitmap.close();
          return;
        }
        buddhabrotSource = bitmap;
        flashlightDirty = true;
        const blob = await blobPromise;
        if (blob && !flashlightLoadCancelled) await writeCachedTexture(size, blob, store);
      } catch {
        // Aiming still shows live cone points without a cached nebula.
      }
    })();

    function anchor() { return { x: width * 0.5, y: height * 0.82 }; }
    function minDimension() { return Math.min(width, height); }
    function pondScale() { return zoomPixelScale(minDimension(), viewRef.current.halfY); }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridCanvas.width = Math.round(width * dpr);
      gridCanvas.height = Math.round(height * dpr);
      gridContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridDirty = true;
      flashlightCanvas.width = Math.round(width * dpr);
      flashlightCanvas.height = Math.round(height * dpr);
      flashlightContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
      flashlightDirty = true;
      previewCanvas.width = Math.round(width * dpr);
      previewCanvas.height = Math.round(height * dpr);
      previewContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
      previewKey = "";
      if (phase === "ready" || phase === "aiming" || phase === "result") {
        const a = anchor();
        rock.x = a.x;
        rock.y = a.y;
        if (phase !== "aiming") pull = { ...a };
      }
    }

    function updateHud(force = false) {
      const now = performance.now();
      if (!force && now - lastHud < 33) return;
      const deepest = orbitScores.reduce((best, orbit) => Math.max(best, orbit.shownDepth), 0);
      const score = orbitScores.reduce((sum, orbit) => sum + scoreForOrbit(orbit, orbit.shownDepth) * orbit.boost, 0);
      const coverage = orbitScores.reduce((sum, orbit) => sum + orbit.distinct, 0);
      const spread = orbitScores.length
        ? orbitScores.reduce((sum, orbit) => sum + orbitShape(orbit).spread, 0) / orbitScores.length
        : 0;
      const resolvedRatio = orbitScores.length ? orbitScores.filter((orbit) => orbit.resolved).length / orbitScores.length : 0;
      const depthRatio = orbitScores.length ? orbitScores.reduce((sum, orbit) => sum + Math.min(1, orbit.shownDepth / stoneTuning().maxDepth), 0) / orbitScores.length : 0;
      const progress = resolvedRatio * 0.8 + depthRatio * 0.2;
      setHud({ phase, score, skips: rock.skips, deepest, progress, coverage, spread });
      lastHud = now;
    }

    function recordOrbitCell(orbit: OrbitScore) {
      if (orbit.depth <= HIDDEN_INITIAL_STEPS || orbit.depth % SCORE_SAMPLE_STRIDE !== 0) return;
      const ux = (orbit.zr - POND_CENTER.x) / SCORE_HALF_X * 0.5 + 0.5;
      const uy = (orbit.zi - POND_CENTER.y) / SCORE_HALF_Y * 0.5 + 0.5;
      if (ux < 0 || ux >= 1 || uy < 0 || uy >= 1) return;
      const gx = Math.min(COVERAGE_GRID - 1, Math.floor(ux * COVERAGE_GRID));
      const gy = Math.min(COVERAGE_GRID - 1, Math.floor(uy * COVERAGE_GRID));
      const cell = gy * COVERAGE_GRID + gx;
      const word = cell >>> 5;
      const mask = 1 << (cell & 31);
      if ((orbit.cells[word] & mask) !== 0) return;
      orbit.cells[word] |= mask;
      orbit.distinct += 1;
      orbit.sumX += gx;
      orbit.sumY += gy;
      orbit.sumXX += gx * gx;
      orbit.sumYY += gy * gy;
      orbit.sumXY += gx * gy;
    }

    function stoneTuning(): Tuning {
      if (spectatorRef.current) return tuningRef.current;
      const clamped = clampTuningToStone(tuningRef.current, stoneRef.current);
      if (!depthSurge) return clamped;
      return { ...clamped, maxDepth: surgedDepth(clamped.maxDepth) };
    }

    function resetRound() {
      shotId += 1;
      phase = "ready";
      pointerId = -1;
      pointerMode = "none";
      impacts = [];
      ripples = [];
      orbitScores = [];
      introRocks = [];
      lastIntroLaunch = 0;
      lastIntroBackground = 0;
      shapeOffset = Math.floor(Math.random() * GLYPH_COUNT);
      gameAudio.reset();
      const a = anchor();
      pull = { ...a };
      rock = { x: a.x, y: a.y, vx: 0, vy: 0, z: 0, vz: 0, spin: 0, skips: 0, bounceAge: 10 };
      collectable = spectatorRef.current || introActiveRef.current
        ? null
        : rollCollectable(Math.random, width, height);
      collectableHitCount = 0;
      boostMultiplier = 1;
      depthSurge = false;
      setCurrentResultId(null);
      engineRef.current?.clear();
      engineRef.current?.setIterationBoost(1);
      engineRef.current?.setTuning(stoneTuning());
      flashlightDirty = true;
      updateHud(true);
    }
    restartRef.current = resetRound;

    function launchRock(angle: number, rawPower: number) {
      if (!introActiveRef.current) {
        engineRef.current?.beginThrow(viewRef.current, width, height, tuningRef.current.rotateRight);
        engineRef.current?.setTuning(stoneTuning());
        engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
        engineRef.current?.setLayer("throw");
      }
      const a = anchor();
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const power = rawPower * rawPower * (3 - 2 * rawPower);
      const speed = pondScale() * (0.32 + 0.56 * power);
      const launchPull = pondScale() * SLING_THROW_PULL_RATIO * rawPower;
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      pull = { x: a.x - dx * maxPull * rawPower, y: a.y - dy * maxPull * rawPower };
      rock.x = a.x - dx * launchPull;
      rock.y = a.y - dy * launchPull;
      rock.vx = dx * speed;
      rock.vy = dy * speed;
      rock.vz = pondScale() * (0.38 + 0.20 * power);
      rock.z = 1;
      rock.spin = 0;
      rock.skips = 0;
      rock.bounceAge = 10;
      phase = "flying";
      hasThrown = true;
      if (!introActiveRef.current) {
        gameAudio.init();
        gameAudio.throwStart(rawPower);
      }
      flashlightDirty = true;
      updateHud(true);
    }

    function playSharedThrow(shot: SharedThrow, fromLink = false) {
      spectatorRef.current = true;
      if (fromLink) setWatchingShare(true);
      setReplayMode(true);
      setReplayName(shot.name || "YOU");
      currentShareRef.current = shot;
      setHasShare(true);
      if (!savedTuningRef.current) savedTuningRef.current = loadTuning();
      const next = sanitizeTuning({
        ...tuningRef.current,
        rotateRight: shot.rotateRight,
        sourceDots: shot.sourceDots,
      });
      tuningRef.current = next;
      setTuning(next);
      engineRef.current?.setTuning(next);
      invalidateGridRef.current();
      invalidateFlashlightRef.current();
      applyView(shot.view);
      resetRound();
      shapeOffset = shot.glyph;
      shotId = shot.seed;
      plannedSkips = shot.skips;
      launchRock(shot.angle, shot.power);
    }
    playThrowRef.current = playSharedThrow;
    applyViewRef.current = applyView;

    function spawnImpact(x: number, y: number, index: number, glyphOffset: number, now: number, extras?: { gpu?: boolean; ripple?: boolean }) {
      const mapped = screenToComplex(x, y, width, height, viewRef.current, tuningRef.current.rotateRight);
      const source = { x: Math.fround(mapped.x), y: Math.fround(mapped.y) };
      const glyph = spectatorRef.current || introActiveRef.current
        ? (glyphOffset + index - 1) % GLYPH_COUNT
        : stoneRef.current.shapeIndex;
      const dots = introActiveRef.current ? INTRO_SOURCE_DOTS : stoneTuning().sourceDots;
      const sources = impactSources(
        x, y, width, height, viewRef.current, dots, glyph, tuningRef.current.rotateRight,
      );
      const gpu = extras?.gpu ?? !introActiveRef.current;
      const ripple = extras?.ripple ?? !introActiveRef.current;
      if (ripple) ripples.push({ cr: source.x, ci: source.y, born: now, index });
      if (!introActiveRef.current) {
        impacts.push({ cr: source.x, ci: source.y, born: now, index, glyph });
        for (const orbitSource of sources) {
          orbitScores.push({
            zr: 0, zi: 0,
            cr: orbitSource.x, ci: orbitSource.y, depth: 0, shownDepth: 0,
            skip: index, glyph, stepDistance: 0, distanceContraction: 0, resolved: false, score: 0,
            boost: boostMultiplier,
            offscreenStreak: 0, tinyHopStreak: 0,
            cells: new Uint32Array(COVERAGE_WORDS), distinct: 0,
            sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0,
          });
        }
      }
      if (gpu) engineRef.current?.spawnAppend(sources, index);
      if (!introActiveRef.current) {
        gameAudio.splash(index, glyph % GLYPH_COUNT, width > 0 ? x / width * 2 - 1 : 0);
        if ("vibrate" in navigator) navigator.vibrate?.(12);
      }
      updateHud(true);
    }

    function startResolving(now: number) {
      if (phase === "resolving" || phase === "result") return;
      phase = "resolving";
      resolveStarted = now;
      updateHud(true);
    }

    function finishRound() {
      if (phase === "result") return;
      phase = "result";
      if (!introActiveRef.current) engineRef.current?.freeze();
      orbitScores.forEach((orbit) => {
        if (!orbit.resolved) {
          orbit.resolved = true;
          orbit.score = scoreForOrbit(orbit, orbit.depth) * orbit.boost;
        }
        orbit.shownDepth = orbit.depth;
      });
      const baseScore = orbitScores.reduce((sum, orbit) => sum + orbit.score, 0);
      const total = baseScore;
      const deepest = orbitScores.reduce((best, orbit) => Math.max(best, orbit.depth), 0);
      const coverage = orbitScores.reduce((sum, orbit) => sum + orbit.distinct, 0);
      const spread = orbitScores.length
        ? orbitScores.reduce((sum, orbit) => sum + orbitShape(orbit).spread, 0) / orbitScores.length
        : 0;
      const id = `${Date.now()}-${shotId}`;
      if (!spectatorRef.current) {
        setCurrentResultId(id);
        const entry: ScoreEntry = {
          id, name: playerNameRef.current || "YOU", score: total, deepest, skips: rock.skips,
          coverage, spread, createdAt: new Date().toISOString(),
        };
        setScores((previous) => {
          const next = [...previous, entry]
            .sort((a, b) => b.score - a.score || b.deepest - a.deepest || a.createdAt.localeCompare(b.createdAt))
            .slice(0, 10);
          storeScores(next);
          return next;
        });
      } else {
        setCurrentResultId(null);
      }
      if (currentShareRef.current) {
        history.replaceState(null, "", throwShareUrl(window.location.href, currentShareRef.current));
      }
      if (!spectatorRef.current && !introActiveRef.current) {
        const summary: ThrowSummary = {
          score: total, skips: rock.skips, deepest, coverage,
          collectablesHit: collectableHitCount,
        };
        let nextProgression = updateProgressionStreak(progressionRef.current, collectableHitCount > 0);
        nextProgression = earnProgression(nextProgression, total);
        const earnedChallenges = evaluateChallenges(summary, nextProgression);
        nextProgression = completeProgressionChallenges(nextProgression, earnedChallenges);
        progressionRef.current = nextProgression;
        setProgression(nextProgression);
        storeProgression(nextProgression);
        if (earnedChallenges.length) {
          setChallengeToast(earnedChallenges
            .map((challenge) => `${challenge.label} +${formatCompact(challenge.bounty)}`)
            .join(" · "));
        }
      }
      setHud({ phase, score: total, skips: rock.skips, deepest, progress: 1, coverage, spread });
      const victoryDuration = gameAudio.finish(finishComplexity({
        score: total, deepest, coverage, skips: rock.skips,
      }));
      if (!introActiveRef.current) buddhabrotShadeFadeStarted = performance.now() + victoryDuration * 1000;
    }

    function advanceOrbits(now: number, elapsed: number) {
      const depthCap = stoneTuning().maxDepth;
      const ease = 1 - Math.exp(-elapsed / 0.055);
      const easeShownDepths = () => {
        for (const orbit of orbitScores) {
          const gap = orbit.depth - orbit.shownDepth;
          orbit.shownDepth = gap < 16 ? orbit.depth : Math.min(orbit.depth, orbit.shownDepth + Math.max(1, gap * ease));
        }
      };
      const active = orbitScores.filter((orbit) => !orbit.resolved);
      if (!active.length) {
        easeShownDepths();
        const caughtUp = orbitScores.every((orbit) => orbit.depth - orbit.shownDepth < 16);
        if (phase === "resolving" && now - resolveStarted > 250 && caughtUp) finishRound();
        else updateHud();
        return;
      }
      const maxPerOrbit = Math.max(1, Math.floor(POINT_BUDGET / Math.max(orbitScores.length, 1)));
      const view = viewRef.current;
      const rotateRight = tuningRef.current.rotateRight;
      const maxHopPx = Math.hypot(width, height) * MAX_HOP_SCREEN_MULTIPLIER;
      for (const orbit of orbitScores) {
        if (orbit.resolved) continue;
        const perOrbit = acceleratedSteps(orbit.depth, depthCap, maxPerOrbit, tuningRef.current.acceleration);
        for (let step = 0; step < perOrbit && orbit.depth < depthCap; step++) {
          const previousR = orbit.zr;
          const previousI = orbit.zi;
          const nextR = Math.fround(Math.fround(previousR * previousR - previousI * previousI) + orbit.cr);
          const nextI = Math.fround(Math.fround(2 * previousR * previousI) + orbit.ci);
          const distance = Math.hypot(nextR - previousR, nextI - previousI);
          if (Number.isFinite(distance)) {
            const previousDistance = orbit.stepDistance || distance;
            const contraction = Math.max(-4, Math.min(4,
              Math.log2(Math.max(previousDistance, 1e-12) / Math.max(distance, 1e-12)),
            ));
            orbit.distanceContraction = orbit.distanceContraction * .82 + contraction * .18;
            orbit.stepDistance = previousDistance * .82 + distance * .18;
          }
          orbit.zi = nextI;
          orbit.zr = nextR;
          orbit.depth += 1;
          recordOrbitCell(orbit);
          const previousClip = complexToClip(previousR, previousI, view, width, height, rotateRight);
          const clip = complexToClip(nextR, nextI, view, width, height, rotateRight);
          const hopPx = Math.hypot((clip.x - previousClip.x) * width * .5, (clip.y - previousClip.y) * height * .5);
          const onScreen = Math.abs(clip.x) <= 1.02 && Math.abs(clip.y) <= 1.02;
          const inAtlas = nextR >= TRAIL_BOUNDS.xMin && nextR <= TRAIL_BOUNDS.xMax
            && nextI >= TRAIL_BOUNDS.yMin && nextI <= TRAIL_BOUNDS.yMax;
          const end = updateOrbitEnd({
            magSq: nextR * nextR + nextI * nextI,
            hopPx,
            onScreen: onScreen || inAtlas,
            offscreenStreak: orbit.offscreenStreak,
            tinyHopStreak: orbit.tinyHopStreak,
            maxHopPx,
          });
          orbit.offscreenStreak = end.offscreenStreak;
          orbit.tinyHopStreak = end.tinyHopStreak;
          if (end.resolved) {
            orbit.resolved = true;
            break;
          }
        }
        if (orbit.depth >= depthCap) orbit.resolved = true;
        if (orbit.resolved) {
          orbit.shownDepth = orbit.depth;
          orbit.score = scoreForOrbit(orbit, orbit.depth) * orbit.boost;
        }
      }
      easeShownDepths();
      const allResolved = orbitScores.every((orbit) => orbit.resolved);
      const caughtUp = orbitScores.every((orbit) => orbit.depth - orbit.shownDepth < 16);
      if (phase === "resolving" && ((allResolved && caughtUp && now - resolveStarted > 250) || now - resolveStarted > 9000)) finishRound();
      else updateHud();
    }

    function simulate(dt: number, now: number) {
      if (phase !== "flying") return;
      const gravity = pondScale() * 1.65;
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.z += rock.vz * dt;
      rock.vz -= gravity * dt;
      const drag = Math.exp(-0.06 * dt);
      rock.vx *= drag;
      rock.vy *= drag;
      rock.spin += Math.hypot(rock.vx, rock.vy) * dt * 0.016;
      rock.bounceAge += dt;
      if (rock.z <= 0 && rock.vz < 0) {
        rock.z = 0;
        if (rock.x < 24 || rock.x > width - 24 || rock.y < 24 || rock.y > height - 24) {
          startResolving(now);
          return;
        }
        rock.skips += 1;
        rock.bounceAge = 0;
        spawnImpact(rock.x, rock.y, rock.skips, shapeOffset, now);
        if (collectable && collectableHit(collectable, rock.x, rock.y)) {
          const type = collectable.type;
          collectable = null;
          collectableHitCount += 1;
          if (type === "multiplier") boostMultiplier = COLLECTABLE_SCORE_MULTIPLIER;
          if (type === "extraSkips") plannedSkips = Math.min(MAX_SKIPS, plannedSkips + COLLECTABLE_EXTRA_SKIPS);
          if (type === "depthSurge") {
            depthSurge = true;
            engineRef.current?.setTuning(stoneTuning());
          }
          if ("vibrate" in navigator) navigator.vibrate?.(30);
        }
        const remaining = plannedSkips - rock.skips;
        rock.vz = Math.max(Math.abs(rock.vz) * 0.56, pondScale() * (0.05 + remaining * 0.008));
        rock.vx *= 0.79;
        rock.vy *= 0.79;
        const jitter = (makeRandom((shotId << 8) ^ rock.skips)() - 0.5) * Math.PI / 60;
        const cos = Math.cos(jitter);
        const sin = Math.sin(jitter);
        const vx = rock.vx * cos - rock.vy * sin;
        rock.vy = rock.vx * sin + rock.vy * cos;
        rock.vx = vx;
        if (remaining > 0) {
          const speed = Math.hypot(rock.vx, rock.vy);
          const minSpeed = pondScale() * 0.09;
          if (speed > 0 && speed < minSpeed) {
            rock.vx *= minSpeed / speed;
            rock.vy *= minSpeed / speed;
          }
        }
        if (rock.skips >= plannedSkips ||
          rock.x < -50 || rock.x > width + 50 || rock.y < -50 || rock.y > height + 50) {
          startResolving(now);
        }
      }
    }

    function throwIntroRock() {
      const origin = introLaunchOrigin(width, height);
      const angle = Math.atan2(height * 0.5 - origin.y, width * 0.5 - origin.x)
        + (Math.random() - 0.5) * 1.55;
      const rawPower = 0.48 + Math.random() * 0.42;
      const power = rawPower * rawPower * (3 - 2 * rawPower);
      const speed = pondScale() * (0.32 + 0.56 * power);
      const launchPull = pondScale() * SLING_THROW_PULL_RATIO * rawPower;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const throwIndex = introThrowsRef.current;
      introThrowsRef.current += 1;
      shotId = (shotId + 17) | 0;
      introRocks.push({
        x: origin.x - dx * launchPull,
        y: origin.y - dy * launchPull,
        vx: dx * speed,
        vy: dy * speed,
        vz: pondScale() * (0.38 + 0.20 * power),
        z: 1,
        spin: 0,
        skips: 0,
        bounceAge: 10,
        plannedSkips: 3,
        shotId,
        shapeOffset: throwIndex % GLYPH_COUNT,
        ripple: throwIndex % INTRO_ROCK_DRAW_EVERY === 0,
      });
    }

    function simulateIntroRocks(dt: number, now: number) {
      if (!introActiveRef.current || !introRocks.length) return;
      const gravity = pondScale() * 1.65;
      const next: FlyingRock[] = [];
      for (const body of introRocks) {
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.z += body.vz * dt;
        body.vz -= gravity * dt;
        const drag = Math.exp(-0.06 * dt);
        body.vx *= drag;
        body.vy *= drag;
        body.spin += Math.hypot(body.vx, body.vy) * dt * 0.016;
        body.bounceAge += dt;
        let alive = true;
        if (body.z <= 0 && body.vz < 0) {
          body.z = 0;
          if (body.x < 24 || body.x > width - 24 || body.y < 24 || body.y > height - 24) {
            alive = false;
          } else {
            body.skips += 1;
            body.bounceAge = 0;
            spawnImpact(body.x, body.y, body.skips, body.shapeOffset, now, {
              gpu: false,
              ripple: body.ripple,
            });
            const remaining = body.plannedSkips - body.skips;
            body.vz = Math.max(Math.abs(body.vz) * 0.56, pondScale() * (0.05 + remaining * 0.008));
            body.vx *= 0.79;
            body.vy *= 0.79;
            const jitter = (makeRandom((body.shotId << 8) ^ body.skips)() - 0.5) * Math.PI / 60;
            const cos = Math.cos(jitter);
            const sin = Math.sin(jitter);
            const vx = body.vx * cos - body.vy * sin;
            body.vy = body.vx * sin + body.vy * cos;
            body.vx = vx;
            if (remaining > 0) {
              const speed = Math.hypot(body.vx, body.vy);
              const minSpeed = pondScale() * 0.09;
              if (speed > 0 && speed < minSpeed) {
                body.vx *= minSpeed / speed;
                body.vy *= minSpeed / speed;
              }
            }
            if (body.skips >= body.plannedSkips ||
              body.x < -50 || body.x > width + 50 || body.y < -50 || body.y > height + 50) {
              alive = false;
            }
          }
        }
        if (alive) next.push(body);
      }
      introRocks = next;
    }

    function drawPrediction(a: { x: number; y: number }) {
      if (phase !== "aiming") return;
      const dx = a.x - pull.x;
      const dy = a.y - pull.y;
      const length = Math.hypot(dx, dy);
      if (length < 4) return;
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      const rawPower = Math.min(1, length / maxPull);
      const power = rawPower * rawPower * (3 - 2 * rawPower);
      const speed = pondScale() * (0.32 + 0.56 * power);
      const vx = dx / length * speed;
      const vy = dy / length * speed;
      const vz = pondScale() * (0.38 + 0.20 * power);
      const gravity = pondScale() * 1.65;
      const airtime = 2 * vz / gravity;
      const launchPull = pondScale() * SLING_THROW_PULL_RATIO * rawPower;
      const launch = { x: a.x - dx / length * launchPull, y: a.y - dy / length * launchPull };
      const landing = { x: launch.x + vx * airtime, y: launch.y + vy * airtime };
      const curveLift = minDimension() * (.025 + power * .045);
      const control = {
        x: (rock.x + landing.x) * .5,
        y: (rock.y + landing.y) * .5 - curveLift,
      };
      ctx.save();
      const trajectory = ctx.createLinearGradient(rock.x, rock.y, landing.x, landing.y);
      trajectory.addColorStop(0, "rgba(255, 255, 255, .48)");
      trajectory.addColorStop(.52, "rgba(255, 255, 255, .30)");
      trajectory.addColorStop(.82, "rgba(255, 255, 255, .11)");
      trajectory.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = trajectory;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 9]);
      ctx.beginPath();
      ctx.moveTo(rock.x, rock.y);
      ctx.quadraticCurveTo(control.x, control.y, landing.x, landing.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function predictSkipImpacts(a: { x: number; y: number }) {
      const dx = a.x - pull.x;
      const dy = a.y - pull.y;
      const length = Math.hypot(dx, dy);
      if (length < 12) return [];
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      const rawPower = Math.min(1, length / maxPull);
      const power = rawPower * rawPower * (3 - 2 * rawPower);
      const speed = pondScale() * (0.32 + 0.56 * power);
      const launchPull = pondScale() * SLING_THROW_PULL_RATIO * rawPower;
      let x = a.x - dx / length * launchPull;
      let y = a.y - dy / length * launchPull;
      let vx = dx / length * speed;
      let vy = dy / length * speed;
      let vz = pondScale() * (0.38 + 0.20 * power);
      let z = 1;
      let skips = 0;
      const gravity = pondScale() * 1.65;
      const dt = 1 / 120;
      const PREVIEW_PREDICT_SKIPS = 3;
      const landings: Array<{ x: number; y: number; index: number; glyph: number }> = [];
      for (let step = 0; step < 120 * 20 && skips < PREVIEW_PREDICT_SKIPS; step++) {
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        vz -= gravity * dt;
        const drag = Math.exp(-0.06 * dt);
        vx *= drag;
        vy *= drag;
        if (z > 0 || vz >= 0) continue;
        z = 0;
        if (x < 24 || x > width - 24 || y < 24 || y > height - 24) break;
        skips += 1;
        landings.push({ x, y, index: skips, glyph: (shapeOffset + skips - 1) % GLYPH_COUNT });
        const remaining = PREVIEW_PREDICT_SKIPS - skips;
        vz = Math.max(Math.abs(vz) * 0.56, pondScale() * (0.05 + remaining * 0.008));
        vx *= 0.79;
        vy *= 0.79;
        if (remaining > 0) {
          const speed = Math.hypot(vx, vy);
          const minSpeed = pondScale() * 0.09;
          if (speed > 0 && speed < minSpeed) {
            vx *= minSpeed / speed;
            vy *= minSpeed / speed;
          }
        }
        if (skips >= PREVIEW_PREDICT_SKIPS) break;
        if (x < -50 || x > width + 50 || y < -50 || y > height + 50) break;
      }
      return landings;
    }

    const PREVIEW_BLUE: readonly [number, number, number] = [75, 175, 235];

    function drawPreviewOrbit(
      source: { x: number; y: number },
      startScreen: { x: number; y: number },
      view: ViewTransform,
      iterations: number,
      rgb: readonly [number, number, number],
      strength: number,
    ) {
      if (!previewContext || iterations <= 0) return;
      const rotateRight = tuningRef.current.rotateRight;
      const maxHopPx = Math.hypot(width, height) * MAX_HOP_SCREEN_MULTIPLIER;
      let zr = 0;
      let zi = 0;
      previewContext.lineWidth = 0.65;
      previewContext.lineJoin = "round";
      previewContext.lineCap = "round";
      for (let step = 0; step < iterations; step++) {
        const previousR = zr;
        const previousI = zi;
        const nextR = Math.fround(Math.fround(previousR * previousR - previousI * previousI) + source.x);
        const nextI = Math.fround(Math.fround(2 * previousR * previousI) + source.y);
        const previousClip = complexToClip(previousR, previousI, view, width, height, rotateRight);
        const clip = complexToClip(nextR, nextI, view, width, height, rotateRight);
        const hopPx = Math.hypot((clip.x - previousClip.x) * width * 0.5, (clip.y - previousClip.y) * height * 0.5);
        zr = nextR;
        zi = nextI;
        if (hopPx >= maxHopPx || !Number.isFinite(hopPx)) break;
        const depth = step / Math.max(1, iterations);
        const alpha = strength * Math.pow(1 - depth, 0.42);
        const pointAlpha = Math.min(0.55, alpha * 0.85);
        const to = complexToScreen(nextR, nextI, width, height, view, rotateRight);
        if (step === 0) {
          previewContext.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pointAlpha.toFixed(3)})`;
          previewContext.beginPath();
          previewContext.arc(startScreen.x, startScreen.y, 0.7, 0, TAU);
          previewContext.fill();
          continue;
        }
        const from = step === 1
          ? startScreen
          : complexToScreen(previousR, previousI, width, height, view, rotateRight);
        previewContext.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
        previewContext.beginPath();
        previewContext.moveTo(from.x, from.y);
        previewContext.lineTo(to.x, to.y);
        previewContext.stroke();
        previewContext.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pointAlpha.toFixed(3)})`;
        previewContext.beginPath();
        previewContext.arc(to.x, to.y, 0.7, 0, TAU);
        previewContext.fill();
      }
    }

    function rebuildAimOrbitPreview(a: { x: number; y: number }) {
      if (!previewContext) return;
      previewContext.clearRect(0, 0, width, height);
      const landings = predictSkipImpacts(a);
      if (!landings.length) return;
      const tuning = tuningRef.current;
      const view = viewRef.current;
      previewContext.globalCompositeOperation = "lighter";
      for (const landing of landings) {
        const skipIndex = landing.index;
        const iterations = Math.max(1, Math.floor(tuning.previewIterations / 2 ** (skipIndex - 1)));
        const strength = 0.32 / (1 + (skipIndex - 1) * 0.25);
        const source = screenToComplex(landing.x, landing.y, width, height, view, tuning.rotateRight);
        drawPreviewOrbit(source, landing, view, iterations, PREVIEW_BLUE, strength);
      }
    }

    function drawAimOrbitPreview(a: { x: number; y: number }) {
      if (phase !== "aiming" || !tuningRef.current.previewOrbits || !previewContext) return;
      const view = viewRef.current;
      const nextKey = [
        Math.round(pull.x),
        Math.round(pull.y),
        view.centerX.toFixed(5),
        view.centerY.toFixed(5),
        view.halfY.toFixed(5),
        tuningRef.current.previewIterations,
        tuningRef.current.rotateRight ? "1" : "0",
        width,
        height,
      ].join(":");
      if (nextKey !== previewKey) {
        previewKey = nextKey;
        rebuildAimOrbitPreview(a);
      }
      ctx.drawImage(previewCanvas, 0, 0, width, height);
    }

    function scientificStep(target: number) {
      const exponent = Math.floor(Math.log10(Math.max(target, Number.EPSILON)));
      const magnitude = 10 ** exponent;
      const fraction = target / magnitude;
      const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
      return nice * magnitude;
    }

    function coordinateLabel(value: number, step: number) {
      if (Math.abs(value) < step * .001) return "0";
      if (Math.abs(value) >= 10_000 || Math.abs(value) < .001) return value.toExponential(1);
      const decimals = Math.max(0, Math.min(6, -Math.floor(Math.log10(step))));
      const fixed = value.toFixed(decimals);
      return decimals ? fixed.replace(/\.?0+$/, "") : fixed;
    }

    function rebuildScientificGrid() {
      if (!gridContext) return;
      gridContext.clearRect(0, 0, width, height);
      const view = viewRef.current;
      const rotateRight = tuningRef.current.rotateRight;
      const bounds = mathBoundsForView(view, width, height, rotateRight);
      const pad = Math.max(bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin) * 0.08;
      const xMin = bounds.xMin - pad;
      const xMax = bounds.xMax + pad;
      const yMin = bounds.yMin - pad;
      const yMax = bounds.yMax + pad;
      const major = scientificStep(view.halfY * 2 / Math.max(height / 92, 1));
      const minor = major / 5;
      const snap = (position: number) => Math.round(position * dpr) / dpr;
      const isMajor = (value: number) => Math.abs(value / major - Math.round(value / major)) < 1e-6;
      const isAxis = (value: number) => Math.abs(value) < minor * 1e-4;
      const toScreen = (re: number, im: number) => complexToScreen(re, im, width, height, view, rotateRight);

      const traceRe = (majorLines: boolean) => {
        gridContext.beginPath();
        const first = Math.ceil(xMin / minor);
        const last = Math.floor(xMax / minor);
        for (let index = first; index <= last; index++) {
          const value = index * minor;
          if (isAxis(value) || isMajor(value) !== majorLines) continue;
          const start = toScreen(value, yMin);
          const end = toScreen(value, yMax);
          gridContext.moveTo(snap(start.x), snap(start.y));
          gridContext.lineTo(snap(end.x), snap(end.y));
        }
        gridContext.stroke();
      };
      const traceIm = (majorLines: boolean) => {
        gridContext.beginPath();
        const first = Math.ceil(yMin / minor);
        const last = Math.floor(yMax / minor);
        for (let index = first; index <= last; index++) {
          const value = index * minor;
          if (isAxis(value) || isMajor(value) !== majorLines) continue;
          const start = toScreen(xMin, value);
          const end = toScreen(xMax, value);
          gridContext.moveTo(snap(start.x), snap(start.y));
          gridContext.lineTo(snap(end.x), snap(end.y));
        }
        gridContext.stroke();
      };

      gridContext.lineWidth = 1 / dpr;
      gridContext.strokeStyle = "rgba(104, 196, 216, .026)";
      traceRe(false);
      traceIm(false);
      gridContext.strokeStyle = "rgba(119, 211, 228, .065)";
      traceRe(true);
      traceIm(true);

      if (tuningRef.current.coordinateAxes) {
        const realStart = toScreen(xMin, 0);
        const realEnd = toScreen(xMax, 0);
        const imagStart = toScreen(0, yMin);
        const imagEnd = toScreen(0, yMax);
        gridContext.strokeStyle = "rgba(151, 231, 240, .18)";
        gridContext.lineWidth = 1 / dpr;
        gridContext.beginPath();
        gridContext.moveTo(snap(realStart.x), snap(realStart.y));
        gridContext.lineTo(snap(realEnd.x), snap(realEnd.y));
        gridContext.moveTo(snap(imagStart.x), snap(imagStart.y));
        gridContext.lineTo(snap(imagEnd.x), snap(imagEnd.y));
        gridContext.stroke();

        gridContext.fillStyle = "rgba(171, 230, 238, .32)";
        gridContext.strokeStyle = "rgba(151, 231, 240, .14)";
        gridContext.font = "8px ui-monospace, SFMono-Regular, Menlo, monospace";
        gridContext.textBaseline = "top";
        gridContext.textAlign = "center";
        for (let index = Math.ceil(xMin / major); index <= Math.floor(xMax / major); index++) {
          const value = index * major;
          if (isAxis(value)) continue;
          const tick = toScreen(value, 0);
          gridContext.beginPath();
          gridContext.arc(snap(tick.x), snap(tick.y), 2, 0, TAU);
          gridContext.stroke();
          if (tick.x > 18 && tick.x < width - 18 && tick.y > 9 && tick.y < height - 9) {
            gridContext.fillText(coordinateLabel(value, major), snap(tick.x), snap(tick.y) + 4);
          }
        }
        gridContext.textBaseline = "middle";
        gridContext.textAlign = "right";
        for (let index = Math.ceil(yMin / major); index <= Math.floor(yMax / major); index++) {
          const value = index * major;
          if (isAxis(value)) continue;
          const tick = toScreen(0, value);
          gridContext.beginPath();
          gridContext.arc(snap(tick.x), snap(tick.y), 2, 0, TAU);
          gridContext.stroke();
          if (tick.x > 28 && tick.x < width - 8 && tick.y > 9 && tick.y < height - 9) {
            gridContext.fillText(coordinateLabel(value, major), snap(tick.x) - 5, snap(tick.y));
          }
        }
        gridContext.fillStyle = "rgba(180, 239, 245, .42)";
        gridContext.font = "italic 9px ui-monospace, SFMono-Regular, Menlo, monospace";
        const reLabel = toScreen(xMax, 0);
        gridContext.textAlign = "right";
        gridContext.textBaseline = "bottom";
        gridContext.fillText("Re(c)", Math.min(width - 7, Math.max(40, reLabel.x - 6)), Math.min(height - 6, Math.max(14, reLabel.y - 4)));
        const imLabel = toScreen(0, yMax);
        gridContext.textAlign = "left";
        gridContext.textBaseline = "top";
        gridContext.fillText("Im(c)", Math.min(width - 34, Math.max(6, imLabel.x + 6)), Math.max(6, imLabel.y + 4));
      }
      gridDirty = false;
    }

    function drawScientificGrid() {
      if (gridDirty) rebuildScientificGrid();
      ctx.drawImage(gridCanvas, 0, 0, width, height);
    }

    function drawSacredGlyph(
      glyph: number,
      dots: number,
      stroke: string,
      fill: string,
      radius = SOURCE_RADIUS_PX,
      { pixelDots = false } = {},
    ) {
      const shape = ((glyph % GLYPH_COUNT) + GLYPH_COUNT) % GLYPH_COUNT;
      const shapePaths = SACRED_PATH_COUNTS[shape];
      if (!pixelDots) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        for (let path = 0; path < shapePaths; path++) {
          ctx.beginPath();
          for (let sample = 0; sample <= 32; sample++) {
            const offset = sacredShapeOffset(shape, path, sample / 32);
            if (sample === 0) ctx.moveTo(offset.x * radius, offset.y * radius);
            else ctx.lineTo(offset.x * radius, offset.y * radius);
          }
          ctx.stroke();
        }
      }
      ctx.fillStyle = fill;
      for (let index = 0; index < dots; index++) {
        const path = index % shapePaths;
        const pathIndex = Math.floor(index / shapePaths);
        const samplesOnPath = Math.ceil((dots - path) / shapePaths);
        const offset = sacredShapeOffset(shape, path, pathIndex / Math.max(samplesOnPath, 1));
        const x = offset.x * radius;
        const y = offset.y * radius;
        if (pixelDots) {
          const pixel = 1 / dpr;
          ctx.fillRect(Math.round(x * dpr) / dpr, Math.round(y * dpr) / dpr, pixel, pixel);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 1.15, 0, TAU);
          ctx.fill();
        }
      }
    }

    function drawFlyingRock(body: { x: number; y: number; z: number; vz?: number; spin: number; skips: number; bounceAge: number; plannedSkips?: number }, glyphOffset: number, now: number) {
      const lift = body.z * 0.30;
      const nextShape = (glyphOffset + body.skips) % GLYPH_COUNT;
      const lastShape = body.skips === 0 ? nextShape : (glyphOffset + body.skips - 1) % GLYPH_COUNT;
      const heightT = Math.min(1, body.z / Math.max(pondScale() * .45, 1));
      const flying = body.z > 0.25;
      const hopT = sacredBallHopT(heightT, (body.vz ?? 0) >= 0);
      const life = sacredBallLifeScale(body.skips, body.plannedSkips ?? 0);
      const hop = sacredBallHopScale(heightT, flying);
      const radius = SACRED_BALL_RADIUS * life * hop;
      const drawX = Math.round(body.x * dpr) / dpr;
      const drawY = Math.round((body.y - lift) * dpr) / dpr;
      const bounce = reduceMotion ? 0 : Math.exp(-body.bounceAge * 8.5) * Math.cos(body.bounceAge * 29);
      const scaleX = 1 + bounce * .11;
      const scaleY = 1 - bounce * .09;
      ctx.save();
      ctx.fillStyle = `rgba(0, 4, 9, ${0.30 * (1 - heightT * 0.72)})`;
      ctx.beginPath();
      ctx.ellipse(
        drawX,
        body.y,
        radius * 1.08 * (1 + Math.max(0, bounce) * .08),
        radius * 0.36,
        0,
        0,
        TAU,
      );
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(scaleX, scaleY);
      const idle = reduceMotion ? 0 : now * 0.00042;
      const yaw = Math.PI / 4 + idle + body.spin * 0.4 + nextShape * 0.22;
      const pitch = Math.asin(1 / Math.sqrt(3)) + idle * 0.62 + (reduceMotion ? 0 : body.spin * 0.22);
      const pose = flying
        ? sacredBallGlyphPose(lastShape, nextShape, reduceMotion ? 1 : hopT)
        : sacredBallPose(now);
      const ball = projectSacredBall(yaw, pitch, radius, pose);
      const size = radius / SACRED_BALL_RADIUS;
      for (const edge of [...ball.edges].sort((a, b) => a.depth - b.depth)) {
        const near = (edge.depth + 1) / 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.12 + 0.32 * near).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.4, 0.7 * size);
        ctx.beginPath();
        ctx.moveTo(edge.ax, edge.ay);
        ctx.lineTo(edge.bx, edge.by);
        ctx.stroke();
      }
      for (const point of [...ball.points].sort((a, b) => a.depth - b.depth)) {
        const near = (point.depth + 1) / 2;
        const dot = Math.max(0.45, (1.05 + 0.55 * near) * size);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.34 + 0.66 * near).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, dot, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawTutorialArrow(now: number) {
      if (!tutorialArrowVisible({
        introActive: introActiveRef.current,
        spectator: spectatorRef.current,
        phase,
        hasThrown,
      })) return;
      const stretch = tutorialArrowStretch(now, reduceMotion);
      const arrow = tutorialArrowGeometry({ x: rock.x, y: rock.y }, stretch, minDimension(), height);
      ctx.save();
      ctx.globalAlpha = arrow.alpha;
      ctx.strokeStyle = "rgba(237, 250, 255, 0.92)";
      ctx.fillStyle = "rgba(237, 250, 255, 0.92)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4 - stretch * 0.8;
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(arrow.from.x, arrow.from.y);
      ctx.lineTo(arrow.to.x, arrow.to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(arrow.head[0].x, arrow.head[0].y);
      ctx.lineTo(arrow.head[1].x, arrow.head[1].y);
      ctx.lineTo(arrow.head[2].x, arrow.head[2].y);
      ctx.closePath();
      ctx.fill();
      ctx.font = "600 12px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(TUTORIAL_ARROW_LABEL, arrow.label.x, arrow.label.y);
      ctx.restore();
    }

    function drawRock(now: number) {
      if (introActiveRef.current) return;
      if (phase === "resolving" || phase === "result") return;
      drawFlyingRock({ ...rock, plannedSkips }, shapeOffset, now);
    }

    function drawEffects(now: number) {
      ripples = ripples.filter((ripple) => now - ripple.born < (ripple.lifetime ?? 2400));
      for (const ripple of ripples) {
        const point = complexToScreen(ripple.cr, ripple.ci, width, height, viewRef.current, tuningRef.current.rotateRight);
        const lifetime = ripple.lifetime ?? 2400;
        const age = now - ripple.born;
        const t = age / lifetime;
        if (t <= 0 || t >= 1) continue;
        const maxRadius = ripple.maxRadius ?? Math.max(36, minDimension() * 0.14);
        const radius = 3 + Math.pow(t, 0.70) * maxRadius;
        const envelope = Math.sin(t * Math.PI) * Math.pow(1 - t, 1.25);
        const baseGain = introActiveRef.current ? 0.44 : 0.28;
        const alpha = Math.max(0, envelope * baseGain);
        if (alpha <= 0.002) continue;
        ctx.save();
        ctx.strokeStyle = introActiveRef.current
          ? `rgba(240, 245, 255, ${alpha.toFixed(3)})`
          : `rgba(130, 215, 235, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(0.5, (introActiveRef.current ? 1.1 : 0.85) * (1 - t * 0.5));
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const colored = tuningRef.current.skipColors;
      const glyphDots = introActiveRef.current
        ? INTRO_SOURCE_DOTS
        : Math.max(MIN_SOURCE_DOTS, tuningRef.current.sourceDots);
      for (const impact of impacts) {
        const point = complexToScreen(impact.cr, impact.ci, width, height, viewRef.current, tuningRef.current.rotateRight);
        const age = now - impact.born;
        if (age < 0) continue;
        const pop = age < 450 ? 1.0 + Math.sin((age / 450) * Math.PI) * 0.18 : 1.0;
        const fontSize = Math.max(8, Math.round(11 * pop));
        ctx.font = `600 ${fontSize}px ui-monospace, monospace`;
        const [r, g, b] = skipTintRgb(impact.index, colored, spectatorRef.current || introActiveRef.current ? undefined : { tint: stoneRef.current.tint, strength: stoneRef.current.tintStrength });
        const mute = 0.28;
        const nr = Math.round(r * mute + 186 * (1 - mute));
        const ng = Math.round(g * mute + 210 * (1 - mute));
        const nb = Math.round(b * mute + 214 * (1 - mute));
        const originX = Math.round(point.x * dpr) / dpr;
        const originY = Math.round(point.y * dpr) / dpr;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(originX, originY);
        drawSacredGlyph(
          impact.glyph,
          glyphDots,
          `rgba(${nr}, ${ng}, ${nb}, 0.2)`,
          `rgba(${nr}, ${ng}, ${nb}, 0.55)`,
          SOURCE_RADIUS_PX,
          { pixelDots: true },
        );
        ctx.restore();
        const fade = age >= IMPACT_LABEL_FADE_MS ? 0 : (1 - age / IMPACT_LABEL_FADE_MS) ** 2;
        if (fade > 0.02) {
          ctx.save();
          ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${0.85 * fade})`;
          ctx.fillText(String(impact.index), originX + SOURCE_RADIUS_PX + 4, originY);
          ctx.restore();
        }
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    function flashlightGeometry() {
      if (phase !== "aiming") return null;
      const a = anchor();
      const dx = a.x - pull.x;
      const dy = a.y - pull.y;
      const length = Math.hypot(dx, dy);
      if (length < 8) return null;
      const directionX = dx / length;
      const directionY = dy / length;
      const range = Math.hypot(width, height) * 1.18;
      const halfAngle = FLASHLIGHT_HALF_ANGLE;
      const cosine = Math.cos(halfAngle);
      const sine = Math.sin(halfAngle);
      return {
        apexX: pull.x,
        apexY: pull.y,
        directionX,
        directionY,
        range,
        leftX: pull.x + (directionX * cosine - directionY * sine) * range,
        leftY: pull.y + (directionY * cosine + directionX * sine) * range,
        rightX: pull.x + (directionX * cosine + directionY * sine) * range,
        rightY: pull.y + (directionY * cosine - directionX * sine) * range,
        tipX: pull.x + directionX * range * 1.04,
        tipY: pull.y + directionY * range * 1.04,
      };
    }

    function syncOrbitDisplay() {
      const engine = engineRef.current;
      if (!engine) return;
      if (introActiveRef.current) {
        return;
      }
      if (phase === "aiming") {
        engine.setDisplay({ ...displayLayerGains("aiming"), cone: flashlightGeometry(), cssWidth: width, cssHeight: height });
        return;
      }
      engine.setDisplay({ ...displayLayerGains("play"), cone: null, cssWidth: width, cssHeight: height });
    }

    function drawMappedBuddhabrot(target: CanvasRenderingContext2D, source: CanvasImageSource = buddhabrotSource!) {
      const transform = buddhabrotImageTransform(
        "width" in source ? Number(source.width) : 1,
        "height" in source ? Number(source.height) : 1,
        width,
        height,
        viewRef.current,
        tuningRef.current.rotateRight,
      );
      target.save();
      target.imageSmoothingEnabled = false;
      target.setTransform(
        transform.a * dpr,
        transform.b * dpr,
        transform.c * dpr,
        transform.d * dpr,
        transform.e * dpr,
        transform.f * dpr,
      );
      target.drawImage(source, 0, 0);
      target.restore();
    }

    function drawBuddhabrotOutline(now: number) {
      if (introActiveRef.current && !introFadingRef.current) {
        buddhabrotIntroFadeStarted = 0;
        buddhabrotSlingFadeStarted = 0;
        buddhabrotBackgroundRevealed = false;
        return;
      }

      let alpha = 0;
      if (introFadingRef.current) {
        if (buddhabrotIntroFadeStarted === 0) buddhabrotIntroFadeStarted = now;
        buddhabrotBackgroundRevealed = true;
        alpha = buddhabrotIntroCrossfadeAlpha(now - buddhabrotIntroFadeStarted);
      } else if (buddhabrotBackgroundRevealed) {
        const slingAlpha = buddhabrotSlingFadeStarted === 0
          ? buddhabrotSlingFadeAlpha(0)
          : buddhabrotSlingFadeAlpha(now - buddhabrotSlingFadeStarted);
        const shadeAlpha = buddhabrotShadeFadeStarted === 0
          ? 0
          : buddhabrotShadeFadeAlpha(now - buddhabrotShadeFadeStarted);
        alpha = Math.max(slingAlpha, shadeAlpha);
      }

      const source = buddhabrotSource ?? (liveBuddhabrot?.ready ? liveBuddhabrot.canvas : null);
      if (!source) return;
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawMappedBuddhabrot(ctx, source);
      ctx.restore();
    }

    function drawFlashlight() {
      if (phase !== "aiming" || introActiveRef.current) return;
      const geometry = flashlightGeometry();
      if (!geometry) return;
      const { apexX, apexY, directionX, directionY, range } = geometry;

      if (buddhabrotSource && flashlightContext) {
        if (flashlightDirty) {
          flashlightContext.clearRect(0, 0, width, height);
          drawMappedBuddhabrot(flashlightContext);
          flashlightContext.globalCompositeOperation = "destination-in";
          flashlightContext.save();
          flashlightContext.filter = `blur(${FLASHLIGHT_EDGE_BLUR_PX * dpr}px)`;
          const facing = Math.atan2(directionY, directionX);
          const span = (FLASHLIGHT_HALF_ANGLE * 2) / TAU;
          const fade = Math.min(span * 0.22, 0.04);
          const conic = flashlightContext.createConicGradient(facing - FLASHLIGHT_HALF_ANGLE, apexX, apexY);
          conic.addColorStop(0, "rgba(255, 255, 255, 0)");
          conic.addColorStop(fade, "rgba(255, 255, 255, 1)");
          conic.addColorStop(Math.max(fade, span - fade), "rgba(255, 255, 255, 1)");
          conic.addColorStop(span, "rgba(255, 255, 255, 0)");
          if (span < 1) conic.addColorStop(1, "rgba(255, 255, 255, 0)");
          flashlightContext.fillStyle = conic;
          flashlightContext.fillRect(0, 0, width, height);
          flashlightContext.globalCompositeOperation = "destination-in";
          const radial = flashlightContext.createRadialGradient(apexX, apexY, 0, apexX, apexY, range);
          radial.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          radial.addColorStop(0.55, "rgba(255, 255, 255, 0.4)");
          radial.addColorStop(1, "rgba(255, 255, 255, 0)");
          flashlightContext.fillStyle = radial;
          flashlightContext.fillRect(0, 0, width, height);
          flashlightContext.restore();
          flashlightContext.globalCompositeOperation = "source-over";
          flashlightDirty = false;
        }
        ctx.save();
        ctx.globalAlpha = FLASHLIGHT_CACHE_ALPHA;
        ctx.drawImage(flashlightCanvas, 0, 0, width, height);
        ctx.restore();
      }
    }

    function alignPlayView() {
      if (!introFadingRef.current) return;
      const current = viewRef.current;
      if (
        current.centerX === PLAY_POND_VIEW.centerX
        && current.centerY === PLAY_POND_VIEW.centerY
        && current.halfY === PLAY_POND_VIEW.halfY
      ) return;
      applyView(PLAY_POND_VIEW);
    }

    async function ensureLiveBuddhabrot() {
      if (liveBuddhabrot || liveBuddhabrotStarting || flashlightLoadCancelled) return;
      liveBuddhabrotStarting = true;
      const gpu = await gpuPromiseRef.current;
      if (!gpu || flashlightLoadCancelled) {
        liveBuddhabrotStarting = false;
        return;
      }
      const size = 2048;
      const canvas = new OffscreenCanvas(size, size);
      const context = canvas.getContext("webgpu") as any;
      if (!context) {
        liveBuddhabrotStarting = false;
        return;
      }
      context.configure({
        device: gpu.device,
        format: gpu.preferredFormat,
        alphaMode: "premultiplied",
      });
      liveBuddhabrot = {
        generator: createBuddhabrotGenerator(gpu, { size, minDurationMs: INTRO_PLAY_ALIGN_MS }),
        canvas,
        context,
        ready: false,
      };
      liveBuddhabrotStarting = false;
    }

    function stepLiveBuddhabrot(elapsed: number) {
      if (!introFadingRef.current) return;
      void ensureLiveBuddhabrot();
      if (!liveBuddhabrot) return;
      if (liveBuddhabrot.generator.isComplete() && liveBuddhabrot.ready) return;
      liveBuddhabrot.generator.step(elapsed);
      if (liveBuddhabrot.generator.blit(liveBuddhabrot.context)) {
        liveBuddhabrot.ready = true;
      }
    }

    function render(now: number) {
      alignPlayView();
      syncOrbitDisplay();
      ctx.clearRect(0, 0, width, height);
      if (gridDirty) rebuildScientificGrid();
      if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0, width, height);
      drawBuddhabrotOutline(now);
      const a = anchor();
      drawFlashlight();
      drawPrediction(a);
      drawAimOrbitPreview(a);
      drawEffects(now);
      if (collectable && !introActiveRef.current && (phase === "ready" || phase === "aiming" || phase === "flying")) {
        const pulse = 1 + Math.sin(now / 240) * 0.18;
        const sigilColor = COLLECTABLE_COLORS[collectable.type];
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = sigilColor;
        ctx.shadowColor = sigilColor;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(collectable.x, collectable.y, COLLECTABLE_RADIUS_PX * 0.55 * pulse, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(collectable.x, collectable.y, COLLECTABLE_RADIUS_PX * 0.22 * pulse, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      drawRock(now);
      drawTutorialArrow(now);
    }

    function spawnIntroPondRipple(now: number) {
      const rippleOrigin = introLaunchOrigin(width, height);
      const mapped = screenToComplex(rippleOrigin.x, rippleOrigin.y, width, height, viewRef.current, tuningRef.current.rotateRight);
      const roll = Math.random();
      let maxRadius: number;
      let lifetime: number;
      if (roll < 0.35) {
        maxRadius = Math.max(18, minDimension() * (0.04 + Math.random() * 0.04));
        lifetime = 2600 + Math.random() * 800;
      } else if (roll < 0.75) {
        maxRadius = Math.max(45, minDimension() * (0.09 + Math.random() * 0.08));
        lifetime = 3400 + Math.random() * 1000;
      } else {
        maxRadius = Math.max(90, minDimension() * (0.18 + Math.random() * 0.14));
        lifetime = 4600 + Math.random() * 1200;
      }
      ripples.push({
        cr: mapped.x,
        ci: mapped.y,
        born: now,
        index: 1,
        lifetime,
        maxRadius,
      });
    }

    function spawnIntroBackgroundOrbits(now: number) {
      const aiming = phase === "aiming" && !introActiveRef.current;
      if ((!introActiveRef.current && !aiming) || introFadingRef.current) return;
      if (introActiveRef.current && engineRef.current?.isMriReady()) return;
      const spawnMs = aiming ? AIMING_BACKGROUND_SPAWN_MS : INTRO_BACKGROUND_SPAWN_MS;
      if (lastIntroBackground !== 0 && now - lastIntroBackground < spawnMs) return;
      lastIntroBackground = now;
      engineRef.current?.setLayer("pond");
      engineRef.current?.setTuning({
        ...tuningRef.current,
        maxDepth: INTRO_MAX_DEPTH,
        doublePixels: introActiveRef.current ? true : tuningRef.current.doublePixels,
      });
      engineRef.current?.setAtmosphere(introActiveRef.current ? INTRO_ATMOSPHERE : AIMING_ATMOSPHERE);
      const seedCount = aiming ? AIMING_NEBULA_SEEDS_PER_WAVE : INTRO_NEBULA_SEEDS_PER_WAVE;
      const seeds = Array.from({ length: seedCount }, () => introNebulaSeed());
      if (aiming) {
        engineRef.current?.spawn(seeds, 1, AIMING_SOURCE_CAP);
      } else {
        engineRef.current?.spawnAppend(seeds, 1, INTRO_SOURCE_CAP);
      }
      if (!aiming && Math.random() < 0.04) {
        spawnIntroPondRipple(now);
      }
    }

    function maybeOpeningThrow(now: number) {
      if (!introActiveRef.current || introFadingRef.current) return;
      const inOpeningVolley = introThrowsRef.current < INTRO_THROWS_PER_WAVE * 2;
      const interval = inOpeningVolley ? 900 : 2400;
      if (lastIntroLaunch !== 0 && now - lastIntroLaunch < interval) return;
      lastIntroLaunch = now;
      spectatorRef.current = true;
      engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH, doublePixels: true });
      engineRef.current?.setAtmosphere(INTRO_ATMOSPHERE);
      throwIntroRock();
      spawnIntroPondRipple(now);
    }

    function loop(now: number) {
      const elapsed = Math.min(.05, (now - lastTime) / 1000);
      lastTime = now;
      accumulator += elapsed;
      const fixed = 1 / 120;
      while (accumulator >= fixed) {
        simulate(fixed, now);
        simulateIntroRocks(fixed, now);
        accumulator -= fixed;
      }
      maybeOpeningThrow(now);
      spawnIntroBackgroundOrbits(now);
      stepLiveBuddhabrot(elapsed);
      advanceOrbits(now, elapsed);
      if (!introActiveRef.current) gameAudio.update(orbitScores, phase, now);
      render(now);
      frame = requestAnimationFrame(loop);
    }

    function eventPoint(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function applyView(nextView: ViewTransform) {
      const previous = viewRef.current;
      const rotateRight = tuningRef.current.rotateRight;
      if (phase === "flying" || phase === "aiming") {
        const nextRock = reprojectScreenPoint(rock.x, rock.y, width, height, previous, nextView, rotateRight);
        if (phase === "flying") {
          const velocity = reprojectScreenVelocity(
            rock.x, rock.y, rock.vx, rock.vy, width, height, previous, nextView, rotateRight,
          );
          rock.vx = velocity.x;
          rock.vy = velocity.y;
          const heightScale = previous.halfY / Math.max(nextView.halfY, 1e-6);
          rock.z *= heightScale;
          rock.vz *= heightScale;
        }
        rock.x = nextRock.x;
        rock.y = nextRock.y;
        if (phase === "aiming") {
          pull = reprojectScreenPoint(pull.x, pull.y, width, height, previous, nextView, rotateRight);
        }
      }
      viewRef.current = nextView;
      gridDirty = true;
      flashlightDirty = true;
      engineRef.current?.setView(nextView);
    }

    function onPointerDown(event: PointerEvent) {
      if (introActiveRef.current) return;
      const point = eventPoint(event);
      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);
      if (phase === "ready" && Math.hypot(point.x - rock.x, point.y - rock.y) <= 48) {
        gameAudio.init();
        gameAudio.slingGrab();
        pointerMode = "aim";
        phase = "aiming";
        if (buddhabrotSlingFadeStarted === 0) buddhabrotSlingFadeStarted = performance.now();
        plannedSkips = sampleSkipCount(Math.random, stoneRef.current.skipDecay);
        previewKey = "";
        flashlightDirty = true;
        engineRef.current?.setLayer("pond");
        engineRef.current?.setAtmosphere(AIMING_ATMOSPHERE);
        engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH });
        lastIntroBackground = 0;
        pull = point;
        rock.x = point.x;
        rock.y = point.y;
        updateHud(true);
      } else {
        pointerMode = "pan";
        panOrigin = point;
        panView = { ...viewRef.current };
      }
    }

    function onPointerMove(event: PointerEvent) {
      const point = eventPoint(event);
      if (event.pointerId !== pointerId) return;
      if (pointerMode === "pan") {
        const rotateRight = tuningRef.current.rotateRight;
        const before = screenToComplex(panOrigin.x, panOrigin.y, width, height, panView, rotateRight);
        const after = screenToComplex(point.x, point.y, width, height, panView, rotateRight);
        applyView({
          centerX: panView.centerX - (after.x - before.x),
          centerY: panView.centerY - (after.y - before.y),
          halfY: panView.halfY,
        });
        return;
      }
      if (pointerMode !== "aim" || phase !== "aiming") return;
      const a = anchor();
      const dx = point.x - a.x;
      const dy = point.y - a.y;
      const length = Math.hypot(dx, dy);
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      const scale = length > maxPull ? maxPull / length : 1;
      pull = { x: a.x + dx * scale, y: a.y + dy * scale };
      rock.x = pull.x;
      rock.y = pull.y;
      gameAudio.slingPull(Math.min(1, length / maxPull));
      flashlightDirty = true;
    }

    function release(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      flashlightDirty = true;
      if (pointerMode === "pan") {
        pointerMode = "none";
        pointerId = -1;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        return;
      }
      if (pointerMode !== "aim" || phase !== "aiming") return;
      const a = anchor();
      const dx = a.x - pull.x;
      const dy = a.y - pull.y;
      const length = Math.hypot(dx, dy);
      pointerId = -1;
      pointerMode = "none";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (length < 12) {
        phase = "ready";
        rock.x = a.x;
        rock.y = a.y;
        engineRef.current?.clear();
        engineRef.current?.setTuning(tuningRef.current);
        engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
        engineRef.current?.setLayer("throw");
        updateHud(true);
        return;
      }
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      const rawPower = Math.min(1, length / maxPull);
      const angle = Math.atan2(dy, dx);
      spectatorRef.current = false;
      setWatchingShare(false);
      setReplayMode(false);
      savedTuningRef.current = null;
      currentShareRef.current = {
        version: 1,
        view: { ...viewRef.current },
        rotateRight: tuningRef.current.rotateRight,
        angle,
        power: rawPower,
        skips: plannedSkips,
        glyph: shapeOffset,
        seed: shotId,
        sourceDots: tuningRef.current.sourceDots,
        name: playerNameRef.current || "YOU",
      };
      setHasShare(true);
      launchRock(angle, rawPower);
    }

    function cancelAim() {
      if (pointerMode === "pan") {
        pointerMode = "none";
        pointerId = -1;
        return;
      }
      if (pointerMode !== "aim" || phase !== "aiming") return;
      phase = "ready";
      pointerId = -1;
      pointerMode = "none";
      const a = anchor();
      pull = { ...a };
      rock.x = a.x;
      rock.y = a.y;
      flashlightDirty = true;
      engineRef.current?.clear();
      engineRef.current?.setTuning(tuningRef.current);
      engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
      engineRef.current?.setLayer("throw");
      updateHud(true);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (introActiveRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "Escape") cancelAim();
      if ((event.key === " " || event.key === "Enter") && phase === "result") {
        event.preventDefault();
        throwAgainRef.current();
      }
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", cancelAim);
    window.addEventListener("keydown", onKeyDown);
    resize();
    resetRound();
    frame = requestAnimationFrame(loop);
    return () => {
      flashlightLoadCancelled = true;
      liveBuddhabrot?.generator.destroy();
      liveBuddhabrot = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", cancelAim);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", unlockIntroAudio);
      gameAudioRef.current = null;
      gameAudio.destroy();
      playThrowRef.current = null;
      resetBuddhabrotFadeRef.current = () => {};
    };
  }, []);

  const instruction = hud.phase === "ready" ? "Grab the white orb. Pull back and release."
    : hud.phase === "aiming" ? "Aim for deep water · farther pull = faster throw"
    : hud.phase === "flying" ? `Each splash launches a new ${tuning.sourceDots}-point glyph`
    : hud.phase === "resolving" ? `Resolving the pond · ${Math.round(hud.progress * 100)}%`
    : "Press Space or throw again";

  const depthIndex = Math.max(0, DEPTH_OPTIONS.indexOf(tuning.maxDepth as typeof DEPTH_OPTIONS[number]));
  const equippedStone = stoneById(progression.equippedId);
  const stoneDepthIndex = Math.max(0, DEPTH_OPTIONS.indexOf(equippedStone.depthCap as typeof DEPTH_OPTIONS[number]));

  const resetAndFocusCanvas = () => {
    spectatorRef.current = false;
    setWatchingShare(false);
    setReplayMode(false);
    resetBuddhabrotFadeRef.current();
    if (savedTuningRef.current) {
      const saved = savedTuningRef.current;
      savedTuningRef.current = null;
      tuningRef.current = saved;
      setTuning(saved);
      storeTuning(saved);
      engineRef.current?.setTuning(saved);
      invalidateGridRef.current();
      invalidateFlashlightRef.current();
    }
    restartRef.current();
    requestAnimationFrame(() => gameCanvasRef.current?.focus());
  };
  throwAgainRef.current = resetAndFocusCanvas;

  const replayThrow = () => {
    const shot = currentShareRef.current;
    if (!shot || intro) return;
    playThrowRef.current?.(shot);
  };

  const shareThrow = () => {
    const shot = currentShareRef.current;
    if (!shot) return;
    const url = throwShareUrl(window.location.href, shot);
    history.replaceState(null, "", url);
    void (async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: GAME_TITLE, url });
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus("Copied");
        window.setTimeout(() => setShareStatus(""), 1600);
      } catch {
        setShareStatus("Copy the address bar");
        window.setTimeout(() => setShareStatus(""), 2400);
      }
    })();
  };

  const reloadToLoading = () => {
    window.location.assign(window.location.pathname);
  };

  const iterationBusy = hud.phase === "flying" || hud.phase === "resolving";
  const throwBusy = iterationBusy || Boolean(intro);
  const showCompactHighscores = iterationBusy || hud.phase === "result";
  const currentIsHighscore = hud.phase === "result" && !watchingShare && Boolean(currentResultId) && scores[0]?.id === currentResultId;

  return (
    <main className={`gameShell ${lightMode ? "lightMode" : ""} ${replayMode ? "replayMode" : ""} ${railOpen ? "railOpen" : ""}`}>
      <section className="playfield" aria-label="Mandelpond rock skipping game">
        <canvas ref={gpuCanvasRef} className="gpuCanvas" aria-hidden="true" />
        <canvas ref={gameCanvasRef} className="gameCanvas" tabIndex={0} aria-label="Throw ready. Drag the white orb backward and release it across the water" />
        <button type="button" className="gameBrand" onClick={reloadToLoading} aria-label={`${GAME_TITLE}. Reload to loading`}>
          <span className="gameBrandHeading">
            <span className="gameBrandTitle">{GAME_TITLE}</span>
            <span className="gameBrandVersion">{GAME_VERSION}</span>
          </span>
          <span className="gameBrandTag">{GAME_TAGLINE}</span>
        </button>
        <button
          type="button"
          className="themeToggle"
          aria-pressed={lightMode}
          aria-label={lightMode ? "Switch to dark mode" : "Switch to light mode"}
          title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
          onClick={toggleTheme}
        >
          <span className="themeToggleIcon" aria-hidden="true">{lightMode ? "☼" : "☾"}</span>
          <span className="themeToggleTrack" aria-hidden="true"><i className="themeToggleThumb" /></span>
        </button>
        {replayMode && (
          <p className="replayBanner" aria-live="polite">
            <span className="replayBannerName">{sharePlayerLabel(replayName)}</span>
            <span className="replayBannerLabel">replay</span>
          </p>
        )}
        {intro && (
          <BuddhabrotIntro
            fading={introFading}
            onPlay={finishOpening}
          />
        )}
        {challengeToast && <div className="challengeToast" role="status">{challengeToast}</div>}
        {(hud.phase === "flying" || hud.phase === "resolving" || hud.phase === "result") && !intro && (
          <div className="playfieldThrowActions">
            {hud.phase === "result" && (
              <button type="button" className="playfieldThrowControl" onClick={resetAndFocusCanvas} aria-label="Rethrow">
                Rethrow
              </button>
            )}
            <button
              type="button"
              className="playfieldShareControl"
              onClick={shareThrow}
              disabled={!hasShare}
              aria-label="Copy a link to this throw"
            >
              {shareStatus || "Share"}
            </button>
          </div>
        )}
        <div className="playfieldDock">
          <HowItWorks />
        </div>
        {!intro && !railOpen && (
          <div className="compactScore" aria-live="polite">
            {showCompactHighscores && (
              <div className="compactHighscores" role="list" aria-label="High scores">
                <span className="compactHighscoresTitle">High scores</span>
                {scores.length === 0 ? (
                  <span className="compactHighscoreEmpty">No scores yet.</span>
                ) : scores.slice(0, 3).map((entry, index) => (
                  <div
                    className={`compactHighscoreEntry ${entry.id === currentResultId ? "current" : ""}`}
                    key={entry.id}
                    role="listitem"
                  >
                    <span className="compactHighscoreRank">{index + 1}</span>
                    <span className="compactHighscoreName">{entry.name}</span>
                    <span className="compactHighscoreValue">{formatNumber(entry.score)}</span>
                  </div>
                ))}
              </div>
            )}
            <span className="compactScoreLabel">{hud.phase === "result" ? "Final score" : "Score"}</span>
            <strong className="compactScoreNumber">{formatNumber(hud.score)}</strong>
            {currentIsHighscore && <span className="compactScoreAnnouncement" role="status" aria-live="assertive">New highscore!</span>}
            {currentIsHighscore && (
              <div className="highscoreNameEntry">
                <label className="highscoreNameLabel" htmlFor="highscore-name">Your name</label>
                <input
                  id="highscore-name"
                  className="highscoreNameInput"
                  aria-label="High score name"
                  autoComplete="nickname"
                  maxLength={12}
                  value={playerName}
                  onChange={(event) => renameCurrent(event.target.value)}
                />
              </div>
            )}
          </div>
        )}
        {!intro && (
          <button
            type="button"
            className="railToggle"
            aria-expanded={railOpen}
            aria-label={railOpen ? "Hide menu" : "Show menu"}
            onClick={() => setRailOpen((open) => !open)}
          >
            {railOpen ? "‹" : "›"}
          </button>
        )}
      </section>

      <aside className={`scoreRail ${hud.phase === "result" ? "hasResult" : ""}`} aria-label="Score and local high scores">
        <section className="liveScore" aria-live="polite">
          <span className="liveLabel">{hud.phase === "result" ? "Final score" : "Score"}</span>
          <strong className="liveNumber">{formatNumber(hud.score)}</strong>
          <span className="liveMeta">{hud.skips} skips · {hud.deepest ? formatNumber(hud.deepest) : "0"} deep · {hud.coverage} cells · {Math.round(hud.spread * 100)}% spread</span>
          <span className="walletRow">Wallet <strong>{formatNumber(progression.wallet)}</strong> pts</span>
          <span className="liveProgress"><i style={{ width: `${Math.max(2, hud.progress * 100)}%` }} /></span>
          <div className="throwShareRow">
            <button
              type="button"
              className="rethrowButton"
              onClick={replayThrow}
              disabled={!hasShare || throwBusy}
              aria-label="Replay this throw"
            >
              Replay throw
            </button>
            <button
              type="button"
              className="rethrowButton"
              onClick={shareThrow}
              disabled={!hasShare}
              aria-label="Copy a link to this throw"
            >
              {shareStatus || "Share throw"}
            </button>
          </div>
        </section>

        <section className="stonePanel" aria-label="Stone collection">
          <div className="tuningHeading"><span>Stones</span><span>{progression.ownedIds.length}/{STONES.length}</span></div>
          <div className="stoneList">
            {STONES.map((stone) => {
              const owned = progression.ownedIds.includes(stone.id);
              const isEquipped = progression.equippedId === stone.id;
              const affordable = progression.wallet >= stone.price;
              return (
                <div key={stone.id} className={`stoneCard rarity-${stone.rarity} ${isEquipped ? "equipped" : owned ? "owned" : "locked"}`}>
                  <span className="stoneName">{stone.name}</span>
                  <span className="stoneMeta">{stone.dots} dots · {formatCompact(stone.depthCap)} deep · {expectedSkips(stone.skipDecay).toFixed(1)} avg skips</span>
                  {isEquipped
                    ? <span className="stoneAction stoneEquipped">Equipped</span>
                    : owned
                      ? <button type="button" className="rethrowButton stoneAction" onClick={() => equipStone(stone.id)}>Equip</button>
                      : <button type="button" className="rethrowButton stoneAction" disabled={!affordable} onClick={() => buyStone(stone.id)}>{formatCompact(stone.price)} pts</button>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="tuningPanel" aria-label="Orbit tuning">
          <div className="tuningHeading"><span>Orbit tuning</span><span>Live</span></div>
          <div className="tuningControl">
            <span><span>Glyph dots</span><output>{Math.min(tuning.sourceDots, equippedStone.dots)}</output></span>
            <input type="range" min={MIN_SOURCE_DOTS} max={Math.min(MAX_SOURCE_DOTS, equippedStone.dots)} step="1" value={Math.min(tuning.sourceDots, equippedStone.dots)}
              aria-label="Dots per sacred geometry glyph"
              onChange={(event) => updateTuning({ sourceDots: Number(event.target.value) })} />
          </div>
          <div className="tuningControl">
            <span><span>Orbit limit</span><output>{formatCompact(Math.min(tuning.maxDepth, equippedStone.depthCap))}</output></span>
            <input type="range" min="0" max={stoneDepthIndex} step="1" value={Math.min(depthIndex, stoneDepthIndex)}
              aria-label="Orbit iteration limit"
              aria-valuetext={`${formatNumber(tuning.maxDepth)} iterations`}
              onChange={(event) => updateTuning({ maxDepth: DEPTH_OPTIONS[Number(event.target.value)] })} />
          </div>
          <div className="tuningControl">
            <span><span>Acceleration multiplier</span><output>{tuning.acceleration.toFixed(1)}×</output></span>
            <input type="range" min={MIN_ACCELERATION} max={MAX_ACCELERATION} step="0.1" value={tuning.acceleration}
              aria-label="Iteration speed acceleration multiplier"
              aria-valuetext={`${tuning.acceleration.toFixed(1)} multiplier`}
              onChange={(event) => updateTuning({ acceleration: Number(event.target.value) })} />
          </div>
          <div className="tuningControl">
            <span><span>Line persist</span><output>{tuning.linePersist.toFixed(2)}s</output></span>
            <input type="range" min={MIN_LINE_PERSIST} max={MAX_LINE_PERSIST} step="0.05" value={tuning.linePersist}
              aria-label="How long iteration lines stay visible"
              aria-valuetext={`${tuning.linePersist.toFixed(2)} seconds`}
              onChange={(event) => updateTuning({ linePersist: Number(event.target.value) })} />
          </div>
          <label className="tuningCheck">
            <input type="checkbox" checked={tuning.previewOrbits}
              aria-label="Preview skip orbits while aiming"
              onChange={(event) => updateTuning({ previewOrbits: event.target.checked })} />
            Aim orbit preview
          </label>
          <label className="tuningCheck">
            <input type="checkbox" checked={tuning.skipColors}
              aria-label="Color each skip differently"
              onChange={(event) => updateTuning({ skipColors: event.target.checked })} />
            Skip colors
          </label>
          <label className="tuningCheck">
            <input type="checkbox" checked={tuning.coordinateAxes}
              aria-label="Show coordinate axes"
              onChange={(event) => updateTuning({ coordinateAxes: event.target.checked })} />
            Coordinate axes
          </label>
          <label className="tuningCheck">
            <input type="checkbox" checked={tuning.rotateRight}
              aria-label="Rotate coordinates and Buddhabrot 90 degrees right"
              onChange={(event) => updateTuning({ rotateRight: event.target.checked })} />
            Rotate 90° right
          </label>
          <label className="tuningCheck">
            <input type="checkbox" checked={tuning.doublePixels}
              aria-label="Render the orbit nebula at half resolution so pixels look doubled"
              onChange={(event) => updateTuning({ doublePixels: event.target.checked })} />
            Double pixels
          </label>
          <div className="tuningControl">
            <span><span>Preview iterations</span><output>{tuning.previewIterations}</output></span>
            <input type="range" min={MIN_PREVIEW_ITERATIONS} max={MAX_PREVIEW_ITERATIONS} step="1" value={tuning.previewIterations}
              aria-label="Orbit iterations to draw while aiming"
              aria-valuetext={`${tuning.previewIterations} iterations`}
              onChange={(event) => updateTuning({ previewIterations: Number(event.target.value) })} />
          </div>
          <p className="tuningNote">Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.</p>
        </section>

        {hud.phase === "result" && (
          <section className="railResult" aria-label="Throw result">
            <div className="resultEyebrow">{
              watchingShare ? `${sharePlayerLabel(replayName)} throw`
                : currentIsHighscore ? "New highscore!"
                  : "Throw complete"
            }</div>
            <div className="resultStats">{hud.skips} exact paths · {formatNumber(hud.deepest)} deep · {hud.coverage} distinct cells · {Math.round(hud.spread * 100)}% spread.</div>
            <div className="nameRow">
              {currentResultId ? (
                <input className="nameInput" aria-label="High score name" value={playerName} maxLength={12} onChange={(event) => renameCurrent(event.target.value)} />
              ) : null}
              <button className="throwButton" onClick={resetAndFocusCanvas}>Throw again</button>
            </div>
          </section>
        )}

        <section className="challengePanel" aria-label="Challenges">
          <div className="tuningHeading"><span>Challenges</span><span>{progression.completedChallengeIds.length}/{CHALLENGES.length}</span></div>
          <ul className="challengeList">
            {CHALLENGES.map((challenge) => {
              const done = progression.completedChallengeIds.includes(challenge.id);
              return (
                <li key={challenge.id} className={done ? "challengeDone" : ""}>
                  <span>{challenge.label}</span>
                  <span>{done ? "✓" : `${formatCompact(challenge.bounty)} pts`}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <h2 className="railTitle">Local legends</h2>
        <p className="railSub">Depth, distinct points, and spatial spread all score. Later skips multiply the result.</p>
        {gpuError && <p className="gpuNote" role="status">{gpuError}</p>}
        <div className="scoreList">
          {scores.length === 0 && <div className="emptyScores">No throws yet.</div>}
          {scores.map((entry, index) => (
            <div className={`scoreEntry ${entry.id === currentResultId ? "current" : ""}`} key={entry.id}>
              <span className="rank">{String(index + 1).padStart(2, "0")}</span>
              <span><span className="scoreName">{entry.name}</span><span className="scoreMeta">{entry.skips} skips · {formatNumber(entry.deepest)} deep · {entry.coverage} cells · {Math.round(entry.spread * 100)}% spread</span></span>
              <span className="scoreNumber">{formatNumber(entry.score)}</span>
            </div>
          ))}
        </div>
        <div className="railHint">{instruction}<br />Drag empty water to move · wheel or +/- to zoom.</div>
        <div className="railFooter">Saved on this device · score model v2 · {formatCompact(tuning.maxDepth)} orbit cap</div>
      </aside>
    </main>
  );
}
