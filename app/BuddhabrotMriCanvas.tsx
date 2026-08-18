"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useEffect, useRef, useState } from "react";
import type { GpuContext } from "@/lib/gpu";

const SEED_COUNT = 8_192;
const LAYER_COUNT = 144;
const MAX_ITERATIONS = 320;
const MIN_ORBIT = 18;
const WORKGROUP_SIZE = 64;
const POINT_STRIDE = 32;
const VISIBLE_LAYER_RADIUS = 4;

const computeShader = /* wgsl */ `
struct Params {
  seedCount: u32,
  layerCount: u32,
  maxIterations: u32,
  minOrbit: u32,
}

struct Point {
  center: vec4f,
  tangent: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> points: array<Point>;

fn hash(value: u32) -> f32 {
  var x = value;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return f32(x) / 4294967295.0;
}

fn iterate(z: vec2f, c: vec2f) -> vec2f {
  return vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
}

fn isKnownInterior(c: vec2f) -> bool {
  let bulb = (c.x + 1.0) * (c.x + 1.0) + c.y * c.y;
  let q = (c.x - 0.25) * (c.x - 0.25) + c.y * c.y;
  return bulb <= 0.0625 || q * (q + c.x - 0.25) <= 0.25 * c.y * c.y;
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3u) {
  let seed = id.x;
  if (seed >= params.seedCount) { return; }

  // Fixed seed. The volume is computed once and never randomized frame-to-frame.
  let randomBase = seed * 747796405u + 0x9e3779b9u;
  let random = vec2f(hash(randomBase), hash(randomBase ^ 0x85ebca6bu));
  let c = vec2f(mix(-2.12, 0.72, random.x), mix(-1.42, 1.42, random.y));
  var escapeAt = 0u;
  var z = vec2f(0.0);

  if (!isKnownInterior(c)) {
    for (var step = 0u; step < params.maxIterations; step++) {
      z = iterate(z, c);
      if (dot(z, z) > 4.0) {
        escapeAt = step + 1u;
        break;
      }
    }
  }
  if (escapeAt < params.minOrbit) { return; }

  // Store one orbit sample per normalized time layer. Layer-major order makes
  // the thin MRI window one contiguous instanced draw instead of the full volume.
  z = vec2f(0.0);
  var currentStep = 0u;
  for (var layer = 0u; layer < params.layerCount; layer++) {
    let targetStep = 1u + (layer * max(escapeAt - 2u, 1u)) / max(params.layerCount - 1u, 1u);
    while (currentStep < targetStep) {
      z = iterate(z, c);
      currentStep += 1u;
    }
    let after = iterate(z, c);
    let slot = layer * params.seedCount + seed;
    let normalizedLayer = f32(layer) / f32(max(params.layerCount - 1u, 1u));
    points[slot].center = vec4f(z, normalizedLayer, 1.0);
    points[slot].tangent = vec4f(after - z, f32(escapeAt) / f32(params.maxIterations), 0.0);
  }
}
`;

const pointShader = /* wgsl */ `
struct Style {
  resolution: vec2f,
  slice: f32,
  thickness: f32,
  pointScale: f32,
  aspect: f32,
  time: f32,
  intensity: f32,
}

@group(0) @binding(0) var<uniform> style: Style;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) light: f32,
  @location(2) depth: f32,
}

@vertex
fn vs(
  @location(0) centerData: vec4f,
  @location(1) tangentData: vec4f,
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOut {
  let corners = array<vec2f, 6>(
    vec2f(-3.0, -3.0), vec2f(3.0, -3.0), vec2f(-3.0, 3.0),
    vec2f(-3.0, 3.0), vec2f(3.0, -3.0), vec2f(3.0, 3.0)
  );
  var out: VertexOut;
  let layerDelta = abs(centerData.z - style.slice);
  let visible = centerData.w > 0.5 && layerDelta < style.thickness * 3.2;
  if (!visible) {
    out.position = vec4f(2.0, 2.0, 0.0, 1.0);
    out.local = vec2f(99.0);
    out.light = 0.0;
    out.depth = 0.0;
    return out;
  }

  let rawCenter = centerData.xy - vec2f(-0.50, 0.0);
  var center = vec2f(-rawCenter.x, rawCenter.y) * 0.47;
  center.x /= style.aspect;
  var tangent = vec2f(-tangentData.x, tangentData.y);
  tangent.x /= style.aspect;
  let majorDirection = normalize(tangent + vec2f(0.00001, 0.0));
  let minorDirection = vec2f(-majorDirection.y, majorDirection.x);
  let sigma = style.pointScale;
  let corner = corners[vertexIndex];
  let pixelOffset = majorDirection * corner.x * sigma * 1.25 + minorDirection * corner.y * sigma * 0.78;
  let ndcOffset = pixelOffset * 2.0 / style.resolution;
  let normalizedDelta = layerDelta / max(style.thickness, 0.0001);

  out.position = vec4f(center + ndcOffset, 0.0, 1.0);
  out.local = corner;
  out.light = exp(-0.5 * normalizedDelta * normalizedDelta) * style.intensity;
  out.depth = centerData.z;
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let radiusSquared = dot(in.local, in.local);
  if (radiusSquared > 9.0) { discard; }
  let gaussian = exp(-0.5 * radiusSquared);
  let light = gaussian * in.light;
  return vec4f(light, light * mix(0.72, 1.0, in.depth), light * mix(0.42, 0.94, in.depth), light);
}
`;

