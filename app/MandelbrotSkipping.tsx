"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useCallback, useEffect, useRef, useState } from "react";
import { acquireGpu, type GpuContext } from "@/lib/gpu";
import BuddhabrotIntro from "./BuddhabrotIntro";
import HowItWorks from "./HowItWorks";
import {
  ESCAPE_RADIUS_SQ,
  OFFSCREEN_STREAK,
  TINY_HOP_PX,
  TINY_HOP_STREAK,
  updateOrbitEnd,
} from "@/lib/orbit-end";
import { MAX_SKIPS, MIN_SKIPS, sampleSkipCount } from "@/lib/skip-count";
import { allocateSources, allocateSourcesAppend } from "@/lib/orbit-sources";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import {
  indexedDbStore,
  readCachedTexture,
  selectTextureSize,
  writeCachedTexture,
} from "@/lib/buddhabrot/cache";
import {
  FLASHLIGHT_ATMOSPHERE,
  FLASHLIGHT_HALF_ANGLE,
  FLASHLIGHT_MAX_DEPTH,
  FLASHLIGHT_SOURCE_CAP,
  FLASHLIGHT_SPAWN_MS,
  FLASHLIGHT_EDGE_BLUR_PX,
  INTRO_ATMOSPHERE,
  INTRO_BACKGROUND_SPAWN_MS,
  INTRO_MAX_DEPTH,
  INTRO_SETTLE_MS,
  INTRO_SOURCE_DOTS,
  INTRO_THROW_STAGGER_MS,
  INTRO_THROWS_PER_WAVE,
  INTRO_ROCK_DRAW_EVERY,
  INTRO_TRAIL_FADE_MS,
  INTRO_NEBULA_SEEDS_PER_WAVE,
  PLAY_ATMOSPHERE,
  introLaunchOrigin,
  introNebulaSeed,
  sampleRayInCone,
  type OrbitAtmosphere,
} from "@/lib/flashlight-probe";
import {
  acceleratedSteps,
  BASE_STEPS_PER_SOURCE,
  clampAcceleration,
  DEFAULT_ACCELERATION,
  DEPTH_OPTIONS,
  MAX_ACCELERATION,
  MIN_ACCELERATION,
} from "@/lib/orbit-tuning";
import {
  TRAIL_ATLAS_SIZE,
  TRAIL_BOUNDS,
  complexToClip,
  complexToScreen,
  mathBoundsForView,
  reprojectScreenPoint,
  reprojectScreenVelocity,
  screenToComplex,
  viewCenterKeepingFocus,
  zoomPixelScale,
  type ViewTransform,
} from "@/lib/view-map";
import {
  parseThrowShare,
  sharePlayerLabel,
  throwShareUrl,
  type SharedThrow,
} from "@/lib/throw-share";

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
};

type OrbitEngine = {
  spawn: (points: Array<{ x: number; y: number }>, skipIndex: number, cap?: number) => void;
  spawnAppend: (points: Array<{ x: number; y: number }>, skipIndex: number, cap?: number) => number;
  setView: (view: ViewTransform) => void;
  setTuning: (tuning: Tuning) => void;
  setAtmosphere: (atmosphere: OrbitAtmosphere) => void;
  clear: () => void;
  freeze: () => void;
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
  path: Array<{ x: number; y: number }>;
  draw: boolean;
};

