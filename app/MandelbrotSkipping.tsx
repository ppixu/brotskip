"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useCallback, useEffect, useRef, useState } from "react";

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
  tortoiseR: number;
  tortoiseI: number;
  cr: number;
  ci: number;
  depth: number;
  shownDepth: number;
  skip: number;
  invisibleRun: number;
  convergenceHits: number;
  cells: Uint32Array;
  distinct: number;
  sumX: number;
  sumY: number;
  sumXX: number;
  sumYY: number;
  sumXY: number;
  resolved: boolean;
  score: number;
};

type ViewTransform = {
  centerX: number;
  centerY: number;
  halfY: number;
};

type OrbitEngine = {
  spawn: (points: Array<{ x: number; y: number }>) => void;
  setView: (view: ViewTransform) => void;
  clear: () => void;
  freeze: () => void;
  destroy: () => void;
};

const MAX_VISUAL_DEPTH = 2_000_000;
const SCORE_DEPTH_CAP = 2_000_000;
const MAX_SOURCES = 16;
const MAX_SKIPS = 7;
const SLING_DRAW_PULL_RATIO = 0.30;
const SLING_THROW_PULL_RATIO = 0.16;
const POINT_BUDGET = 200_000;
const POINT_ENERGY = 0.1;
const HIDDEN_INITIAL_STEPS = 1;
const CURVE_SEGMENTS = 6;
const LINE_SEGMENT_BUDGET = 25_000;
const LINE_SEGMENT_CAPACITY = LINE_SEGMENT_BUDGET + MAX_SOURCES;
const BASE_STEPS_PER_SOURCE = 4;
const DEPTH_STEPS_PER_ACCELERATION = 16;
const COVERAGE_GRID = 32;
const COVERAGE_WORDS = COVERAGE_GRID * COVERAGE_GRID / 32;
const FULL_GRID_VARIANCE = (COVERAGE_GRID * COVERAGE_GRID - 1) / 12;
const SCORE_SAMPLE_STRIDE = 4;
const INVISIBLE_STEP_LIMIT = 24;
const CONVERGENCE_MIN_DEPTH = 96;
const CONVERGENCE_SAMPLE_STRIDE = 1;
const CONVERGENCE_HITS = 2;
const CONVERGENCE_PIXEL_RADIUS = 0.72;
const SCORE_KEY = "mandelbrot-skipping:scores:v2";
const LEGACY_SCORE_KEY = "mandelbrot-skipping:scores:v1";
const TAU = Math.PI * 2;
const POND_CENTER = { x: -0.58, y: 0 };
const VIEW_HALF_Y = 0.8;
const SCORE_HALF_X = 1.6;
const SCORE_HALF_Y = 1.15;
const MIN_VIEW_HALF_Y = 0.035;
const MAX_VIEW_HALF_Y = 2.4;

const computeShader = /* wgsl */ `
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  convergenceRadius: f32,
  pad: f32,
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
  tortoise: vec2f,
  step: u32,
  alive: u32,
  invisibleRun: u32,
  convergenceHits: u32,
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
  let acceleratedBatch = min(params.batch, ${BASE_STEPS_PER_SOURCE}u + state.step / ${DEPTH_STEPS_PER_ACCELERATION}u);
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
    if (state.step % 2u == 0u) {
      state.tortoise = vec2f(
        state.tortoise.x * state.tortoise.x - state.tortoise.y * state.tortoise.y,
        2.0 * state.tortoise.x * state.tortoise.y
      ) + state.c;
    }
    let previousClip = (previousZ - params.center) / params.viewHalf;
    let clip = (z - params.center) / params.viewHalf;
    let depthColor = log2(f32(state.step) + 1.0) / 25.6;
    if (all(abs(clip) <= vec2f(1.0))) {
      state.invisibleRun = 0u;
      if (state.step > ${HIDDEN_INITIAL_STEPS}u) {
        let slot = atomicAdd(&drawArgs.vertexCount, 1u);
        if (slot < ${POINT_BUDGET}u) {
          vertices[slot] = OrbitPoint(clip, depthColor, 0.0);
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
              depthColor, 0.0
            );
          }
        }
      }
    } else {
      state.invisibleRun += 1u;
    }
    if (state.step >= ${CONVERGENCE_MIN_DEPTH}u && state.step % ${CONVERGENCE_SAMPLE_STRIDE}u == 0u) {
      let tortoiseClip = (state.tortoise - params.center) / params.viewHalf;
      let separationPx = length((clip - tortoiseClip) * params.viewport * 0.5);
      if (separationPx <= params.convergenceRadius) {
        state.convergenceHits += 1u;
      } else {
        state.convergenceHits = 0u;
      }
    }
    if (dot(z, z) > 4.0 || state.step >= params.maxDepth || state.invisibleRun >= ${INVISIBLE_STEP_LIMIT}u || state.convergenceHits >= ${CONVERGENCE_HITS}u) {
      state.alive = 0u;
      break;
    }
  }
  states[source] = state;
}
`;

