import assert from "node:assert/strict";
import test from "node:test";
import {
  arpIntervalSeconds,
  arpPattern,
  chordDegrees,
  chordGain,
  GLYPH_PATCHES,
  splashDegree,
  splashPeakHz,
} from "../../lib/audio/chiptune.ts";
import { degreeToFrequency, paletteFromLanding } from "../../lib/audio/theory.ts";

test("every sacred glyph has its own chord, arp, and waveform", () => {
  assert.equal(GLYPH_PATCHES.length, 7);
  const signatures = GLYPH_PATCHES.map((patch) =>
    `${patch.waveform}:${patch.duty}:${patch.chord.join(",")}:${patch.arp.join(",")}`,
  );
  assert.equal(new Set(signatures).size, 7);
  for (const patch of GLYPH_PATCHES) {
    assert.ok(patch.chord.length >= 2);
    assert.ok(patch.arp.length >= 3);
    assert.ok(["sine", "triangle", "square", "pulse"].includes(patch.waveform));
  }
});

test("glyph chords stay inside the pentatonic scale", () => {
  for (let glyph = 0; glyph < 7; glyph++) {
    for (const degree of chordDegrees(glyph)) {
      assert.equal(degree, Math.round(degree));
      assert.ok(degree >= 0);
    }
    assert.deepEqual(chordDegrees(glyph), GLYPH_PATCHES[glyph].chord);
    assert.deepEqual(arpPattern(glyph), GLYPH_PATCHES[glyph].arp);
  }
});

test("later skips climb the pentatonic, so combos get brighter", () => {
  for (let glyph = 0; glyph < 7; glyph++) {
    const first = splashDegree(1, glyph);
    const later = splashDegree(5, glyph);
    assert.ok(later > first, `glyph ${glyph} skip 5 (${later}) should outrank skip 1 (${first})`);
  }
});

test("skip hits live in a punchy treble register, not under 400 Hz", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  for (let skip = 1; skip <= 8; skip++) {
    for (let glyph = 0; glyph < 7; glyph++) {
      const hz = splashPeakHz(palette, skip, glyph);
      assert.ok(hz >= 400, `skip ${skip} glyph ${glyph} peaked at ${hz} Hz`);
      assert.ok(hz <= 4000);
      const expected = degreeToFrequency(palette, splashDegree(skip, glyph), 4000);
      assert.equal(hz, expected);
    }
  }
});

test("arp speeds up while forms grow and thins out as they settle", () => {
  const busy = arpIntervalSeconds(1, 1);
  const idle = arpIntervalSeconds(0, 0);
  assert.ok(busy < idle);
  assert.ok(busy < 0.12);
  assert.ok(idle > 0.3);
});

test("held pentatonic chords stay present but duck a little while resolving", () => {
  const flying = chordGain(0.6, 0.5, false);
  const resolving = chordGain(0.6, 0.5, true);
  assert.ok(flying > resolving);
  assert.ok(flying > 0.05);
  assert.ok(flying < 0.2);
});
