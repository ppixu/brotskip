"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useCallback, useEffect, useRef, useState } from "react";
import { acquireGpu, type GpuContext } from "@/lib/gpu";
import BuddhabrotIntro from "./BuddhabrotIntro";
import HowItWorks from "./HowItWorks";
import {
  indexedDbStore,
  readCachedTexture,
  selectTextureSize,
  writeCachedTexture,
} from "@/lib/buddhabrot/cache";
import {
  ESCAPE_RADIUS_SQ,
  OFFSCREEN_STREAK,
  TINY_HOP_PX,
  TINY_HOP_STREAK,
  updateOrbitEnd,
} from "@/lib/orbit-end";
import { MAX_SKIPS, MIN_SKIPS, sampleSkipCount } from "@/lib/skip-count";

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

type ViewTransform = {
  centerX: number;
  centerY: number;
  halfY: number;
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
};

type OrbitEngine = {
  spawn: (points: Array<{ x: number; y: number }>, skipIndex: number) => void;
  setView: (view: ViewTransform) => void;
  setTuning: (tuning: Tuning) => void;
  clear: () => void;
  freeze: () => void;
  setSuspended: (suspended: boolean) => void;
  destroy: () => void;
};

const GLYPH_COUNT = 7;
const SACRED_PATH_COUNTS = [2, 2, 2, 4, 2, 3, 7] as const;
const MIN_SOURCE_DOTS = 6;
const MAX_SOURCE_DOTS = 32;
const MAX_SOURCES = MAX_SKIPS * MAX_SOURCE_DOTS;
const DEPTH_OPTIONS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000] as const;
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
  acceleration: 2,
  linePersist: 0.6,
  previewOrbits: false,
  previewIterations: 20,
  skipColors: true,
  coordinateAxes: false,
};
const TUNING_KEY = "mandelbrot-skipping:tuning:v1";
const SOURCE_RADIUS_PX = 10;
const SLING_DRAW_PULL_RATIO = 0.30;
const SLING_THROW_PULL_RATIO = 0.16;
const POINT_BUDGET = 200_000;
const POINT_ENERGY = 0.18;
const HIDDEN_INITIAL_STEPS = 0;
const CURVE_SEGMENTS = 6;
const LINE_SEGMENT_BUDGET = 25_000;
const LINE_SEGMENT_CAPACITY = LINE_SEGMENT_BUDGET + MAX_SOURCES;
const BASE_STEPS_PER_SOURCE = 4;
const COVERAGE_GRID = 32;
const COVERAGE_WORDS = COVERAGE_GRID * COVERAGE_GRID / 32;
const FULL_GRID_VARIANCE = (COVERAGE_GRID * COVERAGE_GRID - 1) / 12;
const SCORE_SAMPLE_STRIDE = 4;
const MIN_VISIBLE_HOP_PX = 1;
const MAX_HOP_SCREEN_MULTIPLIER = 2;
const SCORE_KEY = "mandelbrot-skipping:scores:v2";
const LEGACY_SCORE_KEY = "mandelbrot-skipping:scores:v1";
const TAU = Math.PI * 2;
const POND_CENTER = { x: -0.58, y: 0 };
const VIEW_HALF_Y = 0.8;
const SCORE_HALF_X = 1.6;
const SCORE_HALF_Y = 1.15;
const BUDDHABROT_BOUNDS = { xMin: -2.2, xMax: 1.2, yMin: -1.5, yMax: 1.5 };
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
  minHopPx: f32,
  accelerationCurve: f32,
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
    let previousClip = (previousZ - params.center) / params.viewHalf;
    let clip = (z - params.center) / params.viewHalf;
    let hopPx = length((clip - previousClip) * params.viewport * 0.5);
    let depthColor = log2(f32(state.step) + 1.0) / 25.6;
    if (all(abs(clip) <= vec2f(1.0))) {
      if (state.step > ${HIDDEN_INITIAL_STEPS}u) {
        let slot = atomicAdd(&drawArgs.vertexCount, 1u);
        if (slot < ${POINT_BUDGET}u) {
          vertices[slot] = OrbitPoint(clip, depthColor, state.reserved.x);
        }
      }
      if (state.step > ${HIDDEN_INITIAL_STEPS + 1}u && all(abs(previousClip) <= vec2f(1.0)) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let futureClip = (future - params.center) / params.viewHalf;
        let incoming = clip - previousClip;
        let outgoing = futureClip - clip;
        let incomingLength = length(incoming);
        let outgoingLength = length(outgoing);
        let safeOutgoing = outgoing / max(outgoingLength, 0.00001);
        let curvedOutgoing = safeOutgoing * min(outgoingLength, incomingLength * 1.5);
        let control1 = previousClip + incoming / 3.0;
        let control2 = clip - curvedOutgoing / 3.0;
        if (incomingLength <= 0.5) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${CURVE_SEGMENTS * 2}u);
          let lineSlot = lineVertex / ${CURVE_SEGMENTS * 2}u;
          if (lineSlot < ${LINE_SEGMENT_CAPACITY}u) {
            lineSegments[lineSlot] = CurveSegment(
              previousClip, control1, control2, clip,
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
    state.offscreenStreak = select(state.offscreenStreak + 1u, 0u, onScreen);
    state.tinyHopStreak = select(0u, state.tinyHopStreak + 1u, hopPx <= ${TINY_HOP_PX} && hopPx == hopPx);
    let blownOffscreen = hopPx >= length(params.viewport) * ${MAX_HOP_SCREEN_MULTIPLIER}.0 && !onScreen;
    if (
      magSq > ${ESCAPE_RADIUS_SQ}.0
      || blownOffscreen
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
@group(0) @binding(0) var<uniform> style: Style;
struct VSOut { @builtin(position) position: vec4f, @location(0) color: vec3f }
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${SKIP_TINT_WGSL});
  return colors[u32(max(index, 1.0) - 1.0) % 7u];
}
@vertex fn vs(@location(0) position: vec2f, @location(1) depth: f32, @location(2) skip: f32) -> VSOut {
  var out: VSOut;
  out.position = vec4f(position, 0.0, 1.0);
  let t = clamp(depth, 0.0, 1.0);
  let depthColor = mix(vec3f(0.10, 0.78, 0.92), vec3f(0.92, 1.0, 0.82), t);
  out.color = mix(depthColor, skipTint(skip), style.colorMode);
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
@group(0) @binding(0) var<storage, read> segments: array<CurveSegment>;
@group(0) @binding(1) var<uniform> style: Style;
struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
}
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${SKIP_TINT_WGSL});
  return colors[u32(max(index, 1.0) - 1.0) % 7u];
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
  out.position = vec4f(bezier(curve, t), 0.0, 1.0);
  out.color = mix(mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth), skipTint(curve.pad), style.colorMode);
  let directionalFreshness = mix(curve.freshnessStart, curve.freshnessEnd, t);
  out.alpha = 0.34 * pow(directionalFreshness, 0.65);
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

