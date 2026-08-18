"use client";

/* WebGPU types are not part of this project's TypeScript DOM library yet. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";

const SEED_COUNT = 2_048;
const ITERATIONS = 256;
const WORKGROUP_SIZE = 64;
const POINT_STRIDE = 32;

const computeShader = /* wgsl */ `
struct Params {
  focus: vec2f,
  spread: f32,
  depth: f32,
  seedCount: u32,
  iterations: u32,
  epoch: u32,
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

  let randomBase = seed * 747796405u + params.epoch * 2891336453u;
  let jitter = vec2f(hash(randomBase), hash(randomBase ^ 0x9e3779b9u)) * 2.0 - 1.0;
  let c = params.focus + jitter * params.spread;
  var escapeAt = 0u;
  var z = vec2f(0.0);

  if (!isKnownInterior(c)) {
    for (var step = 0u; step < params.iterations; step++) {
      z = iterate(z, c);
      if (dot(z, z) > 4.0) {
        escapeAt = step + 1u;
        break;
      }
    }
  }

  z = vec2f(0.0);
  for (var step = 0u; step < params.iterations; step++) {
    let slot = seed * params.iterations + step;
    if (escapeAt < params.minOrbit || step >= escapeAt) {
      points[slot].center = vec4f(0.0);
      points[slot].tangent = vec4f(0.0);
      continue;
    }

    let next = iterate(z, c);
    let after = iterate(next, c);
    let denominator = max(f32(escapeAt - 1u), 1.0);
    let orbitTime = f32(step) / denominator;
    let layer = (orbitTime - 0.5) * params.depth;
    let layerStep = params.depth / denominator;
    points[slot].center = vec4f(next.x, next.y, layer, 1.0);
    points[slot].tangent = vec4f(after - next, layerStep, orbitTime);
    z = next;
  }
}
`;

const pointShader = /* wgsl */ `
struct Style {
  resolution: vec2f,
  yaw: f32,
  pitch: f32,
  distance: f32,
  aspect: f32,
  focal: f32,
  pointScale: f32,
  alpha: f32,
  time: f32,
  padding: vec2f,
}

@group(0) @binding(0) var<uniform> style: Style;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec3f,
}

fn viewPoint(raw: vec3f) -> vec3f {
  // Turn the usual complex plane so the period-2 bulb forms the Buddha head.
  let point = vec3f(raw.y, -(raw.x + 0.5), raw.z);
  let cy = cos(style.yaw);
  let sy = sin(style.yaw);
  let cp = cos(style.pitch);
  let sp = sin(style.pitch);
  let yawed = vec3f(cy * point.x + sy * point.z, point.y, -sy * point.x + cy * point.z);
  return vec3f(yawed.x, cp * yawed.y - sp * yawed.z,
               sp * yawed.y + cp * yawed.z + style.distance);
}

fn project(point: vec3f) -> vec2f {
  return point.xy / (max(point.z, 0.05) * style.focal * vec2f(style.aspect, 1.0));
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
  if (centerData.w < 0.5) {
    out.position = vec4f(2.0, 2.0, 0.0, 1.0);
    out.local = vec2f(99.0);
    out.color = vec3f(0.0);
    return out;
  }

  let centerView = viewPoint(centerData.xyz);
  let tangentView = viewPoint(centerData.xyz + tangentData.xyz) - centerView;
  let centerNdc = project(centerView);
  let tangentNdc = project(centerView + tangentView) - centerNdc;
  let tangentPixels = tangentNdc * style.resolution;
  let majorDirection = tangentPixels / max(length(tangentPixels), 0.0001);
  let minorDirection = vec2f(-majorDirection.y, majorDirection.x);
  let perspective = style.resolution.y / max(centerView.z * style.focal, 0.1);
  let sigma = clamp(0.0030 * style.pointScale * perspective, 0.30, 2.8);
  let corner = corners[vertexIndex];
  let pixelOffset = majorDirection * corner.x * sigma * 1.25 + minorDirection * corner.y * sigma * 0.75;
  let ndcOffset = pixelOffset * 2.0 / style.resolution;

  out.position = vec4f((centerNdc + ndcOffset) * centerView.z, 0.0, centerView.z);
  out.local = corner;
  let early = vec3f(0.16, 0.45, 0.92);
  let middle = vec3f(0.53, 0.76, 1.0);
  let late = vec3f(1.0, 0.91, 0.80);
  let orbitTime = tangentData.w;
  out.color = select(
    mix(early, middle, orbitTime * 2.0),
    mix(middle, late, (orbitTime - 0.5) * 2.0),
    orbitTime > 0.5
  );
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let radiusSquared = dot(in.local, in.local);
  if (radiusSquared > 9.0) { discard; }
  let energy = exp(-0.5 * radiusSquared) * style.alpha;
  return vec4f(in.color * energy, energy);
}
`;

