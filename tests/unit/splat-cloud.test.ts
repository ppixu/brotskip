import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPACT_MAGIC,
  compactSplatAt,
  decodeCompactCloud,
  type CompactSplat,
} from "../../lib/splat-cloud.ts";

/** Test-only encoder mirroring write_compact in tools/true_buddhabrot_splat.cpp. */
function encode(header: { resolution: number; fieldMin: number; fieldMax: number; sigma: number },
  entries: Array<{ voxel: number; density: number }>): Uint8Array {
  const bytes: number[] = [];
  const pushU32 = (value: number) => {
    bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  };
  const pushF32 = (value: number) => {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    for (let i = 0; i < 4; i++) bytes.push(view.getUint8(i));
  };
  const pushVarint = (value: number) => {
    while (value >= 0x80) {
      bytes.push((value & 0x7f) | 0x80);
      value = Math.floor(value / 128);
    }
    bytes.push(value);
  };
  pushU32(COMPACT_MAGIC);
  pushU32(header.resolution);
  pushU32(entries.length);
  pushF32(header.fieldMin);
  pushF32(header.fieldMax);
  pushF32(header.sigma);
  let previous = 0;
  entries.forEach((entry, index) => {
    pushVarint(index === 0 ? entry.voxel : entry.voxel - previous);
    previous = entry.voxel;
  });
  for (const entry of entries) bytes.push(entry.density);
  return new Uint8Array(bytes);
}

const HEADER = { resolution: 8, fieldMin: -2.35, fieldMax: 2.35, sigma: 0.129 };

test("decodes header and round-trips sorted voxel ids", () => {
  const entries = [
    { voxel: 3, density: 10 },
    { voxel: 200, density: 128 },
    { voxel: 511, density: 255 },
  ];
  const cloud = decodeCompactCloud(encode(HEADER, entries));
  assert.equal(cloud.resolution, 8);
  assert.equal(cloud.count, 3);
  assert.ok(Math.abs(cloud.fieldMin - -2.35) < 1e-6);
  assert.ok(Math.abs(cloud.fieldMax - 2.35) < 1e-6);
  assert.ok(Math.abs(cloud.sigma - 0.129) < 1e-6);
  assert.deepEqual([...cloud.voxels], [3, 200, 511]);
  assert.deepEqual([...cloud.densities], [10, 128, 255]);
});

test("handles multi-byte varint deltas", () => {
  const entries = [
    { voxel: 5, density: 1 },
    { voxel: 5 + 300, density: 2 },
    { voxel: 5 + 300 + 700_000_000, density: 3 },
  ];
  const cloud = decodeCompactCloud(encode(HEADER, entries));
  assert.deepEqual([...cloud.voxels], [5, 305, 700_000_305]);
});

test("rejects a wrong magic", () => {
  const bytes = encode(HEADER, [{ voxel: 1, density: 1 }]);
  bytes[0] = 0x00;
  assert.throws(() => decodeCompactCloud(bytes), /BBP1/);
});

test("rejects a truncated voxel stream", () => {
  const bytes = encode(HEADER, [{ voxel: 1, density: 1 }, { voxel: 400, density: 2 }]);
  assert.throws(() => decodeCompactCloud(bytes.slice(0, 25)), /truncated/);
});

test("rejects a truncated density stream", () => {
  const bytes = encode(HEADER, [{ voxel: 1, density: 1 }, { voxel: 2, density: 2 }]);
  assert.throws(() => decodeCompactCloud(bytes.slice(0, bytes.length - 1)), /truncated/);
});

test("positions land at voxel centers inside the field", () => {
  // resolution 8, field -2.35..2.35, voxel = z*64 + y*8 + x with x=1, y=2, z=3.
  const cloud = decodeCompactCloud(encode(HEADER, [{ voxel: 3 * 64 + 2 * 8 + 1, density: 255 }]));
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  compactSplatAt(cloud, 0, out);
  const span = 4.7;
  assert.ok(Math.abs(out.x - (-2.35 + 1.5 / 8 * span)) < 1e-6);
  assert.ok(Math.abs(out.y - (-2.35 + 2.5 / 8 * span)) < 1e-6);
  assert.ok(Math.abs(out.z - (-2.35 + 3.5 / 8 * span)) < 1e-6);
});

test("attribute math matches the generator formulas", () => {
  // yIndex 2, zIndex 3, resolution 8 -> yNorm 2/7, depth 3/7; density 128/255.
  const cloud = decodeCompactCloud(encode(HEADER, [{ voxel: 3 * 64 + 2 * 8 + 1, density: 128 }]));
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  compactSplatAt(cloud, 0, out);
  const normalized = 128 / 255;
  const warmth = Math.min(1, Math.max(0, 0.28 * (2 / 7) + 0.72 * (3 / 7)));
  const luminance = 0.34 + 0.66 * Math.sqrt(normalized);
  assert.ok(Math.abs(out.r - Math.min(1, luminance * (0.38 + 0.55 * warmth))) < 1e-9);
  assert.ok(Math.abs(out.g - Math.min(1, luminance * (0.72 + 0.20 * warmth))) < 1e-9);
  assert.ok(Math.abs(out.b - Math.min(1, luminance * (1.04 - 0.08 * warmth))) < 1e-9);
  assert.ok(Math.abs(out.alpha - (0.012 + 0.54 * Math.pow(normalized, 1.28))) < 1e-9);
});

test("alpha clamps to the generator bounds", () => {
  const cloud = decodeCompactCloud(encode(HEADER, [
    { voxel: 1, density: 0 },
    { voxel: 2, density: 255 },
  ]));
  const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
  assert.ok(compactSplatAt(cloud, 0, out).alpha >= 0.01);
  assert.ok(compactSplatAt(cloud, 1, out).alpha <= 0.55);
});
