import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSharedThrow,
  encodeSharedThrow,
  parseThrowShare,
  sharePlayerLabel,
  throwShareUrl,
  SHARE_MAX_SOURCE_DOTS,
  type SharedThrow,
} from "../../lib/throw-share.ts";

const shot: SharedThrow = {
  version: 1,
  view: { centerX: -0.58, centerY: 0.12, halfY: 0.8 },
  rotateRight: true,
  angle: -1.25,
  power: 0.72,
  skips: 7,
  glyph: 3,
  seed: 42,
  sourceDots: 18,
  name: "YOU",
};

test("a shared throw round-trips through the URL payload", () => {
  const decoded = decodeSharedThrow(encodeSharedThrow(shot));
  assert.ok(decoded);
  assert.equal(decoded.version, 1);
  assert.equal(decoded.rotateRight, true);
  assert.equal(decoded.skips, 7);
  assert.equal(decoded.glyph, 3);
  assert.equal(decoded.seed, 42);
  assert.equal(decoded.sourceDots, 18);
  assert.equal(decoded.name, "YOU");
  assert.ok(Math.abs(decoded.view.centerX - shot.view.centerX) < 1e-3);
  assert.ok(Math.abs(decoded.view.centerY - shot.view.centerY) < 1e-3);
  assert.ok(Math.abs(decoded.view.halfY - shot.view.halfY) < 1e-3);
  assert.ok(Math.abs(decoded.angle - shot.angle) < 1e-3);
  assert.ok(Math.abs(decoded.power - shot.power) < 1e-3);
});

test("the encoded hash stays compact", () => {
  const encoded = encodeSharedThrow(shot);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.ok(encoded.length <= 40, `payload was ${encoded.length} chars: ${encoded}`);
  assert.ok(encodeSharedThrow({ ...shot, name: "HENQUISTADOR" }).length <= 52);
});

test("legacy underscore payloads still decode", () => {
  const decoded = decodeSharedThrow("1_-0.58_0.12_0.8_1_-1.25_0.72_7_3_42_18");
  assert.ok(decoded);
  assert.equal(decoded.skips, 7);
  assert.equal(decoded.name, "YOU");
});

test("garbage payloads do not decode as a throw", () => {
  assert.equal(decodeSharedThrow(""), null);
  assert.equal(decodeSharedThrow("not-a-throw"), null);
  assert.equal(decodeSharedThrow("1_0_0_0_0_0_0_99_0_0_18"), null);
});

test("the share URL keeps the Pages path and puts the throw in the hash", () => {
  const url = throwShareUrl("https://ppixu.github.io/brotskip/", shot);
  assert.match(url, /^https:\/\/ppixu\.github\.io\/brotskip\/#t=/);
  assert.equal(encodeSharedThrow(parseThrowShare(new URL(url))!), encodeSharedThrow(shot));
});

test("query-string throw links still parse", () => {
  const encoded = encodeSharedThrow(shot);
  const parsed = parseThrowShare(new URL(`https://ppixu.github.io/brotskip/?t=${encoded}`));
  assert.ok(parsed);
  assert.equal(parsed.skips, 7);
  assert.equal(parsed.name, "YOU");
});

test("share player labels use a possessive name", () => {
  assert.equal(sharePlayerLabel("you"), "YOU's");
  assert.equal(sharePlayerLabel("henkka!!"), "HENKKA's");
});

test("shared throws accept up to 128 glyph dots", () => {
  assert.equal(SHARE_MAX_SOURCE_DOTS, 128);
  const dense = decodeSharedThrow(encodeSharedThrow({ ...shot, sourceDots: 64 }));
  const maxed = decodeSharedThrow(encodeSharedThrow({ ...shot, sourceDots: 128 }));
  assert.equal(dense?.sourceDots, 64);
  assert.equal(maxed?.sourceDots, 128);
  assert.equal(decodeSharedThrow(encodeSharedThrow({ ...shot, sourceDots: 129 })), null);
});
