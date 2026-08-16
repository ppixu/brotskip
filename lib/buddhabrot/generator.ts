/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import type { GpuContext } from "@/lib/gpu";
import { cutsFromHistogram, HISTOGRAM_BINS } from "./normalize";
import { samplesForFrame } from "./pacing";
import {
  accumulateShader,
  blitShader,
  BOUNDS,
  colorizeShader,
  histogramShader,
  MAX_ITERATIONS,
} from "./shaders";

/** Well above the Python script's 1.2M, so the result is cleaner as well as larger. */
export const DEFAULT_SAMPLE_BUDGET: Record<number, number> = {
  2048: 16_000_000,
  4096: 64_000_000,
};

export type GeneratorOptions = {
  size: number;
  totalSamples?: number;
  minDurationMs?: number;
  maxIterations?: number;
};

export const DEFAULT_SEED_JITTER = 0.045;
export const MAX_SEED_CENTERS = 1024;

export type ComplexSeed = { re: number; im: number };

export type BuddhabrotGenerator = {
  step: (deltaSeconds: number) => void;
  stepAround: (deltaSeconds: number, centers: ComplexSeed[]) => void;
  accumulateAround: (centers: ComplexSeed[], sampleCount: number) => void;
  progress: () => number;
  isComplete: () => boolean;
  blit: (context: any) => boolean;
  toBitmapAndBlob: () => Promise<{ bitmap: ImageBitmap; blobPromise: Promise<Blob | null> }>;
  destroy: () => void;
};

