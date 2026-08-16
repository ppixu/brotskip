import { MAX_SKIPS, MIN_SKIPS } from "./skip-count.ts";
import type { ViewTransform } from "./view-map.ts";

export const THROW_SHARE_VERSION = 1;
export const THROW_SHARE_WIRE_VERSION = 2;
export const SHARE_GLYPH_COUNT = 7;
export const SHARE_MIN_SOURCE_DOTS = 6;
export const SHARE_MAX_SOURCE_DOTS = 32;
export const SHARE_MIN_VIEW_HALF_Y = 0.035;
export const SHARE_MAX_VIEW_HALF_Y = 2.4;
export const SHARE_NAME_MAX = 12;

const CENTER_MIN = -8;
const CENTER_MAX = 8;
const ANGLE_MIN = -Math.PI;
const ANGLE_MAX = Math.PI;

export type SharedThrow = {
  version: 1;
  view: ViewTransform;
  rotateRight: boolean;
  angle: number;
  power: number;
  skips: number;
  glyph: number;
  seed: number;
  sourceDots: number;
  name: string;
};

export function sanitizeShareName(name: string) {
  const clean = name.toUpperCase().replace(/[^A-Z0-9 _-]/g, "").slice(0, SHARE_NAME_MAX).trim();
  return clean || "YOU";
}

export function sharePlayerLabel(name: string) {
  return `${sanitizeShareName(name)}'s`;
}

function quantize(value: number, min: number, max: number) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.round(t * 65535);
}

function dequantize(value: number, min: number, max: number) {
  return min + value / 65535 * (max - min);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(payload: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  const padded = payload + "=".repeat((4 - payload.length % 4) % 4);
  try {
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function readNumber(value: string | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateShot(shot: Omit<SharedThrow, "version" | "name"> & { name?: string }): SharedThrow | null {
  if (!Number.isFinite(shot.view.centerX) || !Number.isFinite(shot.view.centerY) || !Number.isFinite(shot.view.halfY)) {
    return null;
  }
  if (!Number.isFinite(shot.angle) || !Number.isFinite(shot.power)) return null;
  if (shot.power <= 0 || shot.power > 1) return null;
  if (shot.skips < MIN_SKIPS || shot.skips > MAX_SKIPS || shot.skips !== Math.round(shot.skips)) return null;
  if (shot.glyph < 0 || shot.glyph >= SHARE_GLYPH_COUNT || shot.glyph !== Math.round(shot.glyph)) return null;
  if (
    shot.sourceDots < SHARE_MIN_SOURCE_DOTS ||
    shot.sourceDots > SHARE_MAX_SOURCE_DOTS ||
    shot.sourceDots !== Math.round(shot.sourceDots)
  ) return null;
  if (shot.view.halfY < SHARE_MIN_VIEW_HALF_Y || shot.view.halfY > SHARE_MAX_VIEW_HALF_Y) return null;
  return {
    version: 1,
    view: shot.view,
    rotateRight: shot.rotateRight,
    angle: shot.angle,
    power: shot.power,
    skips: shot.skips,
    glyph: shot.glyph,
    seed: shot.seed | 0,
    sourceDots: shot.sourceDots,
    name: sanitizeShareName(shot.name ?? "YOU"),
  };
}

function decodeLegacy(payload: string): SharedThrow | null {
  const parts = payload.split("_");
  if (parts.length !== 11) return null;
  const version = readNumber(parts[0]);
  const centerX = readNumber(parts[1]);
  const centerY = readNumber(parts[2]);
  const halfY = readNumber(parts[3]);
  const rotate = readNumber(parts[4]);
  const angle = readNumber(parts[5]);
  const power = readNumber(parts[6]);
  const skips = readNumber(parts[7]);
  const glyph = readNumber(parts[8]);
  const seed = readNumber(parts[9]);
  const sourceDots = readNumber(parts[10]);
  if (
    version !== THROW_SHARE_VERSION ||
    centerX == null || centerY == null || halfY == null ||
    rotate == null || angle == null || power == null ||
    skips == null || glyph == null || seed == null || sourceDots == null
  ) return null;
  if (rotate !== 0 && rotate !== 1) return null;
  return validateShot({
    view: { centerX, centerY, halfY },
    rotateRight: rotate === 1,
    angle,
    power,
    skips,
    glyph,
    seed,
    sourceDots,
  });
}

function decodeWire(payload: string): SharedThrow | null {
  const bytes = base64UrlToBytes(payload);
  if (!bytes || bytes.length < 20) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(0) !== THROW_SHARE_WIRE_VERSION) return null;
  const nameLength = view.getUint8(19);
  if (bytes.length !== 20 + nameLength) return null;
  const name = new TextDecoder().decode(bytes.subarray(20, 20 + nameLength));
  return validateShot({
    view: {
      centerX: dequantize(view.getUint16(1), CENTER_MIN, CENTER_MAX),
      centerY: dequantize(view.getUint16(3), CENTER_MIN, CENTER_MAX),
      halfY: dequantize(view.getUint16(5), SHARE_MIN_VIEW_HALF_Y, SHARE_MAX_VIEW_HALF_Y),
    },
    rotateRight: (view.getUint8(11) & 1) === 1,
    angle: dequantize(view.getUint16(7), ANGLE_MIN, ANGLE_MAX),
    power: dequantize(view.getUint16(9), 0, 1),
    skips: view.getUint8(12),
    glyph: view.getUint8(13),
    sourceDots: view.getUint8(14),
    seed: view.getInt32(15),
    name,
  });
}

export function encodeSharedThrow(shot: SharedThrow) {
  const name = sanitizeShareName(shot.name);
  const nameBytes = new TextEncoder().encode(name);
  const bytes = new Uint8Array(20 + nameBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, THROW_SHARE_WIRE_VERSION);
  view.setUint16(1, quantize(shot.view.centerX, CENTER_MIN, CENTER_MAX));
  view.setUint16(3, quantize(shot.view.centerY, CENTER_MIN, CENTER_MAX));
  view.setUint16(5, quantize(shot.view.halfY, SHARE_MIN_VIEW_HALF_Y, SHARE_MAX_VIEW_HALF_Y));
  view.setUint16(7, quantize(shot.angle, ANGLE_MIN, ANGLE_MAX));
  view.setUint16(9, quantize(shot.power, 0, 1));
  view.setUint8(11, shot.rotateRight ? 1 : 0);
  view.setUint8(12, shot.skips);
  view.setUint8(13, shot.glyph);
  view.setUint8(14, shot.sourceDots);
  view.setInt32(15, shot.seed | 0);
  view.setUint8(19, nameBytes.length);
  bytes.set(nameBytes, 20);
  return bytesToBase64Url(bytes);
}

export function decodeSharedThrow(payload: string): SharedThrow | null {
  if (!payload) return null;
  if (payload.includes("_") && payload.startsWith("1_")) return decodeLegacy(payload);
  return decodeWire(payload);
}

export function parseThrowShare(location: { hash: string; search: string }): SharedThrow | null {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const fromHash = new URLSearchParams(hash).get("t");
  const fromSearch = new URLSearchParams(location.search).get("t");
  const raw = fromHash ?? fromSearch;
  return raw ? decodeSharedThrow(raw) : null;
}

export function throwShareUrl(href: string, shot: SharedThrow) {
  const url = new URL(href);
  url.searchParams.delete("t");
  url.hash = `t=${encodeSharedThrow(shot)}`;
  return url.toString();
}
