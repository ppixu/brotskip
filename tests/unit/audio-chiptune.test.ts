import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  arpIntervalSeconds,
  arpPattern,
  bassDegree,
  bassIntervalSeconds,
  chordDegrees,
  chordGain,
  fanfareChordDegrees,
  fanfareMelodyDegrees,
  fanfarePlan,
  fanfareTier,
  finishComplexity,
  GLYPH_PATCHES,
  launchDegrees,
  LAUNCH_THUMP_END_HZ,
  launchThumpGain,
  launchThumpStartHz,
  melodyDegree,
  SLING_TICK_STEPS,
  slingTickDegree,
  slingTickIndex,
  splashDegree,
  splashPeakHz,
} from "../../lib/audio/chiptune.ts";
import { HIGHPASS_HZ } from "../../lib/audio/engine.ts";
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

test("bass pad sits under the melody in the NES triangle-bass register", () => {
  const palette = paletteFromLanding(-0.58, 0.2);
  const melody = degreeToFrequency(palette, 0);
  const bass = degreeToFrequency(palette, bassDegree(0, 3, 0));
  assert.ok(bass >= 70, `bass ${bass} Hz is below the triangle floor`);
  assert.ok(bass < 190, `bass ${bass} Hz is still clamped into the midrange`);
  assert.ok(bass < melody * 0.65);
});

test("long spirals drop the bass pad an octave", () => {
  assert.ok(bassDegree(0, 14, 0) < bassDegree(0, 3, 0));
});

test("bass pad moves on a slow ambient pulse, not eighth-note beats", () => {
  assert.ok(bassIntervalSeconds() > 1.2);
  assert.ok(bassIntervalSeconds() > arpIntervalSeconds(1, 1) * 8);
});

test("deeper spirals climb the pentatonic instead of looping the same lick", () => {
  const shallow = melodyDegree(4, 0, 2, 0);
  const deep = melodyDegree(4, 0, 16, 0);
  assert.ok(deep > shallow);
});

test("orbit angle twists the melody so a spiral is not a static ostinato", () => {
  const a = melodyDegree(4, 3, 8, 0);
  const b = melodyDegree(4, 3, 8, Math.PI);
  assert.notEqual(a, b);
});

test("four celebration tiers grow in notes and duration", () => {
  assert.equal(fanfareTier(0), 0);
  assert.equal(fanfareTier(0.25), 1);
  assert.equal(fanfareTier(0.55), 2);
  assert.equal(fanfareTier(0.9), 3);
  const chip = fanfarePlan(0.05);
  const huge = fanfarePlan(0.95);
  assert.equal(chip.tier, 0);
  assert.equal(huge.tier, 3);
  assert.ok(huge.noteCount >= chip.noteCount * 2);
  assert.ok(huge.duration > chip.duration * 3);
  assert.equal(chip.bassStyle, "none");
  assert.equal(huge.bassStyle, "none");
  assert.equal(huge.withFinalChord, true);
});

test("a deep, high-coverage throw ranks a bigger fanfare than a short skip", () => {
  const small = finishComplexity({ score: 40_000, deepest: 60, coverage: 20, skips: 2 });
  const huge = finishComplexity({ score: 1_800_000, deepest: 1_500_000, coverage: 4000, skips: 12 });
  assert.ok(small < 0.25);
  assert.ok(huge > 0.75);
  assert.ok(fanfareTier(huge) > fanfareTier(small));
});

const TONIC_TRIAD = new Set([0, 2, 3]);

test("fanfare melody and final chord stay on the tonic triad, never a clashing 2nd or 6th", () => {
  for (const tier of [0, 1, 2, 3] as const) {
    assert.ok(fanfareMelodyDegrees(tier).length >= 4);
    for (const degree of fanfareMelodyDegrees(tier)) {
      const tone = ((degree % 5) + 5) % 5;
      assert.ok(TONIC_TRIAD.has(tone), `melody degree ${degree} lands on clashing tone ${tone}`);
    }
    for (const degree of fanfareChordDegrees(tier)) {
      const tone = ((degree % 5) + 5) % 5;
      assert.ok(TONIC_TRIAD.has(tone), `chord degree ${degree} lands on clashing tone ${tone}`);
    }
  }
  assert.ok(fanfareMelodyDegrees(3).length > fanfareMelodyDegrees(0).length);
});

test("the sling draw ratchets through discrete steps, never a held tone", () => {
  assert.equal(slingTickIndex(0), 0);
  assert.equal(slingTickIndex(1), SLING_TICK_STEPS);
  assert.equal(slingTickIndex(2), SLING_TICK_STEPS);
  assert.equal(slingTickIndex(-1), 0);
  let previous = -1;
  for (let step = 0; step <= 20; step++) {
    const index = slingTickIndex(step / 20);
    assert.ok(index >= previous, "tick index never falls as the draw grows");
    previous = index;
  }
  assert.equal(new Set(Array.from({ length: 21 }, (_, i) => slingTickIndex(i / 20))).size, SLING_TICK_STEPS + 1);
});

test("pulling further raises the ratchet pitch", () => {
  const palette = paletteFromLanding(-0.58, 0);
  const low = degreeToFrequency(palette, slingTickDegree(1));
  const high = degreeToFrequency(palette, slingTickDegree(SLING_TICK_STEPS));
  assert.ok(high > low);
  for (let index = 0; index <= SLING_TICK_STEPS; index++) {
    assert.equal(slingTickDegree(index), Math.round(slingTickDegree(index)));
  }
});

test("the launch rip climbs and gets longer with draw power", () => {
  const soft = launchDegrees(0);
  const hard = launchDegrees(1);
  assert.ok(hard.length > soft.length);
  for (const run of [soft, hard]) {
    assert.ok(run.length >= 3);
    for (let index = 1; index < run.length; index++) assert.ok(run[index] > run[index - 1]);
  }
});

test("idle voices fall to true silence, not a -80 dB floor", () => {
  const source = readFileSync(new URL("../../lib/audio/chiptune.ts", import.meta.url), "utf8");
  const fade = source.match(/function fadeToSilence[\s\S]*?\n {2}\}/)?.[0] ?? "";
  assert.match(fade, /linearRampToValueAtTime\(0,/);
  const silence = source.match(/function silenceVoices\(\)[\s\S]*?\n {2}\}/)?.[0] ?? "";
  assert.match(silence, /fadeToSilence/);
  assert.doesNotMatch(silence, /\.0001/);
  assert.doesNotMatch(source, /setTargetAtTime\(\.0001/);
});

test("the launch lands on a low thump that clears the master high-pass", () => {
  assert.ok(LAUNCH_THUMP_END_HZ > HIGHPASS_HZ, "thump must survive the master high-pass");
  assert.ok(launchThumpStartHz(1) > launchThumpStartHz(0), "a harder pull snaps from higher up");
  for (const power of [0, .5, 1]) {
    assert.ok(launchThumpStartHz(power) > LAUNCH_THUMP_END_HZ, "the thump always falls, never rises");
  }
});

test("draw power drives how hard the launch hits", () => {
  assert.ok(launchThumpGain(1) > launchThumpGain(0));
  assert.ok(launchThumpGain(0) > chordGain(1, 1, false), "the launch punches above the sustained bed");
  assert.ok(launchThumpGain(1) < 1, "and still leaves headroom");
  assert.equal(launchThumpGain(2), launchThumpGain(1), "power clamps at full draw");
});