export function createBuddhabrotGenerator(
  gpu: GpuContext,
  options: GeneratorOptions,
): BuddhabrotGenerator {
  const device = gpu.device;
  const usage = (globalThis as any).GPUBufferUsage;
  const textureUsage = (globalThis as any).GPUTextureUsage;
  const { size } = options;
  const pixelCount = size * size;
  const totalSamples = options.totalSamples ?? DEFAULT_SAMPLE_BUDGET[size] ?? 16_000_000;
  const maxIterations = options.maxIterations ?? MAX_ITERATIONS;

  const densityBuffer = device.createBuffer({
    size: pixelCount * 4,
    usage: usage.STORAGE | usage.COPY_DST,
  });
  const histogramBuffer = device.createBuffer({
    size: HISTOGRAM_BINS * 4,
    usage: usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
  });
  const histogramReadback = device.createBuffer({
    size: HISTOGRAM_BINS * 4,
    usage: usage.COPY_DST | usage.MAP_READ,
  });
  const accumulateParams = device.createBuffer({ size: 48, usage: usage.UNIFORM | usage.COPY_DST });
  const seedBuffer = device.createBuffer({
    size: MAX_SEED_CENTERS * 8,
    usage: usage.STORAGE | usage.COPY_DST,
  });
  const histogramParams = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
  const colorizeParams = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });

  const texture = device.createTexture({
    size: [size, size],
    format: "rgba8unorm",
    usage: textureUsage.STORAGE_BINDING | textureUsage.TEXTURE_BINDING | textureUsage.COPY_SRC,
  });
  const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

  const accumulatePipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: device.createShaderModule({ code: accumulateShader }), entryPoint: "accumulate" },
  });
  const histogramPipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: device.createShaderModule({ code: histogramShader }), entryPoint: "histogram" },
  });
  const colorizePipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: device.createShaderModule({ code: colorizeShader }), entryPoint: "colorize" },
  });
  const blitModule = device.createShaderModule({ code: blitShader });
  const blitPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: blitModule, entryPoint: "vs" },
    fragment: {
      module: blitModule,
      entryPoint: "fs",
      targets: [{ format: gpu.preferredFormat }],
    },
    primitive: { topology: "triangle-list" },
  });

  const accumulateBind = device.createBindGroup({
    layout: accumulatePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: accumulateParams } },
      { binding: 1, resource: { buffer: densityBuffer } },
      { binding: 2, resource: { buffer: seedBuffer } },
    ],
  });
  const histogramBind = device.createBindGroup({
    layout: histogramPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: histogramParams } },
      { binding: 1, resource: { buffer: densityBuffer } },
      { binding: 2, resource: { buffer: histogramBuffer } },
    ],
  });
  const colorizeBind = device.createBindGroup({
    layout: colorizePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: colorizeParams } },
      { binding: 1, resource: { buffer: densityBuffer } },
      { binding: 2, resource: texture.createView() },
    ],
  });
  const blitBind = device.createBindGroup({
    layout: blitPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
    ],
  });

  device.queue.writeBuffer(histogramParams, 0, new Uint32Array([size, 0, 0, 0]));

  let emitted = 0;
  let chunkIndex = 0;
  let destroyed = false;
  let readbackInFlight = false;
  // Bootstrap cuts for the very first chunk, before any histogram has landed.
  // 0.69 ~= log1p(1): the dimmest occupied pixel (density 1), so single-hit
  // pixels open near-invisible instead of near-opaque at ~80% alpha.
  let cuts = { low: 0.69, high: 3 };

  function writeAccumulateParams(sampleCount: number, seedCount = 0, jitter = 0) {
    const header = new ArrayBuffer(48);
    new Uint32Array(header, 0, 4).set([size, chunkIndex + 1, sampleCount, maxIterations]);
    new Float32Array(header, 16, 4).set([BOUNDS.xMin, BOUNDS.xMax, BOUNDS.yMin, BOUNDS.yMax]);
    new Uint32Array(header, 32, 1).set([seedCount]);
    new Float32Array(header, 36, 1).set([jitter]);
    device.queue.writeBuffer(accumulateParams, 0, header);
  }

  function writeSeeds(centers: ComplexSeed[]) {
    const capped = centers.slice(0, MAX_SEED_CENTERS);
    const data = new Float32Array(MAX_SEED_CENTERS * 2);
    capped.forEach((center, index) => {
      data[index * 2] = center.re;
      data[index * 2 + 1] = center.im;
    });
    device.queue.writeBuffer(seedBuffer, 0, data);
    return capped.length;
  }

  function emit(sampleCount: number, seedCount: number, jitter: number) {
    if (destroyed || gpu.hasFailed() || sampleCount <= 0 || emitted >= totalSamples) return;
    const count = Math.min(sampleCount, totalSamples - emitted);
    writeAccumulateParams(count, seedCount, jitter);
    writeColorizeParams();
    device.queue.writeBuffer(histogramBuffer, 0, new Uint32Array(HISTOGRAM_BINS));

    const encoder = device.createCommandEncoder({ label: "buddhabrot-step" });
    const pass = encoder.beginComputePass();
    pass.setPipeline(accumulatePipeline);
    pass.setBindGroup(0, accumulateBind);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.setPipeline(histogramPipeline);
    pass.setBindGroup(0, histogramBind);
    pass.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8));
    pass.setPipeline(colorizePipeline);
    pass.setBindGroup(0, colorizeBind);
    pass.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8));
    pass.end();
    device.queue.submit([encoder.finish()]);

    emitted += count;
    chunkIndex += 1;
    void readHistogram();
  }

  function writeColorizeParams() {
    const header = new ArrayBuffer(16);
    new Uint32Array(header, 0, 2).set([size, 0]);
    new Float32Array(header, 8, 2).set([cuts.low, cuts.high]);
    device.queue.writeBuffer(colorizeParams, 0, header);
  }

  async function readHistogram() {
    if (readbackInFlight || destroyed) return;
    readbackInFlight = true;
    try {
      const encoder = device.createCommandEncoder({ label: "buddhabrot-histogram-readback" });
      encoder.copyBufferToBuffer(histogramBuffer, 0, histogramReadback, 0, HISTOGRAM_BINS * 4);
      device.queue.submit([encoder.finish()]);
      await histogramReadback.mapAsync((globalThis as any).GPUMapMode.READ);
      if (destroyed) return;
      cuts = cutsFromHistogram(new Uint32Array(histogramReadback.getMappedRange().slice(0)));
      histogramReadback.unmap();
    } catch (error) {
      // Keep the previous cuts. A missed readback costs one chunk of exposure lag.
      console.warn("[buddhabrot] histogram readback failed", error);
    } finally {
      readbackInFlight = false;
    }
  }

  return {
    step(deltaSeconds) {
      if (destroyed || gpu.hasFailed() || emitted >= totalSamples) return;
      const requested = samplesForFrame(deltaSeconds, {
        totalSamples,
        minDurationMs: options.minDurationMs,
      });
      emit(requested, 0, 0);
    },
    stepAround(deltaSeconds, centers) {
      if (!centers.length) return;
      const requested = samplesForFrame(deltaSeconds, {
        totalSamples,
        minDurationMs: options.minDurationMs,
      });
      this.accumulateAround(centers, requested);
    },
    accumulateAround(centers, sampleCount) {
      if (!centers.length) return;
      const seedCount = writeSeeds(centers);
      emit(sampleCount, seedCount, DEFAULT_SEED_JITTER);
    },
    progress() {
      return Math.min(1, emitted / totalSamples);
    },
    isComplete() {
      return emitted >= totalSamples;
    },
    blit(context) {
      if (destroyed || gpu.hasFailed()) return false;
      const encoder = device.createCommandEncoder({ label: "buddhabrot-blit" });
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        }],
      });
      pass.setPipeline(blitPipeline);
      pass.setBindGroup(0, blitBind);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
      return true;
    },
    async toBitmapAndBlob() {
      const canvas = new OffscreenCanvas(size, size);
      const context = canvas.getContext("webgpu") as any;
      context.configure({
        device,
        format: gpu.preferredFormat,
        alphaMode: "premultiplied",
      });
      const drew = this.blit(context);
      if (!drew) {
        throw new Error("Buddhabrot generator cannot blit: GPU context is destroyed or has failed.");
      }
      // createImageBitmap reads the canvas without emptying it, unlike
      // transferToImageBitmap, so the same canvas still yields the blob.
      const bitmap = await createImageBitmap(canvas);
      // Deliberately not awaited: a 4096^2 PNG encode takes 1-3s and must not
      // block the fade-in. The canvas stays alive via this closure, so a
      // pending encode survives even if the generator is destroyed later.
      const blobPromise = canvas.convertToBlob({ type: "image/png" }).catch((error: unknown) => {
        console.warn("[buddhabrot] PNG encode failed; texture will not be cached", error);
        return null;
      });
      return { bitmap, blobPromise };
    },
    destroy() {
      destroyed = true;
      void device.queue.onSubmittedWorkDone().finally(() => {
        texture.destroy();
        densityBuffer.destroy();
        histogramBuffer.destroy();
        histogramReadback.destroy();
        accumulateParams.destroy();
        seedBuffer.destroy();
        histogramParams.destroy();
        colorizeParams.destroy();
      });
    },
  };
}
