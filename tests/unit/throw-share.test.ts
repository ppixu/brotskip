import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSharedThrow,
  encodeSharedThrow,
  parseThrowShare,
  throwShareUrl,
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
  assert.ok(Math.abs(decoded.view.centerX - shot.view.centerX) < 1e-5);
  assert.ok(Math.abs(decoded.view.centerY - shot.view.centerY) < 1e-5);
  assert.ok(Math.abs(decoded.view.halfY - shot.view.halfY) < 1e-5);
  assert.ok(Math.abs(decoded.angle - shot.angle) < 1e-5);
  assert.ok(Math.abs(decoded.power - shot.power) < 1e-5);
});

test("garbage payloads do not decode as a throw", () => {
  assert.equal(decodeSharedThrow(""), null);
  assert.equal(decodeSharedThrow("not-a-throw"), null);
  assert.equal(decodeSharedThrow("1_0_0_0_0_0_0_99_0_0_18"), null);
});

test("the share URL keeps the Pages path and puts the throw in the hash", () => {
  const url = throwShareUrl("https://ppixu.github.io/brotskip/", shot);
  assert.match(url, /^https:\/\/ppixu\.github\.io\/brotskip\/#t=/);
  assert.deepEqual(parseThrowShare(new URL(url)), decodeSharedThrow(encodeSharedThrow(shot)));
});

test("query-string throw links still parse", () => {
  const encoded = encodeSharedThrow(shot);
  const parsed = parseThrowShare(new URL(`https://ppixu.github.io/brotskip/?t=${encoded}`));
  assert.ok(parsed);
  assert.equal(parsed.skips, 7);
});
