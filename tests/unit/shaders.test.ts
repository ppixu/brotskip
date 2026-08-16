import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shadersSource = readFileSync(new URL("../../lib/buddhabrot/shaders.ts", import.meta.url), "utf8");
const shaders = Object.fromEntries(
  [...shadersSource.matchAll(/export const (\w+Shader) = \/\* wgsl \*\/ `([\s\S]*?)`;/g)]
    .map((match) => [match[1], match[2]]),
);

function wgslNames(source: string) {
  const bindings = [...source.matchAll(/var(?:<[^>]+>)?\s+(\w+)\s*:/g)].map((match) => match[1]);
  const fns = [...source.matchAll(/\bfn\s+(\w+)\s*\(/g)].map((match) => match[1]);
  return { bindings, fns };
}

test("colorize shader uses the original muted contrast curve", () => {
  assert.match(shaders.colorizeShader, /pow\(normalized, 1\.68\)/);
  assert.match(shaders.colorizeShader, /\(contrast - 0\.018\) \* 1\.55/);
  assert.match(shaders.colorizeShader, /if \(contrast < 0\.055\)/);
});

test("WGSL shaders do not reuse a binding name as an entry point", () => {
  assert.ok(Object.keys(shaders).includes("histogramShader"));
  for (const [name, source] of Object.entries(shaders)) {
    const { bindings, fns } = wgslNames(source);
    const overlap = bindings.filter((binding) => fns.includes(binding));
    assert.deepEqual(overlap, [], `${name} redeclares ${overlap.join(", ")}`);
  }
});

test("orbit trails accumulate in a complex-plane atlas instead of warping a screen bitmap", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /TRAIL_ATLAS_SIZE/);
  assert.match(source, /atlasMode/);
  assert.match(source, /reprojectScreenPoint/);
  assert.match(source, /zoomPixelScale/);
  assert.doesNotMatch(source, /cameraPausedUntil/);
  assert.doesNotMatch(source, /viewChangingUntil/);
});

test("flashlight and opening use live orbit throws instead of a pre-filmed Buddhabrot", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /FLASHLIGHT_SOURCE_CAP/);
  assert.match(source, /INTRO_THROWS_PER_WAVE/);
  assert.doesNotMatch(source, /createBuddhabrotGenerator/);
  assert.doesNotMatch(source, /drawMappedBuddhabrot/);
  assert.doesNotMatch(source, /buddhabrot-density/);
});

test("opening and flashlight hide orbit lines, go grayscale, and throw overlapping intro rocks", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /setAtmosphere/);
  assert.match(source, /INTRO_ATMOSPHERE/);
  assert.match(source, /FLASHLIGHT_ATMOSPHERE/);
  assert.match(source, /introRocks/);
  assert.match(source, /INTRO_THROW_STAGGER_MS/);
  assert.match(source, /INTRO_THROWS_PER_WAVE/);
  assert.doesNotMatch(source, /if \(phase === "flying" \|\| phase === "resolving" \|\| phase === "aiming"\) return;/);
  assert.match(source, /mix\(tinted, gray, style\.pulse\)/);
  assert.match(source, /let lineGain = display.pad;/);
  assert.match(source, /INTRO_SETTLE_MS/);
  assert.match(source, /spawnIntroBackgroundOrbits/);
  assert.match(source, /drawIntroTrajectory/);
  assert.match(source, /playfieldThrowControl/);
  assert.doesNotMatch(source, /if \(now - introSettleAt >= INTRO_SETTLE_MS\) endOpeningRef\.current\(\)/);
  assert.doesNotMatch(source, /introThrowsRef\.current >= INTRO_THROW_COUNT/);
  assert.match(source, /params\.hiddenSteps/);
  assert.match(source, /state\.step > u32\(params\.hiddenSteps\)/);
});

test("opening waits for a Play tap and gameplay rethrow sits on the throw stone", () => {
  const intro = readFileSync(new URL("../../app/BuddhabrotIntro.tsx", import.meta.url), "utf8");
  assert.match(intro, /ready/);
  assert.match(intro, />Play</);
});