const displayShader = /* wgsl */ `
struct Display {
  fade: f32,
  gain: f32,
  padding: vec2f,
}

@group(0) @binding(0) var previous: texture_2d<f32>;
@group(0) @binding(1) var previousSampler: sampler;
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

@fragment
fn fadeFs(in: VertexOut) -> @location(0) vec4f {
  return textureSample(previous, previousSampler, in.uv) * display.fade;
}

@fragment
fn displayFs(in: VertexOut) -> @location(0) vec4f {
  let light = textureSample(previous, previousSampler, in.uv).rgb;
  let mapped = vec3f(1.0) - exp(-light * display.gain);
  let graded = pow(mapped, vec3f(0.82));
  let centered = in.uv * 2.0 - 1.0;
  let vignette = 1.0 - smoothstep(0.45, 1.35, dot(centered, centered));
  return vec4f(vec3f(0.002, 0.003, 0.009) + graded * vignette, 1.0);
}
`;

export default function TrueBuddhabrotCanvas({ fading }: { fading: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gpu = (navigator as Navigator & { gpu?: any }).gpu;
    if (!canvas || !gpu) return;

    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    async function start() {
      const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter || disposed) return;
      const device = await adapter.requestDevice();
      if (disposed) {
        device.destroy();
        return;
      }

      const context = canvas.getContext("webgpu") as any;
      if (!context) {
        device.destroy();
        return;
      }
      const format = gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: "opaque" });

      const bufferUsage = (globalThis as any).GPUBufferUsage;
      const textureUsage = (globalThis as any).GPUTextureUsage;
      const pointBuffer = device.createBuffer({
        size: SEED_COUNT * ITERATIONS * POINT_STRIDE,
        usage: bufferUsage.STORAGE | bufferUsage.VERTEX,
      });
      const paramsBuffer = device.createBuffer({ size: 32, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST });
      const styleBuffer = device.createBuffer({ size: 48, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST });
      const displayBuffer = device.createBuffer({ size: 16, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST });
      const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

      const computeModule = device.createShaderModule({ code: computeShader });
      const pointModule = device.createShaderModule({ code: pointShader });
      const displayModule = device.createShaderModule({ code: displayShader });
      const [computePipeline, pointPipeline, fadePipeline, displayPipeline] = await Promise.all([
        device.createComputePipelineAsync({
          layout: "auto",
          compute: { module: computeModule, entryPoint: "main" },
        }),
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
          fragment: { module: displayModule, entryPoint: "fadeFs", targets: [{ format: "rgba16float" }] },
          primitive: { topology: "triangle-list" },
        }),
        device.createRenderPipelineAsync({
          layout: "auto",
          vertex: { module: displayModule, entryPoint: "vs" },
          fragment: { module: displayModule, entryPoint: "displayFs", targets: [{ format }] },
          primitive: { topology: "triangle-list" },
        }),
      ]);
      if (disposed) {
        pointBuffer.destroy();
        paramsBuffer.destroy();
        styleBuffer.destroy();
        displayBuffer.destroy();
        device.destroy();
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

      let textures: any[] = [];
      let fadeBindGroups: any[] = [];
      let displayBindGroups: any[] = [];
      let textureWidth = 0;
      let textureHeight = 0;
      let textureIndex = 0;
      let epoch = 11;
      let yaw = 0;
      let pitch = 0;
      let distance = 4.3;
      let dragging = false;
      let lastPointerX = 0;
      let lastPointerY = 0;
      let previousTime = performance.now();
      let pageVisible = !document.hidden;
      let reportedReady = false;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const makeTextureBindGroup = (pipeline: any, texture: any) => device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: texture.createView() },
          { binding: 1, resource: sampler },
          { binding: 2, resource: { buffer: displayBuffer } },
        ],
      });

      function clearTextures() {
        if (!textures.length) return;
        const encoder = device.createCommandEncoder();
        for (const texture of textures) {
          const pass = encoder.beginRenderPass({
            colorAttachments: [{
              view: texture.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: "clear",
              storeOp: "store",
            }],
          });
          pass.end();
        }
        device.queue.submit([encoder.finish()]);
      }

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, rect.width < 720 ? 1 : 1.35);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (width === textureWidth && height === textureHeight) return;
        canvas.width = width;
        canvas.height = height;
        textures.forEach((texture) => texture.destroy());
        textures = [0, 1].map(() => device.createTexture({
          size: [width, height],
          format: "rgba16float",
          usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
        }));
        fadeBindGroups = textures.map((texture) => makeTextureBindGroup(fadePipeline, texture));
        displayBindGroups = textures.map((texture) => makeTextureBindGroup(displayPipeline, texture));
        textureWidth = width;
        textureHeight = height;
        textureIndex = 0;
        clearTextures();
      }

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        dragging = true;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
        canvas.classList.add("dragging");
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        yaw -= (event.clientX - lastPointerX) * 0.006;
        pitch = Math.max(-1.25, Math.min(1.25, pitch + (event.clientY - lastPointerY) * 0.005));
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        clearTextures();
      };
      const onPointerUp = () => {
        dragging = false;
        canvas.classList.remove("dragging");
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        distance = Math.max(2.6, Math.min(7, distance * Math.exp(event.deltaY * 0.001)));
        clearTextures();
      };
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      function draw(now: number) {
        frame = 0;
        if (disposed || !pageVisible || textures.length !== 2) return;
        const delta = Math.min(50, now - previousTime);
        previousTime = now;
        if (!reduceMotion && !dragging) yaw += delta * 0.000004;

        const params = new Float32Array([-0.5, 0, 1.72, 2.2, 0, 0, 0, 0]);
        const paramsU32 = new Uint32Array(params.buffer);
        paramsU32[4] = SEED_COUNT;
        paramsU32[5] = ITERATIONS;
        paramsU32[6] = epoch++;
        paramsU32[7] = 8;
        device.queue.writeBuffer(paramsBuffer, 0, params);
        device.queue.writeBuffer(styleBuffer, 0, new Float32Array([
          textureWidth,
          textureHeight,
          yaw,
          pitch,
          distance,
          textureWidth / textureHeight,
          0.4663,
          Math.max(0.8, Math.min(1.35, textureHeight / 760)),
          0.009,
          now * 0.001,
          0,
          0,
        ]));
        device.queue.writeBuffer(displayBuffer, 0, new Float32Array([dragging ? 0.62 : 0.975, 2.0, 0, 0]));

        const destinationIndex = 1 - textureIndex;
        const encoder = device.createCommandEncoder();
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(SEED_COUNT / WORKGROUP_SIZE));
        computePass.end();

        const fadePass = encoder.beginRenderPass({
          colorAttachments: [{
            view: textures[destinationIndex].createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          }],
        });
        fadePass.setPipeline(fadePipeline);
        fadePass.setBindGroup(0, fadeBindGroups[textureIndex]);
        fadePass.draw(3);
        fadePass.end();

        const pointPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: textures[destinationIndex].createView(),
            loadOp: "load",
            storeOp: "store",
          }],
        });
        pointPass.setPipeline(pointPipeline);
        pointPass.setBindGroup(0, pointBindGroup);
        pointPass.setVertexBuffer(0, pointBuffer);
        pointPass.draw(6, SEED_COUNT * ITERATIONS);
        pointPass.end();

        const displayPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          }],
        });
        displayPass.setPipeline(displayPipeline);
        displayPass.setBindGroup(0, displayBindGroups[destinationIndex]);
        displayPass.draw(3);
        displayPass.end();
        device.queue.submit([encoder.finish()]);
        textureIndex = destinationIndex;

        if (!reportedReady) {
          reportedReady = true;
          setReady(true);
        }
        frame = requestAnimationFrame(draw);
      }

      const onVisibilityChange = () => {
        pageVisible = !document.hidden;
        if (!pageVisible) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else if (!frame && !disposed) {
          previousTime = performance.now();
          frame = requestAnimationFrame(draw);
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      if (pageVisible) frame = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
        textures.forEach((texture) => texture.destroy());
        pointBuffer.destroy();
        paramsBuffer.destroy();
        styleBuffer.destroy();
        displayBuffer.destroy();
        context.unconfigure();
        device.destroy();
      };
    }

    start().then((dispose) => {
      if (disposed) dispose?.();
      else cleanup = dispose;
    }).catch(() => {
      if (!disposed) setReady(false);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, []);

  return (
    <div
      className={`introCloudHost ${ready ? "ready" : ""} ${fading ? "fading" : ""}`}
      role="img"
      aria-label="GPU-computed true z squared plus c Buddhabrot volume. Drag to orbit and scroll to zoom."
    >
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