const GLYPH_COUNT = 7;
const SACRED_PATH_COUNTS = [2, 2, 2, 4, 2, 3, 7] as const;
const MIN_SOURCE_DOTS = 6;
const MAX_SOURCE_DOTS = 32;
const MAX_SOURCES = 4096;
const INTRO_SOURCE_CAP = 2048;
const SCORE_DEPTH_CAP = DEPTH_OPTIONS[DEPTH_OPTIONS.length - 1];
const LINE_VISIBLE_FLOOR = 0.05;
const MIN_LINE_PERSIST = 0.05;
const MAX_LINE_PERSIST = 8;
const MIN_PREVIEW_ITERATIONS = 10;
const MAX_PREVIEW_ITERATIONS = 50;
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
  sourceDots: 18,
  maxDepth: 2_000_000,
  acceleration: DEFAULT_ACCELERATION,
  linePersist: 0.6,
  previewOrbits: false,
  previewIterations: 20,
  skipColors: true,
  coordinateAxes: false,
  rotateRight: false,
};
const TUNING_KEY = "mandelbrot-skipping:tuning:v3";
const SOURCE_RADIUS_PX = 10;
const SLING_DRAW_PULL_RATIO = 0.30;
const SLING_THROW_PULL_RATIO = 0.16;
const POINT_BUDGET = 200_000;
const HIDDEN_INITIAL_STEPS = 0;
const CURVE_SEGMENTS = 6;
const LINE_SEGMENT_BUDGET = 25_000;
const LINE_SEGMENT_CAPACITY = LINE_SEGMENT_BUDGET + MAX_SOURCES;
const COVERAGE_GRID = 32;
const COVERAGE_WORDS = COVERAGE_GRID * COVERAGE_GRID / 32;
const FULL_GRID_VARIANCE = (COVERAGE_GRID * COVERAGE_GRID - 1) / 12;
const SCORE_SAMPLE_STRIDE = 4;
const MAX_HOP_SCREEN_MULTIPLIER = 2;
const SCORE_KEY = "mandelbrot-skipping:scores:v2";
const LEGACY_SCORE_KEY = "mandelbrot-skipping:scores:v1";
const TAU = Math.PI * 2;
const POND_CENTER = { x: -0.58, y: 0 };
const VIEW_HALF_Y = 0.8;
const INTRO_POND_CENTER = { x: -0.52, y: 0 };
const INTRO_VIEW_HALF_Y = 1.45;
const SCORE_HALF_X = 1.6;
const SCORE_HALF_Y = 1.15;
const MIN_VIEW_HALF_Y = 0.035;
const MAX_VIEW_HALF_Y = 2.4;
const SONIC_SCALES = [
  [0, 2, 3, 5, 7, 9, 10], // dorian
  [0, 1, 4, 6, 7, 10], // crystalline synthetic
  [0, 2, 4, 6, 8, 10], // whole tone
  [0, 3, 5, 7, 10], // minor pentatonic
  [0, 1, 5, 7, 8], // in-sen
] as const;

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
  accelerationCurve: f32,
  atlasMode: f32,
  hiddenSteps: f32,
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
  let depthProgress = clamp(f32(state.step) / max(f32(params.maxDepth), 1.0), 0.0, 1.0);
  let acceleration = pow(depthProgress, max(params.accelerationCurve, 0.25));
  let acceleratedBatch = min(
    params.batch,
    max(${BASE_STEPS_PER_SOURCE}u, u32(f32(${BASE_STEPS_PER_SOURCE}u) + acceleration * max(f32(params.batch - ${BASE_STEPS_PER_SOURCE}u), 0.0)))
  );
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
    let inAtlas = all(abs(toAtlasClip(z)) <= vec2f(1.0));
    if (inAtlas || all(abs(clip) <= vec2f(1.0))) {
      if (state.step > u32(params.hiddenSteps)) {
        let slot = atomicAdd(&drawArgs.vertexCount, 1u);
        if (slot < ${POINT_BUDGET}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inAtlas || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
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
    let onScreen = all(abs(clip) <= vec2f(1.02));
    state.offscreenStreak = select(state.offscreenStreak + 1u, 0u, inAtlas || onScreen);
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
struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32 }
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationCurve: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  bounds: vec4f,
}
@group(0) @binding(0) var<uniform> style: Style;
@group(0) @binding(1) var<uniform> params: Params;
struct VSOut { @builtin(position) position: vec4f, @location(0) color: vec3f }
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
  out.position = vec4f(projectPoint(position), 0.0, 1.0);
  let t = clamp(depth, 0.0, 1.0);
  let depthColor = mix(vec3f(0.10, 0.78, 0.92), vec3f(0.92, 1.0, 0.82), t);
  let tinted = mix(depthColor, skipTint(skip), style.colorMode);
  let gray = vec3f(mix(0.22, 1.0, t));
  out.color = mix(tinted, gray, style.pulse);
  return out;
}
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.color * style.alpha, style.alpha);
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
struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32 }
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationCurve: f32,
  atlasMode: f32,
  hiddenSteps: f32,
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
  out.color = mix(mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth), skipTint(curve.pad), style.colorMode);
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
@group(0) @binding(0) var atlasTexture: texture_2d<f32>;
@group(0) @binding(1) var atlasLineTexture: texture_2d<f32>;
@group(0) @binding(2) var liveTexture: texture_2d<f32>;
@group(0) @binding(3) var liveLineTexture: texture_2d<f32>;
@group(0) @binding(4) var displaySampler: sampler;
struct DisplayView {
  center: vec2f,
  viewHalf: vec2f,
  rotateRight: f32,
  pad: f32,
  bounds: vec4f,
}
@group(0) @binding(5) var<uniform> display: DisplayView;
@fragment fn displayFs(in: VSOut) -> @location(0) vec4f {
  let clip = vec2f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0);
  let oriented = clip * display.viewHalf;
  let delta = select(oriented, vec2f(-oriented.y, oriented.x), display.rotateRight > 0.5);
  let z = display.center + delta;
  let span = vec2f(display.bounds.y - display.bounds.x, display.bounds.w - display.bounds.z);
  let atlasUv = vec2f(
    (z.x - display.bounds.x) / span.x,
    (display.bounds.w - z.y) / span.y
  );
  let inside = all(atlasUv >= vec2f(0.0)) && all(atlasUv <= vec2f(1.0));
  let raw = select(vec3f(0.0), textureSample(atlasTexture, displaySampler, atlasUv).rgb, inside) * 3.6;
  let mapped = raw / (vec3f(1.0) + raw);
  let glow = pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(0.72));
  let lineGain = display.pad;
  let atlasLines = select(vec3f(0.0), textureSample(atlasLineTexture, displaySampler, atlasUv).rgb, inside) * 1.35 * lineGain;
  let liveGlow = textureSample(liveTexture, displaySampler, in.uv).rgb * 3.6;
  let liveMapped = liveGlow / (vec3f(1.0) + liveGlow);
  let live = pow(clamp(liveMapped, vec3f(0.0), vec3f(1.0)), vec3f(0.72));
  let liveLines = textureSample(liveLineTexture, displaySampler, in.uv).rgb * 1.35 * lineGain;
  return vec4f(glow + atlasLines + live + liveLines, 1.0);
}
`;

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function orbitShape(orbit: OrbitScore) {
  const n = orbit.distinct;
  if (!n) return { area: 0, coverage: 0, spread: 0, elongation: 0, orientation: 0, density: 0, centroidX: 0, centroidY: 0 };
  const meanX = orbit.sumX / n;
  const meanY = orbit.sumY / n;
  const varianceX = Math.max(0, orbit.sumXX / n - meanX * meanX);
  const varianceY = Math.max(0, orbit.sumYY / n - meanY * meanY);
  const covariance = orbit.sumXY / n - meanX * meanY;
  const determinant = Math.max(0, varianceX * varianceY - covariance * covariance);
  const discriminant = Math.sqrt((varianceX - varianceY) ** 2 + 4 * covariance * covariance);
  const major = Math.max(0, (varianceX + varianceY + discriminant) * .5);
  const minor = Math.max(0, (varianceX + varianceY - discriminant) * .5);
  const area = Math.min(1, Math.sqrt(determinant) / FULL_GRID_VARIANCE);
  const coverage = Math.min(1, Math.log2(1 + n) / Math.log2(1 + COVERAGE_GRID * COVERAGE_GRID));
  const elongation = major > .001 ? Math.min(1, 1 - Math.sqrt(minor / major)) : 0;
  const orientation = .5 * Math.atan2(2 * covariance, varianceX - varianceY);
  const estimatedCells = Math.max(1, Math.min(COVERAGE_GRID * COVERAGE_GRID, 4 * Math.PI * Math.sqrt(determinant)));
  const density = Math.min(1, n / estimatedCells);
  return {
    area,
    coverage,
    spread: Math.sqrt(area),
    elongation,
    orientation,
    density,
    centroidX: meanX / (COVERAGE_GRID - 1) * 2 - 1,
    centroidY: meanY / (COVERAGE_GRID - 1) * 2 - 1,
  };
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

function skipTintRgb(skipIndex: number, colored: boolean): [number, number, number] {
  if (!colored) return [SKIP_TINTS[0][0], SKIP_TINTS[0][1], SKIP_TINTS[0][2]];
  const tint = SKIP_TINTS[(Math.max(1, skipIndex) - 1) % SKIP_TINTS.length];
  return [tint[0], tint[1], tint[2]];
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
  const previewOrbits = value?.previewOrbits === true;
  const skipColors = value?.skipColors !== false;
  const coordinateAxes = value?.coordinateAxes === true;
  const rotateRight = value?.rotateRight === true;
  const requestedPreview = Math.round(Number(value?.previewIterations) || DEFAULT_TUNING.previewIterations);
  const previewIterations = Math.max(
    MIN_PREVIEW_ITERATIONS,
    Math.min(MAX_PREVIEW_ITERATIONS, requestedPreview),
  );
  return { sourceDots, maxDepth, acceleration, linePersist, previewOrbits, previewIterations, skipColors, coordinateAxes, rotateRight };
}

function loadTuning(): Tuning {
  try { return sanitizeTuning(JSON.parse(localStorage.getItem(TUNING_KEY) || "null")); }
  catch { return DEFAULT_TUNING; }
}

function storeTuning(tuning: Tuning) {
  try { localStorage.setItem(TUNING_KEY, JSON.stringify(tuning)); } catch { /* tuning still works for this session */ }
}

function samplePolygon(vertices: Array<{ x: number; y: number }>, t: number) {
  const position = ((t % 1) + 1) % 1 * vertices.length;
  const edge = Math.floor(position) % vertices.length;
  const local = position - Math.floor(position);
  const a = vertices[edge];
  const b = vertices[(edge + 1) % vertices.length];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

function regularVertices(sides: number, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, index) => ({
    x: Math.cos(rotation + index * TAU / sides),
    y: Math.sin(rotation + index * TAU / sides),
  }));
}

function sacredShapeOffset(shape: number, path: number, t: number) {
  const circle = (cx: number, cy: number, radius: number) => ({
    x: cx + Math.cos(t * TAU - Math.PI / 2) * radius,
    y: cy + Math.sin(t * TAU - Math.PI / 2) * radius,
  });
  switch (shape % GLYPH_COUNT) {
    case 0: return circle(0, 0, path === 0 ? 1 : .46); // concentric halo
    case 1: return path === 0 ? samplePolygon(regularVertices(3), t) : circle(0, 0, .48); // triangle mandala
    case 2: return circle(path === 0 ? -.32 : .32, 0, .68); // vesica piscis
    case 3: { // four-petal rose
      const angle = path * Math.PI / 2;
      return circle(Math.cos(angle) * .43, Math.sin(angle) * .43, .52);
    }
    case 4: { // pentagram and inner seal
      if (path === 1) return circle(0, 0, .34);
      const vertices = regularVertices(5);
      return samplePolygon([vertices[0], vertices[2], vertices[4], vertices[1], vertices[3]], t);
    }
    case 5: return path < 2
      ? samplePolygon(regularVertices(3, -Math.PI / 2 + path * Math.PI), t)
      : circle(0, 0, .34); // hexagram and inner seal
    default: { // flower of life
      if (path === 0) return circle(0, 0, .42);
      const angle = (path - 1) * TAU / 6 - Math.PI / 2;
      return circle(Math.cos(angle) * .42, Math.sin(angle) * .42, .42);
    }
  }
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

async function createOrbitEngine(canvas: HTMLCanvasElement, gpu: GpuContext): Promise<OrbitEngine | null> {
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
  const styleBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const fadeBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const lineFadeBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const displayViewBuffer = device.createBuffer({ size: 48, usage: usage.UNIFORM | usage.COPY_DST });
  const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
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
  ] });
  const pointAtlasBind = device.createBindGroup({ layout: pointPipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: styleBuffer } },
    { binding: 1, resource: { buffer: paramsAtlasBuffer } },
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
  let atlasTextures: any[] = [];
  let atlasLineTextures: any[] = [];
  let liveTexture: any = null;
  let liveLineTexture: any = null;
  let fadeBinds: any[] = [];
  let lineFadeBinds: any[] = [];
  let displayBinds: any[] = [];
  let textureIndex = 0;
  let width = 0;
  let height = 0;
  let view: ViewTransform = { centerX: INTRO_POND_CENTER.x, centerY: INTRO_POND_CENTER.y, halfY: INTRO_VIEW_HALF_Y };
  let maxDepth = DEFAULT_TUNING.maxDepth;
  let accelerationCurve = DEFAULT_TUNING.acceleration;
  let linePersist = DEFAULT_TUNING.linePersist;
  let skipColors = DEFAULT_TUNING.skipColors;
  let rotateRight = DEFAULT_TUNING.rotateRight;
  let drawLines = PLAY_ATMOSPHERE.drawLines;
  let grayscale = PLAY_ATMOSPHERE.grayscale;
  let pointEnergy = PLAY_ATMOSPHERE.energy;
  let hiddenSteps = PLAY_ATMOSPHERE.hiddenSteps;
  let lastDrawTime = 0;

  const makeAtlas = (format: string) => device.createTexture({
    size: [TRAIL_ATLAS_SIZE, TRAIL_ATLAS_SIZE],
    format,
    usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
  });
  const makeScreen = (format: string) => device.createTexture({
    size: [width, height],
    format,
    usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
  });

  function clearTextures(encoder: any, list: any[]) {
    for (const texture of list) {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      pass.end();
    }
  }

  function writeParams(buffer: any, atlasMode: number) {
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
    floats[11] = accelerationCurve;
    floats[12] = atlasMode;
    floats[13] = hiddenSteps;
    floats[16] = TRAIL_BOUNDS.xMin;
    floats[17] = TRAIL_BOUNDS.xMax;
    floats[18] = TRAIL_BOUNDS.yMin;
    floats[19] = TRAIL_BOUNDS.yMax;
    device.queue.writeBuffer(buffer, 0, bytes);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const first = !atlasTextures.length;
    if (!first && nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    liveTexture?.destroy();
    liveLineTexture?.destroy();
    liveTexture = makeScreen("rgba16float");
    liveLineTexture = makeScreen("rgba8unorm");
    if (first) {
      atlasTextures = [0, 1].map(() => makeAtlas("rgba16float"));
      atlasLineTextures = [0, 1].map(() => makeAtlas("rgba8unorm"));
      fadeBinds = atlasTextures.map((texture) => device.createBindGroup({ layout: fadePipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: sampler },
        { binding: 2, resource: { buffer: fadeBuffer } },
      ] }));
      lineFadeBinds = atlasLineTextures.map((texture) => device.createBindGroup({ layout: lineFadePipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: sampler },
        { binding: 2, resource: { buffer: lineFadeBuffer } },
      ] }));
    }
    displayBinds = atlasTextures.map((texture, index) => device.createBindGroup({ layout: displayPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: atlasLineTextures[index].createView() },
      { binding: 2, resource: liveTexture.createView() },
      { binding: 3, resource: liveLineTexture.createView() },
      { binding: 4, resource: sampler },
      { binding: 5, resource: { buffer: displayViewBuffer } },
    ] }));
    const encoder = device.createCommandEncoder({ label: "orbit-resize" });
    if (first) {
      clearTextures(encoder, atlasTextures);
      clearTextures(encoder, atlasLineTextures);
    }
    clearTextures(encoder, [liveTexture, liveLineTexture]);
    device.queue.submit([encoder.finish()]);
    if (first) textureIndex = 0;
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
    if (disposed || gpu.hasFailed() || !atlasTextures.length || suspended) return;
    const now = performance.now();
    const dt = lastDrawTime ? (now - lastDrawTime) / 1000 : 1 / 60;
    lastDrawTime = now;
    const lineRetention = lineFadeRetention(dt, linePersist);
    writeParams(paramsBuffer, 0);
    writeParams(paramsAtlasBuffer, 1);
    device.queue.writeBuffer(styleBuffer, 0, new Float32Array([pointEnergy, grayscale ? 1 : 0, skipColors ? 1 : 0, 0]));
    device.queue.writeBuffer(indirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    device.queue.writeBuffer(lineIndirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    device.queue.writeBuffer(fadeBuffer, 0, new Float32Array([1, 0, 0, 0]));
    device.queue.writeBuffer(lineFadeBuffer, 0, new Float32Array([lineRetention, 0, 0, 0]));
    const displayView = new Float32Array(12);
    displayView[0] = view.centerX;
    displayView[1] = view.centerY;
    displayView[2] = view.halfY * width / Math.max(height, 1);
    displayView[3] = view.halfY;
    displayView[4] = rotateRight ? 1 : 0;
    displayView[5] = drawLines ? 1 : 0;
    displayView[8] = TRAIL_BOUNDS.xMin;
    displayView[9] = TRAIL_BOUNDS.xMax;
    displayView[10] = TRAIL_BOUNDS.yMin;
    displayView[11] = TRAIL_BOUNDS.yMax;
    device.queue.writeBuffer(displayViewBuffer, 0, displayView);
    const destination = atlasTextures[1 - textureIndex];
    const lineDestination = atlasLineTextures[1 - textureIndex];
    const encoder = device.createCommandEncoder({ label: "orbit-draw" });
    if (sourceCount > 0 && !paused) {
      const compute = encoder.beginComputePass();
      compute.setPipeline(computePipeline);
      compute.setBindGroup(0, computeBind);
      compute.dispatchWorkgroups(Math.ceil(sourceCount / 64));
      compute.end();
    }
    const fade = encoder.beginRenderPass({ colorAttachments: [{ view: destination.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    fade.setPipeline(fadePipeline);
    fade.setBindGroup(0, fadeBinds[textureIndex]);
    fade.draw(3);
    fade.end();
    const lineFade = encoder.beginRenderPass({ colorAttachments: [{ view: lineDestination.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    lineFade.setPipeline(lineFadePipeline);
    lineFade.setBindGroup(0, lineFadeBinds[textureIndex]);
    lineFade.draw(3);
    lineFade.end();
    const live = encoder.beginRenderPass({ colorAttachments: [{ view: liveTexture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    live.end();
    const liveLinesClear = encoder.beginRenderPass({ colorAttachments: [{ view: liveLineTexture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    liveLinesClear.end();
    if (sourceCount > 0 && !paused) {
      const atlasPoints = encoder.beginRenderPass({ colorAttachments: [{ view: destination.createView(), loadOp: "load", storeOp: "store" }] });
      atlasPoints.setPipeline(pointPipeline);
      atlasPoints.setBindGroup(0, pointAtlasBind);
      atlasPoints.setVertexBuffer(0, vertexBuffer);
      atlasPoints.drawIndirect(indirectBuffer, 0);
      atlasPoints.end();
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
      if (drawLines) {
        const persistentLinePass = encoder.beginRenderPass({ colorAttachments: [{ view: lineDestination.createView(), loadOp: "load", storeOp: "store" }] });
        persistentLinePass.setPipeline(linePipeline);
        persistentLinePass.setBindGroup(0, lineAtlasBind);
        persistentLinePass.drawIndirect(lineIndirectBuffer, 0);
        persistentLinePass.end();
      }
    }
    const display = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    display.setPipeline(displayPipeline);
    display.setBindGroup(0, displayBinds[1 - textureIndex]);
    display.draw(3);
    display.end();
    device.queue.submit([encoder.finish()]);
    textureIndex = 1 - textureIndex;
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
      if (slot.added <= 0) return 0;
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
      accelerationCurve = tuning.acceleration;
      linePersist = tuning.linePersist;
      skipColors = tuning.skipColors === true;
      rotateRight = tuning.rotateRight === true;
    },
    setAtmosphere(atmosphere) {
      drawLines = atmosphere.drawLines;
      grayscale = atmosphere.grayscale;
      pointEnergy = atmosphere.energy;
      hiddenSteps = atmosphere.hiddenSteps;
    },
    clear() {
      paused = false;
      sourceCount = 0;
      nextSource = 0;
      device.queue.writeBuffer(stateBuffer, 0, new Uint8Array(MAX_SOURCES * 48));
      if (!atlasTextures.length) return;
      const encoder = device.createCommandEncoder({ label: "orbit-clear" });
      clearTextures(encoder, atlasTextures);
      clearTextures(encoder, atlasLineTextures);
      clearTextures(encoder, [liveTexture, liveLineTexture].filter(Boolean));
      device.queue.submit([encoder.finish()]);
    },
    freeze() {
      paused = true;
    },
    setSuspended(value: boolean) {
      suspended = value;
      if (!value) scheduleDraw();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      atlasTextures.forEach((texture) => texture.destroy());
      atlasLineTextures.forEach((texture) => texture.destroy());
      liveTexture?.destroy();
      liveLineTexture?.destroy();
      vertexBuffer.destroy();
      lineSegmentBuffer.destroy();
      stateBuffer.destroy();
      indirectBuffer.destroy();
      lineIndirectBuffer.destroy();
      paramsBuffer.destroy();
      paramsAtlasBuffer.destroy();
      styleBuffer.destroy();
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
  const gpuPromiseRef = useRef<Promise<GpuContext | null> | null>(null);
  const viewRef = useRef<ViewTransform>({ centerX: INTRO_POND_CENTER.x, centerY: INTRO_POND_CENTER.y, halfY: INTRO_VIEW_HALF_Y });
  const restartRef = useRef<() => void>(() => {});
  const applyViewRef = useRef<(nextView: ViewTransform) => void>(() => {});
  const playerNameRef = useRef("YOU");
  const tuningRef = useRef<Tuning>({ ...DEFAULT_TUNING });
  const invalidateFlashlightRef = useRef<() => void>(() => {});
  const invalidateGridRef = useRef<() => void>(() => {});
  const introActiveRef = useRef(false);
  const introThrowsRef = useRef(0);
  const introFadingRef = useRef(false);
  const endOpeningRef = useRef<() => void>(() => {});
  const currentShareRef = useRef<SharedThrow | null>(null);
  const pendingShareRef = useRef<SharedThrow | null | undefined>(undefined);
  const playThrowRef = useRef<((shot: SharedThrow, fromLink?: boolean) => void) | null>(null);
  const spectatorRef = useRef(false);
  const savedTuningRef = useRef<Tuning | null>(null);
  const throwAgainRef = useRef<() => void>(() => {});
  const [intro, setIntro] = useState<{ progress: number; ready?: boolean } | null>(null);
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

  useEffect(() => {
    const frame = requestAnimationFrame(() => setScores(loadScores()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = loadTuning();
      tuningRef.current = saved;
      setTuning(saved);
      engineRef.current?.setTuning(saved);
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
      const engine = await createOrbitEngine(canvas, acquired);
      if (cancelled) {
        engine?.destroy();
        return;
      }
      engineRef.current = engine;
      engine?.setView(viewRef.current);
      engine?.setTuning(tuningRef.current);
      if (introActiveRef.current) {
        engine?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH });
        engine?.setAtmosphere(INTRO_ATMOSPHERE);
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
    const share = parseThrowShare(window.location);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPondReady(true);
    if (share || reduceMotion) return;
    introActiveRef.current = true;
    spectatorRef.current = true;
    introThrowsRef.current = 0;
    introFadingRef.current = false;
    setIntro({ progress: 0 });
  }, []);

  const finishOpening = useCallback(() => {
    if (introFadingRef.current) return;
    introFadingRef.current = true;
    setIntroFading(true);
    window.setTimeout(() => {
      introActiveRef.current = false;
      spectatorRef.current = false;
      introThrowsRef.current = 0;
      introFadingRef.current = false;
      engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
      engineRef.current?.setTuning(tuningRef.current);
      applyViewRef.current({ centerX: POND_CENTER.x, centerY: POND_CENTER.y, halfY: VIEW_HALF_Y });
      restartRef.current();
      setIntro(null);
      setIntroFading(false);
    }, 600);
  }, []);
  endOpeningRef.current = finishOpening;

  const replayOpening = useCallback(() => {
    if (introActiveRef.current) return;
    introActiveRef.current = true;
    spectatorRef.current = true;
    introThrowsRef.current = 0;
    introFadingRef.current = false;
    engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH });
    engineRef.current?.setAtmosphere(INTRO_ATMOSPHERE);
    applyViewRef.current({ centerX: INTRO_POND_CENTER.x, centerY: INTRO_POND_CENTER.y, halfY: INTRO_VIEW_HALF_Y });
    restartRef.current();
    setIntroFading(false);
    setIntro({ progress: 0 });
  }, []);

  useEffect(() => {
    if (!pondReady || intro) return;
    if (pendingShareRef.current === undefined) {
      pendingShareRef.current = parseThrowShare(window.location);
    }
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
    engineRef.current?.setTuning(next);
    invalidateGridRef.current();
    invalidateFlashlightRef.current();
  }, []);

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
    let impacts: Array<{ cr: number; ci: number; born: number; index: number }> = [];
    let ripples: Array<{ cr: number; ci: number; born: number; index: number }> = [];
    let orbitScores: OrbitScore[] = [];
    let audio: AudioContext | null = null;
    let iterationSynth: {
      carrier: OscillatorNode;
      overtone: OscillatorNode;
      sideband: OscillatorNode;
      sub: OscillatorNode;
      modulator: OscillatorNode;
      pulse: OscillatorNode;
      carrierGain: GainNode;
      overtoneGain: GainNode;
      sidebandGain: GainNode;
      subGain: GainNode;
      modGain: GainNode;
      pulseGain: GainNode;
      noise: AudioBufferSourceNode;
      noiseGain: GainNode;
      noiseBurstGain: GainNode;
      noiseFilter: BiquadFilterNode;
      resonatorGain: GainNode;
      filter: BiquadFilterNode;
      drive: GainNode;
      delay: DelayNode;
      feedback: GainNode;
      wet: GainNode;
      dry: GainNode;
      gain: GainNode;
      pan: StereoPannerNode;
      shapeVoices: Array<{ oscillator: OscillatorNode; gain: GainNode; pan: StereoPannerNode }>;
    } | null = null;
    let lastSonification = 0;
    let lastIterationPulse = 0;
    let lastAudibleDepth = 0;
    let lastAudibleCoverage = 0;
    let pulseCounter = 0;
    const lastShapeCoverage = new Map<number, number>();
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
    let lastFlashlightSpawn = 0;
    let introRocks: FlyingRock[] = [];
    let introTrails: Array<{ path: Array<{ x: number; y: number }>; born: number }> = [];
    let lastIntroLaunch = 0;
    let lastIntroBackground = 0;
    let introSettleAt = 0;
    let introReady = false;
    let previewKey = "";

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

    function ensureAudio() {
      audio ||= new AudioContext();
      if (audio.state === "suspended") void audio.resume();
      return audio;
    }

    function tone(frequency: number, duration = 0.08, volume = 0.05) {
      try {
        const context = ensureAudio();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
      } catch { /* audio is optional */ }
    }

    function ensureIterationSynth() {
      if (iterationSynth) return iterationSynth;
      const context = ensureAudio();
      const carrier = context.createOscillator();
      const overtone = context.createOscillator();
      const sideband = context.createOscillator();
      const sub = context.createOscillator();
      const modulator = context.createOscillator();
      const pulse = context.createOscillator();
      const carrierGain = context.createGain();
      const overtoneGain = context.createGain();
      const sidebandGain = context.createGain();
      const subGain = context.createGain();
      const modGain = context.createGain();
      const pulseGain = context.createGain();
      const filter = context.createBiquadFilter();
      const drive = context.createGain();
      const shaper = context.createWaveShaper();
      const delay = context.createDelay(.4);
      const feedback = context.createGain();
      const wet = context.createGain();
      const dry = context.createGain();
      const pan = context.createStereoPanner();
      const gain = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const noiseGain = context.createGain();
      const noiseBurstGain = context.createGain();
      const noiseFilter = context.createBiquadFilter();
      const resonatorGain = context.createGain();
      const noise = context.createBufferSource();
      const shapeVoices = Array.from({ length: MAX_SKIPS }, (_, index) => {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        const voicePan = context.createStereoPanner();
        oscillator.type = (["sine", "triangle", "sine", "sawtooth", "triangle", "square", "sine"] as OscillatorType[])[index % GLYPH_COUNT];
        oscillator.frequency.value = 110;
        voiceGain.gain.value = .0001;
        oscillator.connect(voiceGain).connect(voicePan).connect(filter);
        return { oscillator, gain: voiceGain, pan: voicePan };
      });
      const noiseBuffer = context.createBuffer(1, Math.round(context.sampleRate * .75), context.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      let noiseState = 0x51f15e;
      for (let index = 0; index < noiseData.length; index++) {
        noiseState ^= noiseState << 13;
        noiseState ^= noiseState >>> 17;
        noiseState ^= noiseState << 5;
        noiseData[index] = ((noiseState >>> 0) / 2147483648 - 1) * .55;
      }
      noise.buffer = noiseBuffer;
      noise.loop = true;
      carrier.type = "sine";
      overtone.type = "triangle";
      sideband.type = "sawtooth";
      sub.type = "sine";
      modulator.type = "sine";
      pulse.type = "sine";
      carrierGain.gain.value = .42;
      overtoneGain.gain.value = .16;
      sidebandGain.gain.value = .02;
      subGain.gain.value = .08;
      modulator.frequency.value = 1.5;
      modGain.gain.value = 12;
      pulseGain.gain.value = .0001;
      noiseGain.gain.value = .0001;
      noiseBurstGain.gain.value = .0001;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 900;
      noiseFilter.Q.value = 5;
      resonatorGain.gain.value = .2;
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 2.2;
      drive.gain.value = 1;
      const saturationCurve = new Float32Array(1024);
      for (let index = 0; index < saturationCurve.length; index++) {
        const x = index / (saturationCurve.length - 1) * 2 - 1;
        saturationCurve[index] = Math.tanh(x * 2.35) / Math.tanh(2.35);
      }
      shaper.curve = saturationCurve;
      shaper.oversample = "2x";
      gain.gain.value = .0001;
      compressor.threshold.value = -27;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      delay.delayTime.value = .08;
      feedback.gain.value = .1;
      wet.gain.value = .08;
      dry.gain.value = .9;
      modulator.connect(modGain);
      modGain.connect(carrier.detune);
      modGain.connect(overtone.detune);
      modGain.connect(sideband.detune);
      carrier.connect(carrierGain).connect(filter);
      overtone.connect(overtoneGain).connect(filter);
      sideband.connect(sidebandGain).connect(filter);
      sub.connect(subGain).connect(filter);
      pulse.connect(pulseGain).connect(filter);
      noise.connect(noiseGain).connect(noiseFilter);
      noise.connect(noiseBurstGain).connect(noiseFilter);
      noiseFilter.connect(resonatorGain).connect(pan);
      resonatorGain.connect(delay);
      filter.connect(drive).connect(shaper);
      shaper.connect(dry).connect(pan);
      shaper.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(pan);
      pan.connect(gain).connect(compressor).connect(context.destination);
      carrier.start();
      overtone.start();
      sideband.start();
      sub.start();
      modulator.start();
      pulse.start();
      noise.start();
      shapeVoices.forEach((voice) => voice.oscillator.start());
      iterationSynth = {
        carrier, overtone, sideband, sub, modulator, pulse,
        carrierGain, overtoneGain, sidebandGain, subGain, modGain, pulseGain,
        noise, noiseGain, noiseBurstGain, noiseFilter, resonatorGain,
        filter, drive, delay, feedback, wet, dry, gain, pan, shapeVoices,
      };
      return iterationSynth;
    }

    function updateIterationSound(now: number) {
      if (!audio) return;
      const shouldPlay = (phase === "flying" || phase === "resolving") && orbitScores.length > 0;
      if (!shouldPlay) {
        if (iterationSynth) iterationSynth.gain.gain.setTargetAtTime(.0001, audio.currentTime, .08);
        return;
      }
      if (now - lastSonification < 42) return;
      lastSonification = now;
      const synth = ensureIterationSynth();
      const context = audio;
      const activeCount = orbitScores.reduce((count, orbit) => count + (orbit.resolved ? 0 : 1), 0);
      const activeRatio = activeCount / orbitScores.length;
      const deepest = orbitScores.reduce((best, orbit) => Math.max(best, orbit.shownDepth), 0);
      const depthBand = Math.log2(deepest + 1);
      const shapes = orbitScores.map(orbitShape);
      const shapeGroups = Array.from(new Set(orbitScores.map((orbit) => orbit.skip))).sort((a, b) => a - b).map((skip) => {
        const indices = orbitScores.flatMap((orbit, index) => orbit.skip === skip ? [index] : []);
        const groupShapes = indices.map((index) => shapes[index]);
        const average = (key: "area" | "spread" | "elongation" | "density" | "centroidX" | "centroidY") =>
          groupShapes.reduce((sum, shape) => sum + shape[key], 0) / Math.max(1, groupShapes.length);
        const orientationSin = groupShapes.reduce((sum, shape) => sum + Math.sin(shape.orientation * 2), 0) / Math.max(1, groupShapes.length);
        const orientationCos = groupShapes.reduce((sum, shape) => sum + Math.cos(shape.orientation * 2), 0) / Math.max(1, groupShapes.length);
        const coverage = indices.reduce((sum, index) => sum + orbitScores[index].distinct, 0);
        const previousCoverage = lastShapeCoverage.get(skip) || 0;
        const coverageMotion = Math.max(0, coverage - previousCoverage);
        lastShapeCoverage.set(skip, coverage);
        return {
          skip,
          glyph: orbitScores[indices[0]].glyph,
          area: average("area"),
          spread: average("spread"),
          elongation: average("elongation"),
          density: average("density"),
          centroidX: average("centroidX"),
          centroidY: average("centroidY"),
          orientation: .5 * Math.atan2(orientationSin, orientationCos),
          coverage,
          presence: Math.min(1, Math.log2(coverage + 1) / 10),
          activity: Math.min(1, Math.log2(coverageMotion + 1) / 5),
          deepest: indices.reduce((best, index) => Math.max(best, orbitScores[index].shownDepth), 0),
        };
      });
      const visibleShapeGroups = shapeGroups.filter((group) => group.coverage > 0);
      const shapeCountEnergy = visibleShapeGroups.length / MAX_SKIPS;
      const formationGroup = shapeGroups.reduce((best, group) => group.activity > best.activity ? group : best, shapeGroups[0]);
      const formationActivity = formationGroup?.activity || 0;
      const averageShape = (key: "area" | "spread" | "elongation" | "density" | "centroidX" | "centroidY") =>
        shapes.reduce((sum, shape) => sum + shape[key], 0) / shapes.length;
      const shapeVariance = (key: "spread" | "elongation" | "density", mean: number) =>
        shapes.reduce((sum, shape) => sum + (shape[key] - mean) ** 2, 0) / shapes.length;
      const area = averageShape("area");
      const spread = averageShape("spread");
      const elongation = averageShape("elongation");
      const density = averageShape("density");
      const centroidX = averageShape("centroidX");
      const centroidY = averageShape("centroidY");
      const dispersion = Math.min(1, Math.sqrt(shapes.reduce((sum, shape) =>
        sum + (shape.centroidX - centroidX) ** 2 + (shape.centroidY - centroidY) ** 2, 0) / shapes.length * .5));
      const featureVariance = Math.min(1, Math.sqrt(
        shapeVariance("spread", spread) + shapeVariance("elongation", elongation) + shapeVariance("density", density),
      ));
      const orientationSin = shapes.reduce((sum, shape) => sum + Math.sin(shape.orientation * 2), 0) / shapes.length;
      const orientationCos = shapes.reduce((sum, shape) => sum + Math.cos(shape.orientation * 2), 0) / shapes.length;
      const orientation = .5 * Math.atan2(orientationSin, orientationCos);
      const orientationCoherence = Math.min(1, Math.hypot(orientationSin, orientationCos));
      const coverage = orbitScores.reduce((sum, orbit) => sum + orbit.distinct, 0);
      const coverageRatio = Math.min(1, coverage / Math.max(1, orbitScores.length * 96));
      const instability = orbitScores.reduce((sum, orbit) => sum + Math.min(1, Math.hypot(orbit.zr, orbit.zi) / 2), 0) / orbitScores.length;
      const glyphDensity = Math.min(1, orbitScores.length / Math.max(1, rock.skips * MAX_SOURCE_DOTS));
      const dominantIndex = orbitScores.reduce((best, orbit, index) => {
        const weight = orbit.distinct * (.35 + shapes[index].spread) * (.6 + shapes[index].density);
        const bestWeight = orbitScores[best].distinct * (.35 + shapes[best].spread) * (.6 + shapes[best].density);
        return weight > bestWeight ? index : best;
      }, 0);
      const dominant = shapes[dominantIndex];
      const symmetry = Math.min(1, (1 - dominant.elongation) * .58 + orientationCoherence * .42);
      const chaos = Math.min(1, featureVariance * 1.7 + (1 - density) * .24 + instability * .28);
      const coverageMotion = Math.max(0, coverage - lastAudibleCoverage);
      const growth = Math.min(1, Math.log2(coverageMotion + 1) / 4.5);
      lastAudibleCoverage = coverage;
      const travelSamples = orbitScores
        .filter((orbit) => Number.isFinite(orbit.stepDistance) && orbit.stepDistance > 0)
        .map((orbit) => ({
          proximity: Math.max(0, Math.min(1, (-Math.log2(Math.max(orbit.stepDistance, 1e-12)) - .25) / 15)),
          contraction: Math.max(0, Math.min(1, orbit.distanceContraction / 1.5)),
        }));
      const upperQuantile = (values: number[]) => {
        if (!values.length) return 0;
        values.sort((a, b) => a - b);
        return values[Math.min(values.length - 1, Math.floor(values.length * .8))];
      };
      // The upper quantile lets a visible tightening family pull the pitch up
      // without one numerical outlier hijacking the complete chord.
      const distanceProximity = upperQuantile(travelSamples.map((sample) => sample.proximity));
      const contractionSignal = upperQuantile(travelSamples.map((sample) => sample.contraction));
      const distancePitchRatio = 2 ** ((distanceProximity * 14 + contractionSignal * 3) / 12);

      // Landing position selects a stable musical palette. Live topology then
      // moves independent voices through it instead of collapsing to one mean.
      const origin = orbitScores[0];
      const paletteSeed = Math.abs(Math.round((origin.cr + 2.2) * 137 + (origin.ci + 1.5) * 211));
      const scale = SONIC_SCALES[paletteSeed % SONIC_SCALES.length];
      const rootMidi = 34 + (paletteSeed * 7) % 12;
      const frequencyForDegree = (degree: number) => {
        const rounded = Math.round(degree);
        const wrapped = ((rounded % scale.length) + scale.length) % scale.length;
        const octave = Math.floor(rounded / scale.length);
        const midi = rootMidi + scale[wrapped] + octave * 12;
        return 440 * 2 ** ((midi - 69) / 12);
      };
      const topologyDegree = depthBand * .20 + dominant.spread * 3.7 + dominant.elongation * 2.8
        + (dominant.orientation / Math.PI + .5) * 2.4 + dominant.centroidY * 1.6;
      const chordWidth = 1 + Math.round(dispersion * 4 + featureVariance * 3 + shapeCountEnergy * 2);
      const frequency = Math.min(900, frequencyForDegree(topologyDegree) * distancePitchRatio);
      const overtoneFrequency = Math.min(1900,
        frequencyForDegree(topologyDegree + 2 + Math.round(symmetry * 2)) * distancePitchRatio);
      const sidebandFrequency = Math.min(2400,
        frequencyForDegree(topologyDegree + chordWidth + 3) * distancePitchRatio);
      const cutoff = Math.min(7600,
        150 + area * 2700 + density * 1500 + depthBand * 48 + chaos * 1500 + distanceProximity * 1800);
      const level = Math.min(.045,
        .007 + activeRatio * .010 + spread * .007 + coverageRatio * .006 + glyphDensity * .003
        + growth * .004 + shapeCountEnergy * .006 + formationActivity * .004);
      const panning = Math.max(-.76, Math.min(.76,
        centroidX * .52 + Math.sin(now * .001 * (.22 + dispersion * 1.7) + orientation) * dispersion * .34,
      ));
      const at = context.currentTime;
      const glyphDegrees = [0, 2, 1, 3, 4, 5, 6];
      const degreeForGroup = (group: (typeof shapeGroups)[number]) =>
        Math.log2(group.deepest + 1) * .16 + glyphDegrees[group.glyph]
        + group.spread * 3.2 + group.elongation * 2.4
        + (group.orientation / Math.PI + .5) * 2 + group.centroidY * 1.4;
      synth.shapeVoices.forEach((voice, voiceIndex) => {
        const group = shapeGroups.find((candidate) => candidate.skip === voiceIndex + 1);
        if (!group || group.coverage === 0) {
          voice.gain.gain.setTargetAtTime(.0001, at, .08);
          return;
        }
        const waveforms: OscillatorType[] = ["sine", "triangle", "sine", "sawtooth", "triangle", "square", "sine"];
        voice.oscillator.type = waveforms[group.glyph];
        voice.oscillator.frequency.setTargetAtTime(
          Math.min(1800, frequencyForDegree(degreeForGroup(group)) * distancePitchRatio), at, .065);
        voice.gain.gain.setTargetAtTime(
          .002 + group.presence * .028 + group.activity * .070 + shapeCountEnergy * .004, at, .045);
        voice.pan.pan.setTargetAtTime(
          Math.max(-.88, Math.min(.88, group.centroidX * .72 + Math.sin(group.orientation) * .15)), at, .07);
      });
      synth.carrier.frequency.setTargetAtTime(frequency, at, .055);
      synth.overtone.frequency.setTargetAtTime(overtoneFrequency, at, .075);
      synth.sideband.frequency.setTargetAtTime(sidebandFrequency, at, .085);
      synth.sub.frequency.setTargetAtTime(Math.max(28, frequency * .5), at, .10);
      synth.carrierGain.gain.setTargetAtTime(.16 + symmetry * .36, at, .10);
      synth.overtoneGain.gain.setTargetAtTime(.035 + density * .25 + orientationCoherence * .08, at, .10);
      synth.sidebandGain.gain.setTargetAtTime(.008 + dominant.elongation * .13 + chaos * .075, at, .10);
      synth.subGain.gain.setTargetAtTime(.025 + area * .16 + symmetry * .035, at, .12);
      synth.modulator.frequency.setTargetAtTime(
        .18 + density * 3.6 + dispersion * 4.2 + activeRatio + contractionSignal * 2.4, at, .12);
      synth.modGain.gain.setTargetAtTime(2 + chaos * 74 + featureVariance * 46 + contractionSignal * 18, at, .11);
      synth.filter.frequency.setTargetAtTime(cutoff, at, .08);
      synth.filter.Q.setTargetAtTime(.8 + dominant.elongation * 7.2 + symmetry * 2.6, at, .09);
      synth.drive.gain.setTargetAtTime(.62 + chaos * 1.25 + density * .42, at, .10);
      synth.noiseGain.gain.setTargetAtTime(.00015 + chaos * .010 + growth * .004, at, .07);
      synth.noiseFilter.frequency.setTargetAtTime(Math.min(7200, frequency * (2.2 + density * 5.4 + dispersion * 2.5)), at, .08);
      synth.noiseFilter.Q.setTargetAtTime(1.5 + density * 10 + orientationCoherence * 5, at, .09);
      synth.resonatorGain.gain.setTargetAtTime(.10 + chaos * .28 + growth * .24, at, .09);
      synth.delay.delayTime.setTargetAtTime(.024 + area * .12 + dispersion * .12, at, .12);
      synth.feedback.gain.setTargetAtTime(.04 + dominant.elongation * .18 + dispersion * .18, at, .14);
      synth.wet.gain.setTargetAtTime(.025 + spread * .10 + dispersion * .13 + shapeCountEnergy * .045, at, .14);
      synth.dry.gain.setTargetAtTime(.90 - chaos * .14, at, .14);
      synth.pan.pan.setTargetAtTime(panning, at, .08);
      synth.gain.gain.setTargetAtTime(level * (phase === "resolving" ? .76 : 1), at, .09);

      // A topology-derived pulse sequencer adds pitched FM strikes and modal
      // noise bursts. Different landing palettes create different motifs.
      const depthMotion = deepest - lastAudibleDepth;
      const pulseInterval = Math.max(42,
        310 - Math.min(155, depthBand * 11) - growth * 88 - chaos * 42
        - distanceProximity * 72 - formationActivity * 92);
      if ((depthMotion > 0 || formationActivity > .08) && now - lastIterationPulse >= pulseInterval) {
        const patternStep = 1 + (paletteSeed + Math.round(dominant.elongation * 5)) % Math.max(2, scale.length - 1);
        const motifRoot = formationActivity > .08 ? degreeForGroup(formationGroup) : topologyDegree;
        const motifDegree = motifRoot + (pulseCounter * patternStep) % scale.length + (pulseCounter % 4 === 3 ? chordWidth : 0);
        const accentCycle = 3 + paletteSeed % 5;
        const accent = pulseCounter % accentCycle === 0 ? 1 : .54 + symmetry * .22;
        const pulseLevel = Math.min(.88,
          (.18 + area * .18 + density * .18 + growth * .18 + chaos * .10 + formationActivity * .28) * accent);
        const pulseLength = .028 + area * .065 + symmetry * .04 + dispersion * .03
          + (formationGroup?.spread || 0) * .035;
        synth.pulse.frequency.setValueAtTime(
          Math.min(2600, frequencyForDegree(motifDegree + scale.length) * distancePitchRatio), at);
        synth.pulseGain.gain.cancelScheduledValues(at);
        synth.pulseGain.gain.setValueAtTime(.0001, at);
        synth.pulseGain.gain.exponentialRampToValueAtTime(pulseLevel, at + .008);
        synth.pulseGain.gain.exponentialRampToValueAtTime(.0001, at + pulseLength);
        const burstLevel = Math.min(.48, (.035 + chaos * .24 + growth * .18) * accent);
        synth.noiseBurstGain.gain.cancelScheduledValues(at);
        synth.noiseBurstGain.gain.setValueAtTime(.0001, at);
        synth.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(.0002, burstLevel), at + .004);
        synth.noiseBurstGain.gain.exponentialRampToValueAtTime(.0001, at + .025 + dispersion * .06);
        lastIterationPulse = now;
        lastAudibleDepth = deepest;
        pulseCounter += 1;
      }
    }

    function updateHud(force = false) {
      const now = performance.now();
      if (!force && now - lastHud < 33) return;
      const deepest = orbitScores.reduce((best, orbit) => Math.max(best, orbit.shownDepth), 0);
      const score = orbitScores.reduce((sum, orbit) => sum + scoreForOrbit(orbit, orbit.shownDepth), 0);
      const coverage = orbitScores.reduce((sum, orbit) => sum + orbit.distinct, 0);
      const spread = orbitScores.length
        ? orbitScores.reduce((sum, orbit) => sum + orbitShape(orbit).spread, 0) / orbitScores.length
        : 0;
      const resolvedRatio = orbitScores.length ? orbitScores.filter((orbit) => orbit.resolved).length / orbitScores.length : 0;
      const depthRatio = orbitScores.length ? orbitScores.reduce((sum, orbit) => sum + Math.min(1, orbit.shownDepth / tuningRef.current.maxDepth), 0) / orbitScores.length : 0;
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

    function resetRound() {
      shotId += 1;
      phase = "ready";
      pointerId = -1;
      pointerMode = "none";
      impacts = [];
      ripples = [];
      orbitScores = [];
      introRocks = [];
      introTrails = [];
      lastIntroLaunch = 0;
      lastIntroBackground = 0;
      introSettleAt = 0;
      introReady = false;
      shapeOffset = Math.floor(Math.random() * GLYPH_COUNT);
      lastShapeCoverage.clear();
      lastAudibleDepth = 0;
      lastAudibleCoverage = 0;
      lastIterationPulse = 0;
      pulseCounter = 0;
      const a = anchor();
      pull = { ...a };
      rock = { x: a.x, y: a.y, vx: 0, vy: 0, z: 0, vz: 0, spin: 0, skips: 0, bounceAge: 10 };
      setCurrentResultId(null);
      engineRef.current?.clear();
      flashlightDirty = true;
      updateHud(true);
    }
    restartRef.current = resetRound;

    function launchRock(angle: number, rawPower: number) {
      if (!introActiveRef.current) {
        engineRef.current?.clear();
        engineRef.current?.setTuning(tuningRef.current);
        engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
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
      tone(170, 0.12, 0.07);
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
      const glyph = (glyphOffset + index - 1) % GLYPH_COUNT;
      const dots = introActiveRef.current ? INTRO_SOURCE_DOTS : tuningRef.current.sourceDots;
      const sources = impactSources(
        x, y, width, height, viewRef.current, dots, glyph, tuningRef.current.rotateRight,
      );
      const gpu = extras?.gpu ?? !introActiveRef.current;
      const ripple = extras?.ripple ?? !introActiveRef.current;
      if (ripple) ripples.push({ cr: source.x, ci: source.y, born: now, index });
      if (!introActiveRef.current) {
        impacts.push({ cr: source.x, ci: source.y, born: now, index });
        for (const orbitSource of sources) {
          orbitScores.push({
            zr: 0, zi: 0,
            cr: orbitSource.x, ci: orbitSource.y, depth: 0, shownDepth: 0,
            skip: index, glyph, stepDistance: 0, distanceContraction: 0, resolved: false, score: 0,
            offscreenStreak: 0, tinyHopStreak: 0,
            cells: new Uint32Array(COVERAGE_WORDS), distinct: 0,
            sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0,
          });
        }
      }
      if (gpu) engineRef.current?.spawn(sources, index);
      if (!introActiveRef.current) {
        tone(320 + index * 62, 0.1, 0.06);
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
          orbit.score = scoreForOrbit(orbit, orbit.depth);
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
      setHud({ phase, score: total, skips: rock.skips, deepest, progress: 1, coverage, spread });
      tone(720, 0.18, 0.07);
    }

    function advanceOrbits(now: number, elapsed: number) {
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
        const perOrbit = acceleratedSteps(orbit.depth, tuningRef.current.maxDepth, maxPerOrbit, tuningRef.current.acceleration);
        for (let step = 0; step < perOrbit && orbit.depth < tuningRef.current.maxDepth; step++) {
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
        if (orbit.depth >= tuningRef.current.maxDepth) orbit.resolved = true;
        if (orbit.resolved) {
          orbit.shownDepth = orbit.depth;
          orbit.score = scoreForOrbit(orbit, orbit.depth);
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
        path: [{ x: origin.x - dx * launchPull, y: origin.y - dy * launchPull }],
        draw: throwIndex % INTRO_ROCK_DRAW_EVERY === 0,
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
        const last = body.path[body.path.length - 1];
        if (body.draw && (!last || Math.hypot(body.x - last.x, body.y - last.y) >= 3)) {
          body.path.push({ x: body.x, y: body.y });
        }
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
              ripple: body.draw,
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
        else if (body.draw && introTrails.length < 3) introTrails.push({ path: body.path, born: now });
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

    function drawFlyingRock(body: { x: number; y: number; z: number; spin: number; skips: number; bounceAge: number }, glyphOffset: number) {
      const lift = body.z * 0.30;
      const radius = 10;
      const nextShape = (glyphOffset + body.skips) % GLYPH_COUNT;
      const shapePaths = SACRED_PATH_COUNTS[nextShape];
      const heightT = Math.min(1, body.z / Math.max(pondScale() * .45, 1));
      const drawX = Math.round(body.x * dpr) / dpr;
      const drawY = Math.round((body.y - lift) * dpr) / dpr;
      const bounce = reduceMotion ? 0 : Math.exp(-body.bounceAge * 8.5) * Math.cos(body.bounceAge * 29);
      const scaleX = 1 + bounce * .11;
      const scaleY = 1 - bounce * .09;
      ctx.save();
      ctx.fillStyle = `rgba(0, 4, 9, ${0.30 * (1 - heightT * 0.72)})`;
      ctx.beginPath(); ctx.ellipse(drawX, body.y, 10.5 * (1 + Math.max(0, bounce) * .08), 3.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(scaleX, scaleY);
      ctx.rotate(body.spin * .18);
      ctx.strokeStyle = "rgba(255, 255, 255, .34)";
      ctx.lineWidth = 1;
      for (let path = 0; path < shapePaths; path++) {
        ctx.beginPath();
        for (let sample = 0; sample <= 32; sample++) {
          const offset = sacredShapeOffset(nextShape, path, sample / 32);
          if (sample === 0) ctx.moveTo(offset.x * radius, offset.y * radius);
          else ctx.lineTo(offset.x * radius, offset.y * radius);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      const previewDots = introActiveRef.current
        ? INTRO_SOURCE_DOTS
        : Math.max(MIN_SOURCE_DOTS, Math.min(18, tuningRef.current.sourceDots));
      for (let index = 0; index < previewDots; index++) {
        const path = index % shapePaths;
        const pathIndex = Math.floor(index / shapePaths);
        const samplesOnPath = Math.ceil((previewDots - path) / shapePaths);
        const offset = sacredShapeOffset(nextShape, path, pathIndex / Math.max(samplesOnPath, 1));
        ctx.beginPath();
        ctx.arc(offset.x * radius, offset.y * radius, 1.15, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawIntroTrajectory(path: Array<{ x: number; y: number }>, alpha: number) {
      if (path.length < 2 || alpha <= 0) return;
      ctx.save();
      ctx.strokeStyle = `rgba(210, 220, 224, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let index = 1; index < path.length; index++) ctx.lineTo(path[index].x, path[index].y);
      ctx.stroke();
      ctx.restore();
    }

    function drawRock(now: number) {
      if (introActiveRef.current) {
        let activeDrawn = 0;
        for (const body of introRocks) {
          if (body.draw && activeDrawn < 2) {
            drawIntroTrajectory(body.path, 0.09);
            activeDrawn += 1;
          }
        }
        introTrails = introTrails.filter((trail) => now - trail.born < INTRO_TRAIL_FADE_MS);
        for (let i = 0; i < Math.min(2, introTrails.length); i++) {
          const trail = introTrails[i];
          const t = Math.min(1, (now - trail.born) / INTRO_TRAIL_FADE_MS);
          drawIntroTrajectory(trail.path, 0.08 * (1 - t) * (1 - t));
        }
        return;
      }
      if (phase === "resolving" || phase === "result") return;
      drawFlyingRock(rock, shapeOffset);
    }

    function drawEffects(now: number) {
      const RIPPLE_LIFETIME = 2400;
      ripples = ripples.filter((ripple) => now - ripple.born < RIPPLE_LIFETIME);
      if (introActiveRef.current && ripples.length > 2) {
        ripples = ripples.slice(-2);
      }
      for (const ripple of ripples) {
        const point = complexToScreen(ripple.cr, ripple.ci, width, height, viewRef.current, tuningRef.current.rotateRight);
        const age = now - ripple.born;
        const t = age / RIPPLE_LIFETIME;
        if (t <= 0 || t >= 1) continue;
        const maxRadius = Math.max(36, minDimension() * 0.14);
        const radius = 4 + Math.pow(t, 0.72) * maxRadius;
        const envelope = Math.sin(t * Math.PI) * Math.pow(1 - t, 0.75);
        const baseGain = introActiveRef.current ? 0.52 : 0.28;
        const alpha = Math.max(0, envelope * baseGain);
        if (alpha <= 0.005) continue;
        ctx.save();
        ctx.strokeStyle = introActiveRef.current
          ? `rgba(148, 236, 255, ${alpha.toFixed(3)})`
          : `rgba(130, 215, 235, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(0.6, (introActiveRef.current ? 1.3 : 1.0) * (1 - t * 0.6));
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 8px ui-monospace, monospace";
      for (const impact of impacts) {
        const point = complexToScreen(impact.cr, impact.ci, width, height, viewRef.current, tuningRef.current.rotateRight);
        const age = now - impact.born;
        const alpha = Math.max(0.46, 0.82 - age / 9000);
        ctx.fillStyle = `rgba(220, 250, 255, ${alpha})`;
        ctx.fillText(String(impact.index), point.x, point.y + .5);
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

    function traceFlashlightCone(target: CanvasRenderingContext2D, geometry: NonNullable<ReturnType<typeof flashlightGeometry>>) {
      target.beginPath();
      target.moveTo(geometry.apexX, geometry.apexY);
      target.lineTo(geometry.leftX, geometry.leftY);
      target.quadraticCurveTo(geometry.tipX, geometry.tipY, geometry.rightX, geometry.rightY);
      target.closePath();
    }

    function drawMappedBuddhabrot(target: CanvasRenderingContext2D) {
      const source = buddhabrotSource;
      if (!source) return;
      const rotateRight = tuningRef.current.rotateRight;
      const topLeft = complexToScreen(TRAIL_BOUNDS.xMin, TRAIL_BOUNDS.yMax, width, height, viewRef.current, false);
      const bottomRight = complexToScreen(TRAIL_BOUNDS.xMax, TRAIL_BOUNDS.yMin, width, height, viewRef.current, false);
      target.save();
      if (rotateRight) {
        target.translate(width / 2, height / 2);
        target.rotate(Math.PI / 2);
        target.translate(-width / 2, -height / 2);
      }
      target.imageSmoothingEnabled = true;
      target.globalAlpha = 0.42;
      target.drawImage(source, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      target.restore();
    }

    function drawFlashlight() {
      const geometry = flashlightGeometry();
      if (!geometry) return;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, .88)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#ffffff";
      ctx.filter = `blur(${FLASHLIGHT_EDGE_BLUR_PX * dpr}px)`;
      traceFlashlightCone(ctx, geometry);
      ctx.fill();
      ctx.filter = "none";
      ctx.restore();

      if (buddhabrotSource && flashlightContext) {
        if (flashlightDirty) {
          flashlightContext.clearRect(0, 0, width, height);
          flashlightContext.save();
          flashlightContext.filter = `blur(${FLASHLIGHT_EDGE_BLUR_PX * dpr}px)`;
          const mask = flashlightContext.createLinearGradient(
            geometry.apexX,
            geometry.apexY,
            geometry.apexX + geometry.directionX * geometry.range,
            geometry.apexY + geometry.directionY * geometry.range,
          );
          mask.addColorStop(0, "rgba(255, 255, 255, .55)");
          mask.addColorStop(.08, "rgba(255, 255, 255, .92)");
          mask.addColorStop(.42, "rgba(255, 255, 255, .55)");
          mask.addColorStop(.78, "rgba(255, 255, 255, .12)");
          mask.addColorStop(1, "rgba(255, 255, 255, 0)");
          flashlightContext.fillStyle = mask;
          traceFlashlightCone(flashlightContext, geometry);
          flashlightContext.fill();
          flashlightContext.restore();
          flashlightContext.globalCompositeOperation = "source-in";
          drawMappedBuddhabrot(flashlightContext);
          flashlightContext.globalCompositeOperation = "source-over";
          flashlightDirty = false;
        }
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.34;
        ctx.drawImage(flashlightCanvas, 0, 0, width, height);
        ctx.restore();
      }

      ctx.save();
      traceFlashlightCone(ctx, geometry);
      ctx.clip();
      const haze = ctx.createLinearGradient(
        geometry.apexX,
        geometry.apexY,
        geometry.apexX + geometry.directionX * geometry.range,
        geometry.apexY + geometry.directionY * geometry.range,
      );
      haze.addColorStop(0, "rgba(184, 230, 220, .032)");
      haze.addColorStop(.38, "rgba(130, 205, 198, .011)");
      haze.addColorStop(.78, "rgba(90, 150, 150, 0)");
      haze.addColorStop(1, "rgba(90, 150, 150, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    function render(now: number) {
      ctx.clearRect(0, 0, width, height);
      const a = anchor();
      drawFlashlight();
      if (!introActiveRef.current) drawScientificGrid();
      drawPrediction(a);
      drawAimOrbitPreview(a);
      drawEffects(now);
      drawRock(now);
    }

    function spawnFlashlightPoints(now: number) {
      if (phase !== "aiming" || introActiveRef.current) return;
      const geometry = flashlightGeometry();
      if (!geometry) return;
      if (lastFlashlightSpawn !== 0 && now - lastFlashlightSpawn < FLASHLIGHT_SPAWN_MS) return;
      lastFlashlightSpawn = now;
      const ray = sampleRayInCone(geometry, Math.random);
      const mapped = screenToComplex(
        ray.x, ray.y, width, height, viewRef.current, tuningRef.current.rotateRight,
      );
      engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: FLASHLIGHT_MAX_DEPTH });
      engineRef.current?.setAtmosphere(FLASHLIGHT_ATMOSPHERE);
      engineRef.current?.spawn(
        [{ x: Math.fround(mapped.x), y: Math.fround(mapped.y) }],
        1,
        FLASHLIGHT_SOURCE_CAP,
      );
    }

    function spawnIntroBackgroundOrbits(now: number) {
      if (!introActiveRef.current || introFadingRef.current) return;
      if (lastIntroBackground !== 0 && now - lastIntroBackground < INTRO_BACKGROUND_SPAWN_MS) return;
      lastIntroBackground = now;
      engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH });
      engineRef.current?.setAtmosphere(INTRO_ATMOSPHERE);
      const seeds = Array.from({ length: INTRO_NEBULA_SEEDS_PER_WAVE }, () => introNebulaSeed());
      engineRef.current?.spawn(seeds, 1, INTRO_SOURCE_CAP);
      if (Math.random() < 0.03) {
        const rippleOrigin = introLaunchOrigin(width, height);
        const mapped = screenToComplex(rippleOrigin.x, rippleOrigin.y, width, height, viewRef.current, tuningRef.current.rotateRight);
        ripples.push({ cr: mapped.x, ci: mapped.y, born: now, index: 1 });
      }
    }

    function maybeOpeningThrow(now: number) {
      if (!introActiveRef.current || introFadingRef.current) return;
      if (!introSettleAt) introSettleAt = now;
      if (!introReady) {
        const progress = Math.min(1, (now - introSettleAt) / INTRO_SETTLE_MS);
        if (progress >= 1) {
          introReady = true;
          setIntro({ progress: 1, ready: true });
        }
      }
      const inOpeningVolley = introThrowsRef.current < INTRO_THROWS_PER_WAVE * 2;
      const interval = inOpeningVolley ? INTRO_THROW_STAGGER_MS : 2400;
      if (lastIntroLaunch !== 0 && now - lastIntroLaunch < interval) return;
      lastIntroLaunch = now;
      spectatorRef.current = true;
      engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: INTRO_MAX_DEPTH });
      engineRef.current?.setAtmosphere(INTRO_ATMOSPHERE);
      const throwCount = inOpeningVolley ? Math.min(4, INTRO_THROWS_PER_WAVE) : 1;
      for (let index = 0; index < throwCount; index++) throwIntroRock();
      if (!introReady) {
        setIntro({ progress: Math.min(1, (now - introSettleAt) / INTRO_SETTLE_MS) });
      }
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
      spawnFlashlightPoints(now);
      advanceOrbits(now, elapsed);
      updateIterationSound(now);
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

    function zoomAt(x: number, y: number, factor: number) {
      const previous = viewRef.current;
      const nextHalfY = Math.max(MIN_VIEW_HALF_Y, Math.min(MAX_VIEW_HALF_Y, previous.halfY * factor));
      if (nextHalfY === previous.halfY) return;
      const rotateRight = tuningRef.current.rotateRight;
      const focus = screenToComplex(x, y, width, height, previous, rotateRight);
      applyView(viewCenterKeepingFocus(x, y, focus, width, height, nextHalfY, rotateRight));
    }

    function onPointerDown(event: PointerEvent) {
      if (introActiveRef.current) return;
      const point = eventPoint(event);
      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);
      if (phase === "ready" && Math.hypot(point.x - rock.x, point.y - rock.y) <= 48) {
        pointerMode = "aim";
        phase = "aiming";
        plannedSkips = sampleSkipCount(Math.random);
        previewKey = "";
        flashlightDirty = true;
        lastFlashlightSpawn = 0;
        engineRef.current?.setAtmosphere(FLASHLIGHT_ATMOSPHERE);
        engineRef.current?.setTuning({ ...tuningRef.current, maxDepth: FLASHLIGHT_MAX_DEPTH });
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
        lastFlashlightSpawn = 0;
        engineRef.current?.clear();
        engineRef.current?.setTuning(tuningRef.current);
        engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
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
      lastFlashlightSpawn = 0;
      engineRef.current?.clear();
      engineRef.current?.setTuning(tuningRef.current);
      engineRef.current?.setAtmosphere(PLAY_ATMOSPHERE);
      updateHud(true);
    }

    function onWheel(event: WheelEvent) {
      if (introActiveRef.current) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(event.deltaY * 0.00125));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (introActiveRef.current) return;
      if (event.key === "Escape") cancelAim();
      if ((event.key === " " || event.key === "Enter") && phase === "result") {
        event.preventDefault();
        throwAgainRef.current();
      }
      if (event.key === "+" || event.key === "=") zoomAt(width * 0.5, height * 0.5, 0.8);
      if (event.key === "-" || event.key === "_") zoomAt(width * 0.5, height * 0.5, 1.25);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", cancelAim);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    resize();
    resetRound();
    frame = requestAnimationFrame(loop);
    return () => {
      flashlightLoadCancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", cancelAim);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      audio?.close();
      playThrowRef.current = null;
    };
  }, []);

  const instruction = hud.phase === "ready" ? "Grab the white orb. Pull back and release."
    : hud.phase === "aiming" ? "Aim for deep water · farther pull = faster throw"
    : hud.phase === "flying" ? `Each splash launches a new ${tuning.sourceDots}-point glyph`
    : hud.phase === "resolving" ? `Resolving the pond · ${Math.round(hud.progress * 100)}%`
    : "Press Space or throw again";

  const depthIndex = Math.max(0, DEPTH_OPTIONS.indexOf(tuning.maxDepth as typeof DEPTH_OPTIONS[number]));

  const resetAndFocusCanvas = () => {
    spectatorRef.current = false;
    setWatchingShare(false);
    setReplayMode(false);
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
          await navigator.share({ title: "Mandelbrot Skipping", url });
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

  const throwBusy = hud.phase === "flying" || hud.phase === "resolving" || Boolean(intro);

  return (
    <main className={`gameShell ${replayMode ? "replayMode" : ""}`}>
      <section className="playfield" aria-label="Mandelbrot rock skipping game">
        <canvas ref={gpuCanvasRef} className="gpuCanvas" aria-hidden="true" />
        <canvas ref={gameCanvasRef} className="gameCanvas" tabIndex={0} aria-label="Throw ready. Drag the white orb backward and release it across the water" />
        {replayMode && (
          <p className="replayBanner" aria-live="polite">
            <span className="replayBannerName">{sharePlayerLabel(replayName)}</span>
            <span className="replayBannerLabel">replay</span>
          </p>
        )}
        {intro && (
          <BuddhabrotIntro
            progress={intro.progress}
            fading={introFading}
            ready={intro.ready}
            onPlay={finishOpening}
          />
        )}
        {(hud.phase === "flying" || hud.phase === "resolving") && !intro && (
          <button
            type="button"
            className="playfieldThrowControl"
            onClick={resetAndFocusCanvas}
            aria-label="Cancel this throw and rethrow"
          >
            Rethrow
          </button>
        )}
        <div className="playfieldDock">
          <button
            type="button"
            className="replayOpening"
            onClick={replayOpening}
            disabled={Boolean(intro) || Boolean(gpuError)}
            aria-label="Replay the opening Buddhabrot sequence"
          >
            Replay opening
          </button>
          <HowItWorks />
        </div>
      </section>

      <aside className={`scoreRail ${hud.phase === "result" ? "hasResult" : ""}`} aria-label="Score and local high scores">
        <section className="liveScore" aria-live="polite">
          <span className="liveLabel">{hud.phase === "result" ? "Final score" : "Live score"}</span>
          <strong className="liveNumber">{formatNumber(hud.score)}</strong>
          <span className="liveMeta">{hud.skips} skips · {hud.deepest ? formatNumber(hud.deepest) : "0"} deep · {hud.coverage} cells · {Math.round(hud.spread * 100)}% spread</span>
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

        <section className="tuningPanel" aria-label="Orbit tuning">
          <div className="tuningHeading"><span>Orbit tuning</span><span>Live</span></div>
          <div className="tuningControl">
            <span><span>Glyph dots</span><output>{tuning.sourceDots}</output></span>
            <input type="range" min={MIN_SOURCE_DOTS} max={MAX_SOURCE_DOTS} step="1" value={tuning.sourceDots}
              aria-label="Dots per sacred geometry glyph"
              onChange={(event) => updateTuning({ sourceDots: Number(event.target.value) })} />
          </div>
          <div className="tuningControl">
            <span><span>Orbit limit</span><output>{formatCompact(tuning.maxDepth)}</output></span>
            <input type="range" min="0" max={DEPTH_OPTIONS.length - 1} step="1" value={depthIndex}
              aria-label="Orbit iteration limit"
              aria-valuetext={`${formatNumber(tuning.maxDepth)} iterations`}
              onChange={(event) => updateTuning({ maxDepth: DEPTH_OPTIONS[Number(event.target.value)] })} />
          </div>
          <div className="tuningControl">
            <span><span>Acceleration curve</span><output>{tuning.acceleration.toFixed(1)}×</output></span>
            <input type="range" min={MIN_ACCELERATION} max={MAX_ACCELERATION} step="0.1" value={tuning.acceleration}
              aria-label="Iteration speed acceleration curve"
              aria-valuetext={`${tuning.acceleration.toFixed(1)} curve`}
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
                : scores[0]?.id === currentResultId ? "New local best"
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
