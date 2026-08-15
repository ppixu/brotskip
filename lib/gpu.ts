/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

/**
 * Acquires the adapter and device once. Both the orbit engine and the
 * Buddhabrot generator draw on the same device; requesting a second one
 * would double the driver-side cost for no benefit.
 */
export type GpuContext = {
  device: any;
  preferredFormat: string;
  hasFailed: () => boolean;
  destroy: () => void;
};

export async function acquireGpu(fail: (message: string) => void): Promise<GpuContext | null> {
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
  let failed = false;
  device.addEventListener("uncapturederror", (event: any) => {
    failed = true;
    console.error("WebGPU validation", event.error?.message || event.error);
    fail("Orbit renderer hit a GPU validation error.");
  });
  device.lost.then(() => { failed = true; });
  let destroyed = false;
  return {
    device,
    preferredFormat: gpu.getPreferredCanvasFormat(),
    hasFailed: () => failed,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      device.destroy();
    },
  };
}