const displayShader = /* wgsl */ `
struct Display {
  resolution: vec2f,
  exposure: f32,
  time: f32,
}

@group(0) @binding(0) var lightTexture: texture_2d<f32>;
@group(0) @binding(1) var lightSampler: sampler;
@group(0) @binding(2) var<uniform> display: Display;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VertexOut;
  out.position = vec4f(positions[index], 0.0, 1.0);
  out.uv = positions[index] * vec2f(0.5, -0.5) + 0.5;
  return out;
}

fn sampleLight(uv: vec2f) -> vec3f {
  return textureSample(lightTexture, lightSampler, uv).rgb;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let texel = 1.0 / display.resolution;
  let center = sampleLight(in.uv);
  let nearGlow = (
    sampleLight(in.uv + vec2f(texel.x * 2.0, 0.0)) +
    sampleLight(in.uv - vec2f(texel.x * 2.0, 0.0)) +
    sampleLight(in.uv + vec2f(0.0, texel.y * 2.0)) +
    sampleLight(in.uv - vec2f(0.0, texel.y * 2.0))
  ) * 0.25;
  let farGlow = (
    sampleLight(in.uv + vec2f(texel.x * 8.0, texel.y * 5.0)) +
    sampleLight(in.uv + vec2f(-texel.x * 8.0, texel.y * 5.0)) +
    sampleLight(in.uv + vec2f(texel.x * 8.0, -texel.y * 5.0)) +
    sampleLight(in.uv - vec2f(texel.x * 8.0, texel.y * 5.0))
  ) * 0.25;
  let density = log(vec3f(1.0) + center * display.exposure);
  let glow = log(vec3f(1.0) + (nearGlow * 0.72 + farGlow * 0.34) * display.exposure);
  let blue = vec3f(0.018, 0.15, 1.0);
  let gold = vec3f(1.0, 0.46, 0.055);
  let white = vec3f(1.0, 0.96, 0.78);
  let scalar = dot(density, vec3f(0.333));
  var color = blue * glow.b * 1.35;
  color += mix(blue, gold, smoothstep(0.08, 0.66, scalar)) * density;
  color = mix(color, white * (0.64 + scalar), smoothstep(0.72, 1.62, scalar));
  let centered = in.uv * 2.0 - 1.0;
  color *= 1.0 - smoothstep(0.48, 1.42, dot(centered, centered));
  color = color / (vec3f(1.0) + color);
  color = pow(color, vec3f(0.82));
  return vec4f(vec3f(0.001, 0.002, 0.006) + color, 1.0);
}
`;