const pondShader = /* wgsl */ `
${fullscreenVertex}
@fragment fn pondFs(in: VSOut) -> @location(0) vec4f {
  return vec4f(0.0, 0.0, 0.0, 1.0);
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
  uvScale: vec2f,
  uvOffset: vec2f,
}
@group(0) @binding(2) var<uniform> fade: FadeTransform;
@fragment fn fadeFs(in: VSOut) -> @location(0) vec4f {
  let sourceUv = (in.uv - 0.5) * fade.uvScale + 0.5 + fade.uvOffset;
  let sampled = textureSample(previous, trailSampler, clamp(sourceUv, vec2f(0.0), vec2f(1.0)));
  let inside = all(sourceUv >= vec2f(0.0)) && all(sourceUv <= vec2f(1.0));
  return select(vec4f(0.0), sampled * fade.retention, inside);
}
`;

const displayShader = /* wgsl */ `
${fullscreenVertex}
@group(0) @binding(0) var pondTexture: texture_2d<f32>;
@group(0) @binding(1) var trailTexture: texture_2d<f32>;
@group(0) @binding(2) var lineTexture: texture_2d<f32>;
@group(0) @binding(3) var displaySampler: sampler;
@fragment fn displayFs(in: VSOut) -> @location(0) vec4f {
  let base = textureSample(pondTexture, displaySampler, in.uv).rgb;
  let raw = textureSample(trailTexture, displaySampler, in.uv).rgb * 3.6;
  let mapped = raw / (vec3f(1.0) + raw);
  let glow = pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(0.72));
  let lines = textureSample(lineTexture, displaySampler, in.uv).rgb * 1.35;
  return vec4f(base + glow + lines, 1.0);
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

function screenToComplex(x: number, y: number, width: number, height: number, view: ViewTransform) {
  const aspect = width / Math.max(height, 1);
  return {
    x: view.centerX + (x / width * 2 - 1) * view.halfY * aspect,
    y: view.centerY + (1 - y / height * 2) * view.halfY,
  };
}

function complexToScreen(x: number, y: number, width: number, height: number, view: ViewTransform) {
  const halfX = view.halfY * width / Math.max(height, 1);
  return {
    x: ((x - view.centerX) / halfX + 1) * width * 0.5,
    y: (1 - (y - view.centerY) / view.halfY) * height * 0.5,
  };
}

function skipTintRgb(skipIndex: number, colored: boolean): [number, number, number] {
  if (!colored) return [SKIP_TINTS[0][0], SKIP_TINTS[0][1], SKIP_TINTS[0][2]];
  const tint = SKIP_TINTS[(Math.max(1, skipIndex) - 1) % SKIP_TINTS.length];
  return [tint[0], tint[1], tint[2]];
}

function formatCompact(value: number) {
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
  const acceleration = Math.max(0.5, Math.min(4, Math.round((Number(value?.acceleration) || DEFAULT_TUNING.acceleration) * 10) / 10));
  const linePersist = Math.max(
    MIN_LINE_PERSIST,
    Math.min(MAX_LINE_PERSIST, Math.round((Number(value?.linePersist) || DEFAULT_TUNING.linePersist) * 20) / 20),
  );
  const previewOrbits = value?.previewOrbits === true;
  const skipColors = value?.skipColors !== false;
  const coordinateAxes = value?.coordinateAxes === true;
  const requestedPreview = Math.round(Number(value?.previewIterations) || DEFAULT_TUNING.previewIterations);
  const previewIterations = Math.max(
    MIN_PREVIEW_ITERATIONS,
    Math.min(MAX_PREVIEW_ITERATIONS, requestedPreview),
  );
  return { sourceDots, maxDepth, acceleration, linePersist, previewOrbits, previewIterations, skipColors, coordinateAxes };
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

function impactSources(x: number, y: number, width: number, height: number, view: ViewTransform, count: number, shape: number) {
  const points: Array<{ x: number; y: number }> = [];
  const paths = SACRED_PATH_COUNTS[shape % SACRED_PATH_COUNTS.length];
  for (let index = 0; index < count; index++) {
    const path = index % paths;
    const pathIndex = Math.floor(index / paths);
    const samplesOnPath = Math.ceil((count - path) / paths);
    const offset = sacredShapeOffset(shape, path, pathIndex / Math.max(samplesOnPath, 1));
    const mapped = screenToComplex(x + offset.x * SOURCE_RADIUS_PX, y + offset.y * SOURCE_RADIUS_PX, width, height, view);
    points.push({ x: Math.fround(mapped.x), y: Math.fround(mapped.y) });
  }
  return points;
}

function acceleratedSteps(depth: number, maxDepth: number, budget: number, curve: number) {
  const progress = Math.max(0, Math.min(1, depth / Math.max(maxDepth, 1)));
  return Math.min(budget, Math.max(BASE_STEPS_PER_SOURCE, Math.floor(BASE_STEPS_PER_SOURCE + Math.pow(progress, curve) * Math.max(0, budget - BASE_STEPS_PER_SOURCE))));
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
  const paramsBuffer = device.createBuffer({ size: 48, usage: usage.UNIFORM | usage.COPY_DST });
  const styleBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const fadeBuffer = device.createBuffer({ size: 32, usage: usage.UNIFORM | usage.COPY_DST });
  const lineFadeBuffer = device.createBuffer({ size: 32, usage: usage.UNIFORM | usage.COPY_DST });
  const sampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
  const computeModule = device.createShaderModule({ code: computeShader });
  const pointModule = device.createShaderModule({ code: pointShader });
  const lineModule = device.createShaderModule({ code: lineShader });
  const pondModule = device.createShaderModule({ code: pondShader });
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
  const pondPipeline = device.createRenderPipeline({
    layout: "auto", vertex: { module: pondModule, entryPoint: "vs" },
    fragment: { module: pondModule, entryPoint: "pondFs", targets: [{ format: "rgba8unorm" }] },
    primitive: { topology: "triangle-list" },
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
  ] });
  const lineBind = device.createBindGroup({ layout: linePipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: lineSegmentBuffer } },
    { binding: 1, resource: { buffer: styleBuffer } },
  ] });

  let sourceCount = 0;
  let nextSource = 0;
  let frame = 0;
  let disposed = false;
  let paused = false;
  let suspended = false;
  let textures: any[] = [];
  let lineTextures: any[] = [];
  let pondTexture: any = null;
  let fadeBinds: any[] = [];
  let lineFadeBinds: any[] = [];
  let displayBinds: any[] = [];
  let textureIndex = 0;
  let width = 0;
  let height = 0;
  let view: ViewTransform = { centerX: POND_CENTER.x, centerY: POND_CENTER.y, halfY: VIEW_HALF_Y };
  let previousView: ViewTransform = { ...view };
  let cameraPausedUntil = 0;
  let maxDepth = DEFAULT_TUNING.maxDepth;
  let accelerationCurve = DEFAULT_TUNING.acceleration;
  let linePersist = DEFAULT_TUNING.linePersist;
  let skipColors = DEFAULT_TUNING.skipColors;
  let lastDrawTime = 0;

  const makeTexture = (format: string, usages: number) => device.createTexture({ size: [width, height], format, usage: usages });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = 1;
    const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    textures.forEach((texture) => texture.destroy());
    lineTextures.forEach((texture) => texture.destroy());
    pondTexture?.destroy();
    textures = [0, 1].map(() => makeTexture("rgba16float", textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING));
    lineTextures = [0, 1].map(() => makeTexture("rgba8unorm", textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING));
    pondTexture = makeTexture("rgba8unorm", textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING);
    fadeBinds = textures.map((texture) => device.createBindGroup({ layout: fadePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
      { binding: 2, resource: { buffer: fadeBuffer } },
    ] }));
    lineFadeBinds = lineTextures.map((texture) => device.createBindGroup({ layout: lineFadePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
      { binding: 2, resource: { buffer: lineFadeBuffer } },
    ] }));
    displayBinds = textures.map((texture, index) => device.createBindGroup({ layout: displayPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: pondTexture.createView() },
      { binding: 1, resource: texture.createView() },
      { binding: 2, resource: lineTextures[index].createView() },
      { binding: 3, resource: sampler },
    ] }));
    const encoder = device.createCommandEncoder({ label: "orbit-resize" });
    const pondPass = encoder.beginRenderPass({ colorAttachments: [{ view: pondTexture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    pondPass.setPipeline(pondPipeline);
    pondPass.draw(3);
    pondPass.end();
    for (const texture of textures) {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      pass.end();
    }
    for (const texture of lineTextures) {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
    textureIndex = 0;
    previousView = { ...view };
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
    if (disposed || gpu.hasFailed() || !textures.length || suspended) return;
    const now = performance.now();
    const dt = lastDrawTime ? (now - lastDrawTime) / 1000 : 1 / 60;
    lastDrawTime = now;
    const lineRetention = lineFadeRetention(dt, linePersist);
    const batch = Math.max(1, Math.floor(POINT_BUDGET / Math.max(sourceCount, 1)));
    const ints = new Uint32Array(12);
    ints[0] = sourceCount;
    ints[1] = batch;
    ints[2] = maxDepth;
    ints[3] = Math.max(1, Math.floor(LINE_SEGMENT_BUDGET / Math.max(sourceCount, 1)));
    const floats = new Float32Array(ints.buffer);
    floats[4] = view.centerX;
    floats[5] = view.centerY;
    floats[6] = view.halfY * width / height;
    floats[7] = view.halfY;
    floats[8] = width;
    floats[9] = height;
    floats[10] = MIN_VISIBLE_HOP_PX;
    floats[11] = accelerationCurve;
    device.queue.writeBuffer(paramsBuffer, 0, ints);
    device.queue.writeBuffer(styleBuffer, 0, new Float32Array([POINT_ENERGY, 0, skipColors ? 1 : 0, 0]));
    device.queue.writeBuffer(indirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    device.queue.writeBuffer(lineIndirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    const oldHalfX = previousView.halfY * width / height;
    const viewScale = view.halfY / previousView.halfY;
    const offsetX = (view.centerX - previousView.centerX) / (2 * oldHalfX);
    const offsetY = -(view.centerY - previousView.centerY) / (2 * previousView.halfY);
    device.queue.writeBuffer(fadeBuffer, 0, new Float32Array([1, 0, 0, 0, viewScale, viewScale, offsetX, offsetY]));
    device.queue.writeBuffer(lineFadeBuffer, 0, new Float32Array([lineRetention, 0, 0, 0, viewScale, viewScale, offsetX, offsetY]));
    const destination = textures[1 - textureIndex];
    const lineDestination = lineTextures[1 - textureIndex];
    const encoder = device.createCommandEncoder({ label: "orbit-draw" });
    const cameraSettling = performance.now() < cameraPausedUntil;
    if (sourceCount > 0 && !paused && !cameraSettling) {
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
    if (sourceCount > 0 && !paused && !cameraSettling) {
      const orbit = encoder.beginRenderPass({ colorAttachments: [{ view: destination.createView(), loadOp: "load", storeOp: "store" }] });
      orbit.setPipeline(pointPipeline);
      orbit.setBindGroup(0, pointBind);
      orbit.setVertexBuffer(0, vertexBuffer);
      orbit.drawIndirect(indirectBuffer, 0);
      orbit.end();
      const lines = encoder.beginRenderPass({ colorAttachments: [{ view: lineDestination.createView(), loadOp: "load", storeOp: "store" }] });
      lines.setPipeline(linePipeline);
      lines.setBindGroup(0, lineBind);
      lines.drawIndirect(lineIndirectBuffer, 0);
      lines.end();
    }
    const display = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    display.setPipeline(displayPipeline);
    display.setBindGroup(0, displayBinds[1 - textureIndex]);
    display.draw(3);
    display.end();
    device.queue.submit([encoder.finish()]);
    textureIndex = 1 - textureIndex;
    previousView = { ...view };
    scheduleDraw();
  }
  scheduleDraw();

  return {
    spawn(points, skipIndex) {
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
      if (nextSource + points.length > MAX_SOURCES) nextSource = 0;
      device.queue.writeBuffer(stateBuffer, nextSource * 48, states.buffer, states.byteOffset, states.byteLength);
      nextSource = (nextSource + points.length) % MAX_SOURCES;
      sourceCount = Math.min(MAX_SOURCES, sourceCount + points.length);
    },
    setView(nextView) {
      view = { ...nextView };
      cameraPausedUntil = performance.now() + 100;
    },
    setTuning(tuning) {
      maxDepth = tuning.maxDepth;
      accelerationCurve = tuning.acceleration;
      linePersist = tuning.linePersist;
      skipColors = tuning.skipColors === true;
    },
    clear() {
      paused = false;
      sourceCount = 0;
      nextSource = 0;
      device.queue.writeBuffer(stateBuffer, 0, new Uint8Array(MAX_SOURCES * 48));
      if (!textures.length) return;
      const encoder = device.createCommandEncoder({ label: "orbit-clear" });
      for (const texture of textures) {
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
        pass.end();
      }
      for (const texture of lineTextures) {
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
        pass.end();
      }
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
      textures.forEach((texture) => texture.destroy());
      lineTextures.forEach((texture) => texture.destroy());
      pondTexture?.destroy();
      vertexBuffer.destroy();
      lineSegmentBuffer.destroy();
      stateBuffer.destroy();
      indirectBuffer.destroy();
      lineIndirectBuffer.destroy();
      paramsBuffer.destroy();
      styleBuffer.destroy();
      fadeBuffer.destroy();
      lineFadeBuffer.destroy();
    },
  };
}

export default function MandelbrotSkipping() {
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrbitEngine | null>(null);
  const gpuPromiseRef = useRef<Promise<GpuContext | null> | null>(null);
  const viewRef = useRef<ViewTransform>({ centerX: POND_CENTER.x, centerY: POND_CENTER.y, halfY: VIEW_HALF_Y });
  const restartRef = useRef<() => void>(() => {});
  const playerNameRef = useRef("YOU");
  const tuningRef = useRef<Tuning>({ ...DEFAULT_TUNING });
  const buddhabrotSourceRef = useRef<CanvasImageSource | null>(null);
  const invalidateFlashlightRef = useRef<() => void>(() => {});
  const invalidateGridRef = useRef<() => void>(() => {});
  const introActiveRef = useRef(false);
  const [intro, setIntro] = useState<{ gpu: GpuContext; size: number; reduceMotion: boolean } | null>(null);
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
      if (introActiveRef.current) engine?.setSuspended(true);
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
    let cancelled = false;

    function adoptSource(source: CanvasImageSource) {
      if (cancelled) return;
      buddhabrotSourceRef.current = source;
      invalidateFlashlightRef.current();
    }

    function fallbackToStaticImage() {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => adoptSource(image);
      image.src = "buddhabrot-density.png";
    }

    async function boot() {
      const size = selectTextureSize(window);
      const store = indexedDbStore(window.indexedDB);
      const cached = await readCachedTexture(size, store);
      if (cancelled) return;
      if (cached) {
        adoptSource(await createImageBitmap(cached));
        return;
      }
      // Await the same acquisition the engine effect started, rather than
      // requesting a second device or polling for the first.
      const gpu = await (gpuPromiseRef.current ?? Promise.resolve(null));
      if (cancelled) return;
      if (!gpu || gpu.hasFailed()) {
        fallbackToStaticImage();
        return;
      }
      introActiveRef.current = true;
      engineRef.current?.setSuspended(true);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      if (cancelled || gpu.hasFailed()) {
        introActiveRef.current = false;
        engineRef.current?.setSuspended(false);
        fallbackToStaticImage();
        return;
      }
      setIntro({
        gpu,
        size,
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    }

    boot().catch((error: unknown) => {
      console.warn("[buddhabrot] boot failed; falling back to static image", error);
      fallbackToStaticImage();
    });
    return () => { cancelled = true; };
  }, []);

  const handleIntroReady = useCallback((bitmap: ImageBitmap, blobPromise: Promise<Blob | null>, size: number) => {
    buddhabrotSourceRef.current = bitmap;
    invalidateFlashlightRef.current();
    // Fire and forget: encoding is slow and play has already started. Use
    // the size generation actually ran at, not a fresh (possibly different)
    // selectTextureSize(window) call.
    void blobPromise.then((blob) => {
      if (blob) void writeCachedTexture(size, blob, indexedDbStore(window.indexedDB));
    });
  }, []);

  const handleIntroDismiss = useCallback(() => {
    introActiveRef.current = false;
    engineRef.current?.setSuspended(false);
    setIntro(null);
    if (!buddhabrotSourceRef.current) {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        buddhabrotSourceRef.current = image;
        invalidateFlashlightRef.current();
      };
      image.src = "buddhabrot-density.png";
    }
  }, []);

  const renameCurrent = useCallback((name: string) => {
    const clean = name.toUpperCase().replace(/[^A-Z0-9 _-]/g, "").slice(0, 12);
    playerNameRef.current = clean;
    setPlayerName(clean);
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
    let viewChangingUntil = 0;
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
    let previewKey = "";

    invalidateFlashlightRef.current = () => { flashlightDirty = true; };
    invalidateGridRef.current = () => { gridDirty = true; };

    function anchor() { return { x: width * 0.5, y: height * 0.82 }; }
    function minDimension() { return Math.min(width, height); }

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

    function spawnImpact(x: number, y: number, now: number) {
      const index = rock.skips;
      const mapped = screenToComplex(x, y, width, height, viewRef.current);
      const source = { x: Math.fround(mapped.x), y: Math.fround(mapped.y) };
      const glyph = (shapeOffset + index - 1) % GLYPH_COUNT;
      const sources = impactSources(
        x, y, width, height, viewRef.current, tuningRef.current.sourceDots, glyph,
      );
      impacts.push({ cr: source.x, ci: source.y, born: now, index });
      ripples.push({ cr: source.x, ci: source.y, born: now, index });
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
      engineRef.current?.spawn(sources, index);
      tone(320 + index * 62, 0.1, 0.06);
      if ("vibrate" in navigator) navigator.vibrate?.(12);
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
      engineRef.current?.freeze();
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
      if (now < viewChangingUntil) {
        easeShownDepths();
        updateHud();
        return;
      }
      const maxPerOrbit = Math.max(1, Math.floor(POINT_BUDGET / Math.max(orbitScores.length, 1)));
      const view = viewRef.current;
      const viewHalfX = view.halfY * width / height;
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
          const hopPx = Math.hypot(
            (nextR - previousR) / viewHalfX * width * .5,
            (nextI - previousI) / view.halfY * height * .5,
          );
          const onScreen = Math.abs(nextR - view.centerX) <= viewHalfX * 1.02
            && Math.abs(nextI - view.centerY) <= view.halfY * 1.02;
          const end = updateOrbitEnd({
            magSq: nextR * nextR + nextI * nextI,
            hopPx,
            onScreen,
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
      const gravity = minDimension() * 1.65;
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
        spawnImpact(rock.x, rock.y, now);
        const remaining = plannedSkips - rock.skips;
        rock.vz = Math.max(Math.abs(rock.vz) * 0.56, minDimension() * (0.05 + remaining * 0.008));
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
          const minSpeed = minDimension() * 0.09;
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

    function drawPrediction(a: { x: number; y: number }) {
      if (phase !== "aiming") return;
      const dx = a.x - pull.x;
      const dy = a.y - pull.y;
      const length = Math.hypot(dx, dy);
      if (length < 4) return;
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      const rawPower = Math.min(1, length / maxPull);
      const power = rawPower * rawPower * (3 - 2 * rawPower);
      const speed = minDimension() * (0.32 + 0.56 * power);
      const vx = dx / length * speed;
      const vy = dy / length * speed;
      const vz = minDimension() * (0.38 + 0.20 * power);
      const gravity = minDimension() * 1.65;
      const airtime = 2 * vz / gravity;
      const launchPull = minDimension() * SLING_THROW_PULL_RATIO * rawPower;
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
      const speed = minDimension() * (0.32 + 0.56 * power);
      const launchPull = minDimension() * SLING_THROW_PULL_RATIO * rawPower;
      let x = a.x - dx / length * launchPull;
      let y = a.y - dy / length * launchPull;
      let vx = dx / length * speed;
      let vy = dy / length * speed;
      let vz = minDimension() * (0.38 + 0.20 * power);
      let z = 1;
      let skips = 0;
      const gravity = minDimension() * 1.65;
      const dt = 1 / 120;
      const landings: Array<{ x: number; y: number; index: number; glyph: number }> = [];
      for (let step = 0; step < 120 * 20 && skips < plannedSkips; step++) {
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
        const remaining = plannedSkips - skips;
        vz = Math.max(Math.abs(vz) * 0.56, minDimension() * (0.05 + remaining * 0.008));
        vx *= 0.79;
        vy *= 0.79;
        if (remaining > 0) {
          const speed = Math.hypot(vx, vy);
          const minSpeed = minDimension() * 0.09;
          if (speed > 0 && speed < minSpeed) {
            vx *= minSpeed / speed;
            vy *= minSpeed / speed;
          }
        }
        if (skips >= plannedSkips) break;
        if (x < -50 || x > width + 50 || y < -50 || y > height + 50) break;
      }
      return landings;
    }

    function drawPreviewOrbit(
      source: { x: number; y: number },
      startScreen: { x: number; y: number },
      view: ViewTransform,
      iterations: number,
      rgb: readonly [number, number, number],
      strength: number,
    ) {
      if (!previewContext || iterations <= 0) return;
      const viewHalfX = view.halfY * width / Math.max(height, 1);
      const maxHopPx = Math.hypot(width, height) * MAX_HOP_SCREEN_MULTIPLIER;
      let zr = 0;
      let zi = 0;
      previewContext.lineWidth = 0.55;
      previewContext.lineJoin = "round";
      previewContext.lineCap = "round";
      for (let step = 0; step < iterations; step++) {
        const previousR = zr;
        const previousI = zi;
        const nextR = Math.fround(Math.fround(previousR * previousR - previousI * previousI) + source.x);
        const nextI = Math.fround(Math.fround(2 * previousR * previousI) + source.y);
        const hopPx = Math.hypot(
          (nextR - previousR) / viewHalfX * width * 0.5,
          (nextI - previousI) / view.halfY * height * 0.5,
        );
        zr = nextR;
        zi = nextI;
        if (hopPx >= maxHopPx || !Number.isFinite(hopPx)) break;
        const depth = step / Math.max(1, iterations);
        const alpha = strength * Math.pow(1 - depth, 0.72);
        const pointAlpha = Math.min(1, alpha * 1.1);
        const to = complexToScreen(nextR, nextI, width, height, view);
        if (step === 0) {
          previewContext.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pointAlpha})`;
          previewContext.beginPath();
          previewContext.arc(startScreen.x, startScreen.y, 0.8, 0, TAU);
          previewContext.fill();
          continue;
        }
        const from = step === 1
          ? startScreen
          : complexToScreen(previousR, previousI, width, height, view);
        previewContext.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
        previewContext.beginPath();
        previewContext.moveTo(from.x, from.y);
        previewContext.lineTo(to.x, to.y);
        previewContext.stroke();
        previewContext.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pointAlpha})`;
        previewContext.beginPath();
        previewContext.arc(to.x, to.y, 0.8, 0, TAU);
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
        const strength = 0.48 / (1 + (skipIndex - 1) * 0.55);
        const rgb = skipTintRgb(skipIndex, tuning.skipColors);
        const source = screenToComplex(landing.x, landing.y, width, height, view);
        drawPreviewOrbit(source, landing, view, iterations, rgb, strength);
      }
      previewContext.globalCompositeOperation = "source-over";
      previewContext.font = "700 11px ui-monospace, monospace";
      previewContext.textAlign = "center";
      previewContext.textBaseline = "middle";
      for (const landing of landings) {
        const skipIndex = landing.index;
        const markerStrength = 0.92 / (1 + (skipIndex - 1) * 0.22);
        const rgb = skipTintRgb(skipIndex, tuning.skipColors);
        previewContext.save();
        previewContext.globalAlpha = markerStrength;
        previewContext.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, .9)`;
        previewContext.lineWidth = 1.35;
        previewContext.beginPath();
        previewContext.arc(landing.x, landing.y, 8, 0, TAU);
        previewContext.stroke();
        previewContext.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, .92)`;
        previewContext.fillText(String(skipIndex), landing.x, landing.y + 0.5);
        previewContext.restore();
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
        tuningRef.current.skipColors ? "1" : "0",
        plannedSkips,
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
      const halfX = view.halfY * width / Math.max(height, 1);
      const xMin = view.centerX - halfX;
      const xMax = view.centerX + halfX;
      const yMin = view.centerY - view.halfY;
      const yMax = view.centerY + view.halfY;
      const major = scientificStep(view.halfY * 2 / Math.max(height / 92, 1));
      const minor = major / 5;
      const snap = (position: number) => Math.round(position * dpr) / dpr;
      const isMajor = (value: number) => Math.abs(value / major - Math.round(value / major)) < 1e-6;
      const isAxis = (value: number) => Math.abs(value) < minor * 1e-4;

      const traceVerticals = (majorLines: boolean) => {
        gridContext.beginPath();
        const first = Math.ceil(xMin / minor);
        const last = Math.floor(xMax / minor);
        for (let index = first; index <= last; index++) {
          const value = index * minor;
          if (isAxis(value) || isMajor(value) !== majorLines) continue;
          const x = snap(complexToScreen(value, 0, width, height, view).x);
          gridContext.moveTo(x, 0);
          gridContext.lineTo(x, height);
        }
        gridContext.stroke();
      };
      const traceHorizontals = (majorLines: boolean) => {
        gridContext.beginPath();
        const first = Math.ceil(yMin / minor);
        const last = Math.floor(yMax / minor);
        for (let index = first; index <= last; index++) {
          const value = index * minor;
          if (isAxis(value) || isMajor(value) !== majorLines) continue;
          const y = snap(complexToScreen(0, value, width, height, view).y);
          gridContext.moveTo(0, y);
          gridContext.lineTo(width, y);
        }
        gridContext.stroke();
      };

      gridContext.lineWidth = 1 / dpr;
      gridContext.strokeStyle = "rgba(104, 196, 216, .026)";
      traceVerticals(false);
      traceHorizontals(false);
      gridContext.strokeStyle = "rgba(119, 211, 228, .065)";
      traceVerticals(true);
      traceHorizontals(true);

      if (tuningRef.current.coordinateAxes) {
        const zero = complexToScreen(0, 0, width, height, view);
        const realAxisVisible = zero.y >= 0 && zero.y <= height;
        const imaginaryAxisVisible = zero.x >= 0 && zero.x <= width;
        gridContext.strokeStyle = "rgba(151, 231, 240, .18)";
        gridContext.lineWidth = 1 / dpr;
        gridContext.beginPath();
        if (realAxisVisible) {
          const y = snap(zero.y);
          gridContext.moveTo(0, y);
          gridContext.lineTo(width, y);
        }
        if (imaginaryAxisVisible) {
          const x = snap(zero.x);
          gridContext.moveTo(x, 0);
          gridContext.lineTo(x, height);
        }
        gridContext.stroke();

        gridContext.fillStyle = "rgba(171, 230, 238, .32)";
        gridContext.strokeStyle = "rgba(151, 231, 240, .14)";
        gridContext.font = "8px ui-monospace, SFMono-Regular, Menlo, monospace";
        gridContext.textBaseline = "top";
        gridContext.textAlign = "center";
        const labelY = realAxisVisible ? Math.min(height - 11, zero.y + 4) : height - 11;
        for (let index = Math.ceil(xMin / major); index <= Math.floor(xMax / major); index++) {
          const value = index * major;
          if (isAxis(value)) continue;
          const x = snap(complexToScreen(value, 0, width, height, view).x);
          if (realAxisVisible) {
            gridContext.beginPath();
            gridContext.moveTo(x, zero.y - 3);
            gridContext.lineTo(x, zero.y + 3);
            gridContext.stroke();
          }
          if (x > 18 && x < width - 18) gridContext.fillText(coordinateLabel(value, major), x, labelY);
        }
        gridContext.textBaseline = "middle";
        gridContext.textAlign = "right";
        const labelX = imaginaryAxisVisible ? Math.max(28, zero.x - 5) : 28;
        for (let index = Math.ceil(yMin / major); index <= Math.floor(yMax / major); index++) {
          const value = index * major;
          if (isAxis(value)) continue;
          const y = snap(complexToScreen(0, value, width, height, view).y);
          if (imaginaryAxisVisible) {
            gridContext.beginPath();
            gridContext.moveTo(zero.x - 3, y);
            gridContext.lineTo(zero.x + 3, y);
            gridContext.stroke();
          }
          if (y > 9 && y < height - 9) gridContext.fillText(coordinateLabel(value, major), labelX, y);
        }
        gridContext.fillStyle = "rgba(180, 239, 245, .42)";
        gridContext.font = "italic 9px ui-monospace, SFMono-Regular, Menlo, monospace";
        if (realAxisVisible) {
          gridContext.textAlign = "right";
          gridContext.textBaseline = "bottom";
          gridContext.fillText("Re(c)", width - 7, Math.max(11, zero.y - 5));
        }
        if (imaginaryAxisVisible) {
          gridContext.textAlign = "left";
          gridContext.textBaseline = "top";
          gridContext.fillText("Im(c)", Math.min(width - 34, zero.x + 6), 6);
        }
      }
      gridDirty = false;
    }

    function drawScientificGrid() {
      if (gridDirty) rebuildScientificGrid();
      ctx.drawImage(gridCanvas, 0, 0, width, height);
    }

    function drawRock() {
      if (phase === "resolving" || phase === "result") return;
      const lift = rock.z * 0.30;
      const radius = 10;
      const nextShape = (shapeOffset + rock.skips) % GLYPH_COUNT;
      const shapePaths = SACRED_PATH_COUNTS[nextShape];
      const heightT = Math.min(1, rock.z / Math.max(minDimension() * .45, 1));
      const drawX = Math.round(rock.x * dpr) / dpr;
      const drawY = Math.round((rock.y - lift) * dpr) / dpr;
      const bounce = reduceMotion ? 0 : Math.exp(-rock.bounceAge * 8.5) * Math.cos(rock.bounceAge * 29);
      const scaleX = 1 + bounce * .11;
      const scaleY = 1 - bounce * .09;
      ctx.save();
      ctx.fillStyle = `rgba(0, 4, 9, ${0.30 * (1 - heightT * 0.72)})`;
      ctx.beginPath(); ctx.ellipse(drawX, rock.y, 10.5 * (1 + Math.max(0, bounce) * .08), 3.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(scaleX, scaleY);
      ctx.rotate(rock.spin * .18);
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
      const previewDots = Math.max(MIN_SOURCE_DOTS, Math.min(18, tuningRef.current.sourceDots));
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

    function drawEffects(now: number) {
      ripples = ripples.filter((ripple) => now - ripple.born < 1000);
      for (const ripple of ripples) {
        const point = complexToScreen(ripple.cr, ripple.ci, width, height, viewRef.current);
        const t = (now - ripple.born) / 1000;
        for (let ring = 0; ring < 2; ring++) {
          const rt = Math.max(0, t - ring * .11);
          ctx.strokeStyle = `rgba(151, 241, 255, ${Math.max(0, .55 - rt * .55)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(point.x, point.y, 5 + rt * 34, 0, TAU); ctx.stroke();
        }
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 8px ui-monospace, monospace";
      for (const impact of impacts) {
        const point = complexToScreen(impact.cr, impact.ci, width, height, viewRef.current);
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
      const halfAngle = .29;
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
      const topLeft = complexToScreen(BUDDHABROT_BOUNDS.xMin, BUDDHABROT_BOUNDS.yMax, width, height, viewRef.current);
      const bottomRight = complexToScreen(BUDDHABROT_BOUNDS.xMax, BUDDHABROT_BOUNDS.yMin, width, height, viewRef.current);
      const source = buddhabrotSourceRef.current;
      if (!source) return;
      target.save();
      target.imageSmoothingEnabled = true;
      target.drawImage(source, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      target.restore();
    }

    function drawFlashlight() {
      const geometry = flashlightGeometry();
      if (!geometry || !buddhabrotSourceRef.current || !flashlightContext) return;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, .88)";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      if (flashlightDirty) {
        flashlightContext.clearRect(0, 0, width, height);
        flashlightContext.save();
        flashlightContext.filter = `blur(${14 * dpr}px)`;
        const mask = flashlightContext.createLinearGradient(
          geometry.apexX,
          geometry.apexY,
          geometry.apexX + geometry.directionX * geometry.range,
          geometry.apexY + geometry.directionY * geometry.range,
        );
        mask.addColorStop(0, "rgba(255, 255, 255, .72)");
        mask.addColorStop(.055, "rgba(255, 255, 255, .96)");
        mask.addColorStop(.30, "rgba(255, 255, 255, .62)");
        mask.addColorStop(.62, "rgba(255, 255, 255, .22)");
        mask.addColorStop(.84, "rgba(255, 255, 255, .06)");
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
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = .28;
      ctx.drawImage(flashlightCanvas, 0, 0, width, height);
      ctx.restore();

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
      drawScientificGrid();
      drawFlashlight();
      drawPrediction(a);
      drawAimOrbitPreview(a);
      drawEffects(now);
      drawRock();
    }

    function loop(now: number) {
      const elapsed = Math.min(.05, (now - lastTime) / 1000);
      lastTime = now;
      accumulator += elapsed;
      const fixed = 1 / 120;
      while (accumulator >= fixed) {
        simulate(fixed, now);
        accumulator -= fixed;
      }
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
      viewRef.current = nextView;
      viewChangingUntil = performance.now() + 100;
      gridDirty = true;
      flashlightDirty = true;
      engineRef.current?.setView(nextView);
    }

    function zoomAt(x: number, y: number, factor: number) {
      const previous = viewRef.current;
      const nextHalfY = Math.max(MIN_VIEW_HALF_Y, Math.min(MAX_VIEW_HALF_Y, previous.halfY * factor));
      if (nextHalfY === previous.halfY) return;
      const aspect = width / Math.max(height, 1);
      const nx = x / width * 2 - 1;
      const ny = 1 - y / height * 2;
      const focus = screenToComplex(x, y, width, height, previous);
      applyView({
        centerX: focus.x - nx * nextHalfY * aspect,
        centerY: focus.y - ny * nextHalfY,
        halfY: nextHalfY,
      });
    }

    function onPointerDown(event: PointerEvent) {
      const point = eventPoint(event);
      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);
      if (phase === "ready" && Math.hypot(point.x - rock.x, point.y - rock.y) <= 48) {
        pointerMode = "aim";
        phase = "aiming";
        plannedSkips = sampleSkipCount(Math.random);
        previewKey = "";
        flashlightDirty = true;
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
        const dx = point.x - panOrigin.x;
        const dy = point.y - panOrigin.y;
        const aspect = width / Math.max(height, 1);
        applyView({
          centerX: panView.centerX - dx / width * 2 * panView.halfY * aspect,
          centerY: panView.centerY + dy / height * 2 * panView.halfY,
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
        updateHud(true);
        return;
      }
      const maxPull = minDimension() * SLING_DRAW_PULL_RATIO;
      const rawPower = Math.min(1, length / maxPull);
      const power = rawPower * rawPower * (3 - 2 * rawPower);
      const speed = minDimension() * (.32 + .56 * power);
      const launchPull = minDimension() * SLING_THROW_PULL_RATIO * rawPower;
      rock.x = a.x - dx / length * launchPull;
      rock.y = a.y - dy / length * launchPull;
      rock.vx = dx / length * speed;
      rock.vy = dy / length * speed;
      rock.vz = minDimension() * (.38 + .20 * power);
      rock.z = 1;
      phase = "flying";
      tone(170, .12, .07);
      updateHud(true);
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
      updateHud(true);
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(event.deltaY * 0.00125));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (introActiveRef.current) return;
      if (event.key === "Escape") cancelAim();
      if ((event.key === " " || event.key === "Enter") && phase === "result") {
        event.preventDefault();
        resetRound();
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
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", cancelAim);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      audio?.close();
    };
  }, []);

  const instruction = hud.phase === "ready" ? "Grab the white orb. Pull back and release."
    : hud.phase === "aiming" ? "Aim for deep water · farther pull = faster throw"
    : hud.phase === "flying" ? `Each splash launches a new ${tuning.sourceDots}-point glyph`
    : hud.phase === "resolving" ? `Resolving the pond · ${Math.round(hud.progress * 100)}%`
    : "Press Space or throw again";

  const depthIndex = Math.max(0, DEPTH_OPTIONS.indexOf(tuning.maxDepth as typeof DEPTH_OPTIONS[number]));

  const resetAndFocusCanvas = () => {
    restartRef.current();
    requestAnimationFrame(() => gameCanvasRef.current?.focus());
  };

  return (
    <main className="gameShell">
      <section className="playfield" aria-label="Mandelbrot rock skipping game">
        <canvas ref={gpuCanvasRef} className="gpuCanvas" aria-hidden="true" />
        <canvas ref={gameCanvasRef} className="gameCanvas" tabIndex={0} aria-label="Throw ready. Drag the white orb backward and release it across the water" />
        {intro && (
          <BuddhabrotIntro
            gpu={intro.gpu}
            size={intro.size}
            reduceMotion={intro.reduceMotion}
            onReady={handleIntroReady}
            onDismiss={handleIntroDismiss}
          />
        )}
        <HowItWorks />
      </section>

      <aside className={`scoreRail ${hud.phase === "result" ? "hasResult" : ""}`} aria-label="Score and local high scores">
        <section className="liveScore" aria-live="polite">
          <span className="liveLabel">{hud.phase === "result" ? "Final score" : "Live score"}</span>
          <strong className="liveNumber">{formatNumber(hud.score)}</strong>
          <span className="liveMeta">{hud.skips} skips · {hud.deepest ? formatNumber(hud.deepest) : "0"} deep · {hud.coverage} cells · {Math.round(hud.spread * 100)}% spread</span>
          <span className="liveProgress"><i style={{ width: `${Math.max(2, hud.progress * 100)}%` }} /></span>
          {(hud.phase === "flying" || hud.phase === "resolving") && (
            <button className="rethrowButton" onClick={resetAndFocusCanvas} aria-label="Cancel this throw and rethrow">Rethrow</button>
          )}
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
            <input type="range" min="0.5" max="4" step="0.1" value={tuning.acceleration}
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
          <div className="tuningControl">
            <span><span>Preview iterations</span><output>{tuning.previewIterations}</output></span>
            <input type="range" min={MIN_PREVIEW_ITERATIONS} max={MAX_PREVIEW_ITERATIONS} step="1" value={tuning.previewIterations}
              aria-label="Orbit iterations to draw while aiming"
              aria-valuetext={`${tuning.previewIterations} iterations`}
              onChange={(event) => updateTuning({ previewIterations: Number(event.target.value) })} />
          </div>
          <p className="tuningNote">Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations and brightness each skip. Skip colors tint preview and live trails per splash.</p>
        </section>

        {hud.phase === "result" && (
          <section className="railResult" aria-label="Throw result">
            <div className="resultEyebrow">{scores[0]?.id === currentResultId ? "New local best" : "Throw complete"}</div>
            <div className="resultStats">{hud.skips} exact paths · {formatNumber(hud.deepest)} deep · {hud.coverage} distinct cells · {Math.round(hud.spread * 100)}% spread.</div>
            <div className="nameRow">
              <input className="nameInput" aria-label="High score name" value={playerName} maxLength={12} onChange={(event) => renameCurrent(event.target.value)} />
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
