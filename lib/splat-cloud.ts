/**
 * Decoder for the compact Buddhabrot splat cloud ("BBP1") written by
 * tools/true_buddhabrot_splat.cpp --compact-output. The file carries only
 * sorted voxel indices (varint deltas) and u8 densities; position, color,
 * alpha, and scale are derived here with the generator's exact formulas.
 */

export const COMPACT_MAGIC = 0x31504242; // ASCII "BBP1", little-endian.

export type CompactCloud = {
  resolution: number;
  fieldMin: number;
  fieldMax: number;
  sigma: number;
  count: number;
  voxels: Uint32Array;
  densities: Uint8Array;
};

export type CompactSplat = {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
};

const HEADER_BYTES = 24;

export function decodeCompactCloud(bytes: Uint8Array): CompactCloud {
  if (bytes.byteLength < HEADER_BYTES) throw new Error("not a BBP1 compact splat cloud");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== COMPACT_MAGIC) throw new Error("not a BBP1 compact splat cloud");
  const resolution = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const fieldMin = view.getFloat32(12, true);
  const fieldMax = view.getFloat32(16, true);
  const sigma = view.getFloat32(20, true);
  if (!(resolution > 0) || !(fieldMax > fieldMin) || !(sigma > 0)) {
    throw new Error("corrupt BBP1 header");
  }
  const voxels = new Uint32Array(count);
  let offset = HEADER_BYTES;
  let previous = 0;
  for (let index = 0; index < count; index++) {
    let value = 0;
    let shift = 0;
    for (;;) {
      if (offset >= bytes.byteLength) throw new Error("truncated voxel stream");
      const byte = bytes[offset++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    previous = index === 0 ? value : previous + value;
    voxels[index] = previous;
  }
  if (offset + count > bytes.byteLength) throw new Error("truncated density stream");
  const densities = bytes.slice(offset, offset + count);
  return { resolution, fieldMin, fieldMax, sigma, count, voxels, densities };
}

export function compactSplatAt(cloud: CompactCloud, index: number, out: CompactSplat): CompactSplat {
  const { resolution, fieldMin, fieldMax } = cloud;
  const plane = resolution * resolution;
  const voxel = cloud.voxels[index];
  const zIndex = Math.floor(voxel / plane);
  const remainder = voxel % plane;
  const yIndex = Math.floor(remainder / resolution);
  const xIndex = remainder % resolution;
  const span = fieldMax - fieldMin;
  out.x = fieldMin + (xIndex + 0.5) / resolution * span;
  out.y = fieldMin + (yIndex + 0.5) / resolution * span;
  out.z = fieldMin + (zIndex + 0.5) / resolution * span;
  const normalized = cloud.densities[index] / 255;
  const denominator = Math.max(1, resolution - 1);
  const warmth = Math.min(1, Math.max(0, 0.28 * (yIndex / denominator) + 0.72 * (zIndex / denominator)));
  const luminance = 0.34 + 0.66 * Math.sqrt(normalized);
  out.r = Math.min(1, Math.max(0, luminance * (0.38 + 0.55 * warmth)));
  out.g = Math.min(1, Math.max(0, luminance * (0.72 + 0.20 * warmth)));
  out.b = Math.min(1, Math.max(0, luminance * (1.04 - 0.08 * warmth)));
  out.alpha = Math.min(0.55, Math.max(0.01, 0.012 + 0.54 * Math.pow(normalized, 1.28)));
  return out;
}