export default function BuddhabrotMriCanvas({
  gpuContext,
  fading,
}: {
  gpuContext: Promise<GpuContext | null> | null;
  fading: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gpuContext) return;
    const targetCanvas = canvas;
    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    async function start() {
      const gpu = await gpuContext;
      if (!gpu || disposed) return;
      const device = gpu.device;
      const context = targetCanvas.getContext("webgpu") as any;
      if (!context) return;
      context.configure({ device, format: gpu.preferredFormat, alphaMode: "opaque" });

      const bufferUsage = (globalThis as any).GPUBufferUsage;
      const textureUsage = (globalThis as any).GPUTextureUsage;
      const pointBuffer = device.createBuffer({
        label: "buddhabrot-mri-fixed-volume",
        size: SEED_COUNT * LAYER_COUNT * POINT_STRIDE,
        usage: bufferUsage.STORAGE | bufferUsage.VERTEX,
      });
      const paramsBuffer = device.createBuffer({ size: 16, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST });
      const styleBuffer = device.createBuffer({ size: 32, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST });
      const displayBuffer = device.createBuffer({ size: 16, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST });
      const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

      const computeModule = device.createShaderModule({ code: computeShader });
      const pointModule = device.createShaderModule({ code: pointShader });
      const displayModule = device.createShaderModule({ code: displayShader });
      const [computePipeline, pointPipeline, displayPipeline] = await Promise.all([
        device.createComputePipelineAsync({ layout: "auto", compute: { module: computeModule, entryPoint: "main" } }),
        device.createRenderPipelineAsync({
          layout: "auto",
          vertex: {
            module: pointModule,
            entryPoint: "vs",
            buffers: [{
              arrayStride: POINT_STRIDE,
              stepMode: "instance",
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x4" },
                { shaderLocation: 1, offset: 16, format: "float32x4" },
              ],
            }],
          },
          fragment: {
            module: pointModule,
            entryPoint: "fs",
            targets: [{
              format: "rgba16float",
              blend: {
                color: { srcFactor: "one", dstFactor: "one", operation: "add" },
                alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
              },
            }],
          },
          primitive: { topology: "triangle-list" },
        }),
        device.createRenderPipelineAsync({
          layout: "auto",
          vertex: { module: displayModule, entryPoint: "vs" },
          fragment: { module: displayModule, entryPoint: "fs", targets: [{ format: gpu.preferredFormat }] },
          primitive: { topology: "triangle-list" },
        }),
      ]);
      if (disposed) {
        pointBuffer.destroy();
        paramsBuffer.destroy();
        styleBuffer.destroy();
        displayBuffer.destroy();
        return;
      }

      const computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: paramsBuffer } },
          { binding: 1, resource: { buffer: pointBuffer } },
        ],
      });
      const pointBindGroup = device.createBindGroup({
        layout: pointPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: styleBuffer } }],
      });

      let lightTexture: any = null;
      let displayBindGroup: any = null;
      let textureSize = { width: 0, height: 0 };
      let running = !document.hidden;
      let reportedReady = false;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const startedAt = performance.now();

      device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([
        SEED_COUNT,
        LAYER_COUNT,
        MAX_ITERATIONS,
        MIN_ORBIT,
      ]));
      const precompute = device.createCommandEncoder({ label: "buddhabrot-mri-precompute" });
      const computePass = precompute.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, computeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(SEED_COUNT / WORKGROUP_SIZE));
      computePass.end();
      device.queue.submit([precompute.finish()]);

      function resize() {
        const rect = targetCanvas.getBoundingClientRect();
        const dprLimit = rect.width < 720 ? 1 : 1.25;
        const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (width === textureSize.width && height === textureSize.height) return;
        targetCanvas.width = width;
        targetCanvas.height = height;
        lightTexture?.destroy();
        lightTexture = device.createTexture({
          size: [width, height],
          format: "rgba16float",
          usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
        });
        displayBindGroup = device.createBindGroup({
          layout: displayPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: lightTexture.createView() },
            { binding: 1, resource: sampler },
            { binding: 2, resource: { buffer: displayBuffer } },
          ],
        });
        textureSize = { width, height };
      }

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(targetCanvas);
      resize();

      function draw(now: number) {
        frame = 0;
        if (disposed || !running || !lightTexture || !displayBindGroup) return;
        const seconds = (now - startedAt) * 0.001;
        const phase = reduceMotion ? 0.35 : (seconds % 9.6) / 9.6;
        const slice = 0.035 + 0.93 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
        const centerLayer = Math.round(slice * (LAYER_COUNT - 1));
        const firstLayer = Math.max(0, centerLayer - VISIBLE_LAYER_RADIUS);
        const lastLayer = Math.min(LAYER_COUNT - 1, centerLayer + VISIBLE_LAYER_RADIUS);
        const visibleLayers = lastLayer - firstLayer + 1;
        const pointScale = Math.max(0.74, Math.min(1.72, textureSize.height / 640));
        device.queue.writeBuffer(styleBuffer, 0, new Float32Array([
          textureSize.width,
          textureSize.height,
          slice,
          0.018,
          pointScale,
          textureSize.width / textureSize.height,
          seconds,
          0.12,
        ]));
        device.queue.writeBuffer(displayBuffer, 0, new Float32Array([
          textureSize.width,
          textureSize.height,
          12.5,
          seconds,
        ]));

        const encoder = device.createCommandEncoder();
        const pointPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: lightTexture.createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          }],
        });
        pointPass.setPipeline(pointPipeline);
        pointPass.setBindGroup(0, pointBindGroup);
        pointPass.setVertexBuffer(0, pointBuffer);
        pointPass.draw(6, visibleLayers * SEED_COUNT, 0, firstLayer * SEED_COUNT);
        pointPass.end();

        const displayPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          }],
        });
        displayPass.setPipeline(displayPipeline);
        displayPass.setBindGroup(0, displayBindGroup);
        displayPass.draw(3);
        displayPass.end();
        device.queue.submit([encoder.finish()]);
        if (!reportedReady) {
          reportedReady = true;
          setReady(true);
        }
        if (!reduceMotion) frame = requestAnimationFrame(draw);
      }

      const onVisibilityChange = () => {
        running = !document.hidden;
        if (!running) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else if (!frame && !disposed) {
          frame = requestAnimationFrame(draw);
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      if (running) frame = requestAnimationFrame(draw);

      cleanup = () => {
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        cancelAnimationFrame(frame);
        lightTexture?.destroy();
        pointBuffer.destroy();
        paramsBuffer.destroy();
        styleBuffer.destroy();
        displayBuffer.destroy();
        context.unconfigure();
      };
    }

    start().catch(() => undefined);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [gpuContext]);

  return (
    <canvas
      ref={canvasRef}
      className={`introMriCanvas ${ready ? "ready" : ""} ${fading ? "fading" : ""}`}
      aria-label="Precalculated GPU Buddhabrot MRI depth slices"
    />
  );
}