const pointShader = /* wgsl */ `
struct Style { alpha: f32, pulse: f32, pad: vec2f }
@group(0) @binding(0) var<uniform> style: Style;
struct VSOut { @builtin(position) position: vec4f, @location(0) color: vec3f }
@vertex fn vs(@location(0) position: vec2f, @location(1) depth: f32) -> VSOut {
  var out: VSOut;
  out.position = vec4f(position, 0.0, 1.0);
  let t = clamp(depth, 0.0, 1.0);
  out.color = mix(vec3f(0.10, 0.78, 0.92), vec3f(0.92, 1.0, 0.82), t);
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
@group(0) @binding(0) var<storage, read> segments: array<CurveSegment>;
struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
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
  out.color = mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth);
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
struct Pond { aspect: f32, time: f32, pad: vec2f }
@group(0) @binding(0) var<uniform> pond: Pond;
@fragment fn pondFs(in: VSOut) -> @location(0) vec4f {
  let vertical = smoothstep(0.0, 1.0, in.uv.y);
  let radial = 1.0 - clamp(length((in.uv - 0.5) * vec2f(pond.aspect, 1.0)), 0.0, 1.0);
  let deep = vec3f(0.0);
  let near = vec3f(0.002, 0.003, 0.005);
  let color = mix(deep, near, vertical * 0.55 + radial * 0.22);
  return vec4f(color, 1.0);
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
  if (any(sourceUv < vec2f(0.0)) || any(sourceUv > vec2f(1.0))) {
    return vec4f(0.0);
  }
  return textureSample(previous, trailSampler, sourceUv) * fade.retention;
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
  let raw = textureSample(trailTexture, displaySampler, in.uv).rgb * 3.0;
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
  if (!n) return { area: 0, coverage: 0, spread: 0 };
  const meanX = orbit.sumX / n;
  const meanY = orbit.sumY / n;
  const varianceX = Math.max(0, orbit.sumXX / n - meanX * meanX);
  const varianceY = Math.max(0, orbit.sumYY / n - meanY * meanY);
  const covariance = orbit.sumXY / n - meanX * meanY;
  const area = Math.min(1, Math.sqrt(Math.max(0, varianceX * varianceY - covariance * covariance)) / FULL_GRID_VARIANCE);
  const coverage = Math.min(1, Math.log2(1 + n) / Math.log2(1 + COVERAGE_GRID * COVERAGE_GRID));
  return { area, coverage, spread: Math.sqrt(area) };
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

async function createOrbitEngine(canvas: HTMLCanvasElement, fail: (message: string) => void): Promise<OrbitEngine | null> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) {
    fail("WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.");
    return null;
  }
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) {
    fail("No GPU adapter found. Throwing still works in reduced visual mode.");
    return null;
  }
  const device = await adapter.requestDevice();
  device.addEventListener("uncapturederror", (event: any) => {
    console.error("WebGPU validation", event.error?.message || event.error);
    fail("Orbit renderer hit a GPU validation error.");
  });
  const context = canvas.getContext("webgpu") as any;
  const canvasFormat = gpu.getPreferredCanvasFormat();
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
  const pondBuffer = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
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
  ] });

  let sourceCount = 0;
  let nextSource = 0;
  let frame = 0;
  let disposed = false;
  let paused = false;
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
    device.queue.writeBuffer(pondBuffer, 0, new Float32Array([width / height, 0, 0, 0]));
    const pondBind = device.createBindGroup({ layout: pondPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: pondBuffer } },
    ] });
    const encoder = device.createCommandEncoder();
    const pondPass = encoder.beginRenderPass({ colorAttachments: [{ view: pondTexture.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    pondPass.setPipeline(pondPipeline);
    pondPass.setBindGroup(0, pondBind);
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

  function draw() {
    if (disposed || !textures.length) return;
    const batch = Math.max(1, Math.floor(POINT_BUDGET / Math.max(sourceCount, 1)));
    const ints = new Uint32Array(12);
    ints[0] = sourceCount;
    ints[1] = batch;
    ints[2] = MAX_VISUAL_DEPTH;
    ints[3] = Math.max(1, Math.floor(LINE_SEGMENT_BUDGET / Math.max(sourceCount, 1)));
    const floats = new Float32Array(ints.buffer);
    floats[4] = view.centerX;
    floats[5] = view.centerY;
    floats[6] = view.halfY * width / height;
    floats[7] = view.halfY;
    floats[8] = width;
    floats[9] = height;
    floats[10] = CONVERGENCE_PIXEL_RADIUS;
    device.queue.writeBuffer(paramsBuffer, 0, ints);
    device.queue.writeBuffer(styleBuffer, 0, new Float32Array([POINT_ENERGY, 0, 0, 0]));
    device.queue.writeBuffer(indirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    device.queue.writeBuffer(lineIndirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));
    const oldHalfX = previousView.halfY * width / height;
    const viewScale = view.halfY / previousView.halfY;
    const offsetX = (view.centerX - previousView.centerX) / (2 * oldHalfX);
    const offsetY = -(view.centerY - previousView.centerY) / (2 * previousView.halfY);
    device.queue.writeBuffer(fadeBuffer, 0, new Float32Array([1, 0, 0, 0, viewScale, viewScale, offsetX, offsetY]));
    device.queue.writeBuffer(lineFadeBuffer, 0, new Float32Array([0.92, 0, 0, 0, viewScale, viewScale, offsetX, offsetY]));
    const destination = textures[1 - textureIndex];
    const lineDestination = lineTextures[1 - textureIndex];
    const encoder = device.createCommandEncoder();
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
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);

  return {
    spawn(points) {
      paused = false;
      const states = new Float32Array(points.length * 12);
      const uintStates = new Uint32Array(states.buffer);
      points.forEach((point, index) => {
        const offset = index * 12;
        states[offset + 2] = point.x;
        states[offset + 3] = point.y;
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
    clear() {
      paused = false;
      sourceCount = 0;
      nextSource = 0;
      device.queue.writeBuffer(stateBuffer, 0, new Uint8Array(MAX_SOURCES * 48));
      if (!textures.length) return;
      const encoder = device.createCommandEncoder();
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
      pondBuffer.destroy();
      fadeBuffer.destroy();
      lineFadeBuffer.destroy();
      device.destroy();
    },
  };
}

export default function MandelbrotSkipping() {
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrbitEngine | null>(null);
  const viewRef = useRef<ViewTransform>({ centerX: POND_CENTER.x, centerY: POND_CENTER.y, halfY: VIEW_HALF_Y });
  const restartRef = useRef<() => void>(() => {});
  const playerNameRef = useRef("YOU");
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud>({ phase: "ready", score: 0, skips: 0, deepest: 0, progress: 0, coverage: 0, spread: 0 });
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState("YOU");
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setScores(loadScores()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const canvas = gpuCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    createOrbitEngine(canvas, setGpuError).then((engine) => {
      if (cancelled) engine?.destroy();
      else {
        engineRef.current = engine;
        engine?.setView(viewRef.current);
      }
    }).catch(() => setGpuError("Orbit renderer could not start. Throwing remains playable."));
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
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
    let resolveStarted = 0;
    let lastHud = 0;
    let viewChangingUntil = 0;
    let rock = { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, spin: 0, skips: 0 };
    let impacts: Array<{ cr: number; ci: number; born: number; index: number }> = [];
    let ripples: Array<{ cr: number; ci: number; born: number; index: number }> = [];
    let orbitScores: OrbitScore[] = [];
    let audio: AudioContext | null = null;

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
      if (phase === "ready" || phase === "aiming" || phase === "result") {
        const a = anchor();
        rock.x = a.x;
        rock.y = a.y;
        if (phase !== "aiming") pull = { ...a };
      }
    }

    function tone(frequency: number, duration = 0.08, volume = 0.05) {
      try {
        audio ||= new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch { /* audio is optional */ }
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
      const depthRatio = orbitScores.length ? orbitScores.reduce((sum, orbit) => sum + Math.min(1, orbit.shownDepth / SCORE_DEPTH_CAP), 0) / orbitScores.length : 0;
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
      const a = anchor();
      pull = { ...a };
      rock = { x: a.x, y: a.y, vx: 0, vy: 0, z: 0, vz: 0, spin: 0, skips: 0 };
      setCurrentResultId(null);
      engineRef.current?.clear();
      updateHud(true);
    }
    restartRef.current = resetRound;

    function spawnImpact(x: number, y: number, now: number) {
      const index = rock.skips;
      const mapped = screenToComplex(x, y, width, height, viewRef.current);
      const source = { x: Math.fround(mapped.x), y: Math.fround(mapped.y) };
      impacts.push({ cr: source.x, ci: source.y, born: now, index });
      ripples.push({ cr: source.x, ci: source.y, born: now, index });
      orbitScores.push({
        zr: 0, zi: 0, tortoiseR: 0, tortoiseI: 0,
        cr: source.x, ci: source.y, depth: 0, shownDepth: 0,
        skip: index, invisibleRun: 0,
        convergenceHits: 0, resolved: false, score: 0,
        cells: new Uint32Array(COVERAGE_WORDS), distinct: 0,
        sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0,
      });
      engineRef.current?.spawn([source]);
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
      for (const orbit of orbitScores) {
        if (orbit.resolved) continue;
        const perOrbit = Math.min(maxPerOrbit, BASE_STEPS_PER_SOURCE + Math.floor(orbit.depth / DEPTH_STEPS_PER_ACCELERATION));
        for (let step = 0; step < perOrbit && orbit.depth < SCORE_DEPTH_CAP; step++) {
          const nextR = Math.fround(Math.fround(orbit.zr * orbit.zr - orbit.zi * orbit.zi) + orbit.cr);
          orbit.zi = Math.fround(Math.fround(2 * orbit.zr * orbit.zi) + orbit.ci);
          orbit.zr = nextR;
          orbit.depth += 1;
          recordOrbitCell(orbit);
          if (orbit.depth % 2 === 0) {
            const tortoiseR = Math.fround(Math.fround(orbit.tortoiseR * orbit.tortoiseR - orbit.tortoiseI * orbit.tortoiseI) + orbit.cr);
            orbit.tortoiseI = Math.fround(Math.fround(2 * orbit.tortoiseR * orbit.tortoiseI) + orbit.ci);
            orbit.tortoiseR = tortoiseR;
          }
          const visible = Math.abs((orbit.zr - view.centerX) / viewHalfX) <= 1
            && Math.abs((orbit.zi - view.centerY) / view.halfY) <= 1;
          orbit.invisibleRun = visible ? 0 : orbit.invisibleRun + 1;
          if (orbit.depth >= CONVERGENCE_MIN_DEPTH && orbit.depth % CONVERGENCE_SAMPLE_STRIDE === 0) {
            const dxPx = (orbit.zr - orbit.tortoiseR) / viewHalfX * width * 0.5;
            const dyPx = (orbit.zi - orbit.tortoiseI) / view.halfY * height * 0.5;
            orbit.convergenceHits = dxPx * dxPx + dyPx * dyPx <= CONVERGENCE_PIXEL_RADIUS * CONVERGENCE_PIXEL_RADIUS
              ? orbit.convergenceHits + 1 : 0;
          }
          if (orbit.zr * orbit.zr + orbit.zi * orbit.zi > 4 || orbit.invisibleRun >= INVISIBLE_STEP_LIMIT || orbit.convergenceHits >= CONVERGENCE_HITS) {
            orbit.resolved = true;
            break;
          }
        }
        if (orbit.depth >= SCORE_DEPTH_CAP) orbit.resolved = true;
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
      if (rock.z <= 0 && rock.vz < 0) {
        rock.z = 0;
        if (rock.x < 24 || rock.x > width - 24 || rock.y < 24 || rock.y > height - 24) {
          startResolving(now);
          return;
        }
        rock.skips += 1;
        spawnImpact(rock.x, rock.y, now);
        rock.vz = Math.abs(rock.vz) * 0.56;
        rock.vx *= 0.79;
        rock.vy *= 0.79;
        const jitter = (makeRandom((shotId << 8) ^ rock.skips)() - 0.5) * Math.PI / 60;
        const cos = Math.cos(jitter);
        const sin = Math.sin(jitter);
        const vx = rock.vx * cos - rock.vy * sin;
        rock.vy = rock.vx * sin + rock.vy * cos;
        rock.vx = vx;
        const speed = Math.hypot(rock.vx, rock.vy);
        if (rock.skips >= MAX_SKIPS || rock.vz < minDimension() * 0.045 || speed < minDimension() * 0.08 ||
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
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, .42)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 9]);
      ctx.beginPath(); ctx.moveTo(rock.x, rock.y); ctx.lineTo(landing.x, landing.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255, 255, 255, .58)";
      ctx.beginPath(); ctx.arc(landing.x, landing.y, 8, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    function drawRock() {
      if (phase === "resolving" || phase === "result") return;
      const lift = rock.z * 0.30;
      const radius = 13;
      const heightT = Math.min(1, rock.z / Math.max(minDimension() * .45, 1));
      const drawX = Math.round(rock.x * dpr) / dpr;
      const drawY = Math.round((rock.y - lift) * dpr) / dpr;
      ctx.save();
      ctx.fillStyle = `rgba(0, 4, 9, ${0.30 * (1 - heightT * 0.72)})`;
      ctx.beginPath(); ctx.ellipse(drawX, rock.y, 14, 5, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#06111a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, TAU);
      ctx.fill(); ctx.stroke();
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
        ctx.fillStyle = "rgba(2, 10, 16, .62)";
        ctx.strokeStyle = "rgba(128, 232, 250, .22)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(point.x, point.y, 9, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(220, 250, 255, ${alpha})`;
        ctx.fillText(String(impact.index), point.x, point.y + .5);
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    function render(now: number) {
      ctx.clearRect(0, 0, width, height);
      const a = anchor();
      drawPrediction(a);
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
      if (event.pointerId !== pointerId) return;
      const point = eventPoint(event);
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
    }

    function release(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
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
      updateHud(true);
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(event.deltaY * 0.00125));
    }

    function onKeyDown(event: KeyboardEvent) {
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
    : hud.phase === "flying" ? "Each splash launches one exact complex orbit"
    : hud.phase === "resolving" ? `Resolving the pond · ${Math.round(hud.progress * 100)}%`
    : "Press Space or throw again";

  const resetAndFocusCanvas = () => {
    restartRef.current();
    requestAnimationFrame(() => gameCanvasRef.current?.focus());
  };

  return (
    <main className="gameShell">
      <section className="playfield" aria-label="Mandelbrot rock skipping game">
        <canvas ref={gpuCanvasRef} className="gpuCanvas" aria-hidden="true" />
        <canvas ref={gameCanvasRef} className="gameCanvas" tabIndex={0} aria-label="Throw ready. Drag the white orb backward and release it across the water" />
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
        <div className="railFooter">Saved on this device · score model v2 · 2M orbit cap</div>
      </aside>
    </main>
  );
}
