import { MAX_SKIPS, MIN_SKIPS } from "./skip-count.ts";
import type { ViewTransform } from "./view-map.ts";

export const THROW_SHARE_VERSION = 1;
export const SHARE_GLYPH_COUNT = 7;
export const SHARE_MIN_SOURCE_DOTS = 6;
export const SHARE_MAX_SOURCE_DOTS = 32;
export const SHARE_MIN_VIEW_HALF_Y = 0.035;
export const SHARE_MAX_VIEW_HALF_Y = 2.4;

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
};

function compact(value: number) {
  return String(Number(value.toFixed(6)));
}

function readNumber(value: string | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function encodeSharedThrow(shot: SharedThrow) {
  return [
    THROW_SHARE_VERSION,
    compact(shot.view.centerX),
    compact(shot.view.centerY),
    compact(shot.view.halfY),
    shot.rotateRight ? 1 : 0,
    compact(shot.angle),
    compact(shot.power),
    shot.skips,
    shot.glyph,
    shot.seed | 0,
    shot.sourceDots,
  ].join("_");
}

export function decodeSharedThrow(payload: string): SharedThrow | null {
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
  if (power <= 0 || power > 1) return null;
  if (skips < MIN_SKIPS || skips > MAX_SKIPS || skips !== Math.round(skips)) return null;
  if (glyph < 0 || glyph >= SHARE_GLYPH_COUNT || glyph !== Math.round(glyph)) return null;
  if (
    sourceDots < SHARE_MIN_SOURCE_DOTS ||
    sourceDots > SHARE_MAX_SOURCE_DOTS ||
    sourceDots !== Math.round(sourceDots)
  ) return null;
  if (halfY < SHARE_MIN_VIEW_HALF_Y || halfY > SHARE_MAX_VIEW_HALF_Y) return null;
  return {
    version: 1,
    view: { centerX, centerY, halfY },
    rotateRight: rotate === 1,
    angle,
    power,
    skips,
    glyph,
    seed: seed | 0,
    sourceDots,
  };
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
