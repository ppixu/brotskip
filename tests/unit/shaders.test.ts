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
  assert.doesNotMatch(source, /const atlasLines = encoder.beginRenderPass/);
  assert.match(source, /incomingLength <= 0\.12 && length\(z - previousZ\) <= 0\.12/);
});

test("loading Buddhabrot is vertical, high-res, and atlas-led instead of sparkly live dust", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /const DEFAULT_TUNING: Tuning = \{[\s\S]*?rotateRight: true/);
  assert.match(source, /const POINT_BUDGET = 400_000/);
  assert.match(source, /const INTRO_SOURCE_CAP = 4096/);
  assert.match(source, /mandelbrot-skipping:tuning:v4/);
  assert.match(source, /displayView\[6\] = liveGain/);
  assert.match(source, /displayView\[7\] = contrast/);
  assert.match(source, /displayView\[12\] = atlasGain/);
  assert.match(source, /pow\(clamp\(mapped, vec3f\(0\.0\), vec3f\(1\.0\)\), vec3f\(contrast\)\) \* atlasGain/);
  assert.match(source, /liveMapped[\s\S]*?\* liveGain/);
  assert.match(source, /pointEnergy = atmosphere\.energy[\s\S]*?atlasGain = atmosphere\.atlasGain/);
});

test("play follows a view-local atlas and can zoom about 10× deeper", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /const MIN_VIEW_HALF_Y = 0\.0035/);
  assert.match(source, /floats\[16\] = atlasBounds\.xMin/);
  assert.match(source, /displayView\[8\] = atlasBounds\.xMin/);
  assert.match(source, /atlasFollowView = atmosphere\.atlasFollowView/);
  assert.match(source, /atlasNeedsRecenter\(atlasBounds/);
  assert.match(source, /focusAtlasBounds\(view/);
});

test("flashlight shows a dim cached Buddhabrot in the cone and iterates random single points", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /FLASHLIGHT_SOURCE_CAP/);
  assert.match(source, /drawMappedBuddhabrot/);
  assert.match(source, /readCachedTexture/);
  assert.match(source, /spawnFlashlightPoints/);
  assert.match(source, /FLASHLIGHT_EDGE_BLUR_PX/);
  assert.doesNotMatch(source, /spawnFlashlightSkips/);
  assert.doesNotMatch(source, /flashlightSkipLandings\(\{\s*x: geometry\.apexX/);
  assert.doesNotMatch(source, /traceFlashlightCone\(ctx, geometry\);\s*ctx\.stroke\(\)/);
  assert.doesNotMatch(source, /rgba\(224, 244, 255/);
  assert.doesNotMatch(source, /traceFlashlightCone\(ctx, geometry\);\s*ctx\.fill\(\)/);
  assert.match(source, /createConicGradient/);
});

test("opening and flashlight hide orbit lines, go grayscale, and throw overlapping intro rocks", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /setAtmosphere/);
  assert.match(source, /INTRO_ATMOSPHERE/);
  assert.match(source, /FLASHLIGHT_ATMOSPHERE/);
  assert.match(source, /introRocks/);
  assert.match(source, /INTRO_THROW_STAGGER_MS/);
  assert.match(source, /INTRO_THROWS_PER_WAVE/);
  assert.match(source, /INTRO_ROCK_DRAW_EVERY/);
  assert.match(source, /body\.draw/);
  assert.match(source, /introLaunchOrigin/);
  assert.doesNotMatch(source, /function throwIntroRock\(\) \{\s*const a = anchor\(\);/);
  assert.doesNotMatch(source, /if \(phase === "flying" \|\| phase === "resolving" \|\| phase === "aiming"\) return;/);
  assert.match(source, /mix\(tinted, gray, style\.pulse\)/);
  assert.match(source, /let lineGain = display.pad;/);
  assert.match(source, /INTRO_SETTLE_MS/);
  assert.match(source, /spawnIntroBackgroundOrbits/);
  assert.match(source, /throwIntroRock\(\);/);
  assert.match(source, /let activeDrawn = 0/);
  assert.match(source, /spawnAppend\(seeds/);
  assert.match(source, /INTRO_TRAIL_FADE_MS/);
  assert.match(source, /ripple: body\.draw/);
  assert.match(source, /drawIntroTrajectory/);
  assert.match(source, /playfieldThrowControl/);
  assert.doesNotMatch(source, /if \(now - introSettleAt >= INTRO_SETTLE_MS\) endOpeningRef\.current\(\)/);
  assert.doesNotMatch(source, /introThrowsRef\.current >= INTRO_THROW_COUNT/);
  assert.match(source, /params\.hiddenSteps/);
  assert.match(source, /state\.step > u32\(params\.hiddenSteps\)/);
});

test("the game render loop only calls drawing helpers that exist", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const renderMatch = source.match(/function render\(now: number\) \{([\s\S]*?)\n    \}\n/);
  assert.ok(renderMatch, "render() missing");
  const skip = new Set(["if", "for", "while", "switch", "catch", "function"]);
  const names = [...renderMatch[1].matchAll(/(?<![\w.])([A-Za-z_][A-Za-z0-9_]*)\(/g)]
    .map((match) => match[1])
    .filter((name) => !skip.has(name));
  assert.ok(names.includes("drawRock"), `render() helpers: ${names.join(", ")}`);
  for (const name of names) {
    assert.match(
      source,
      new RegExp(String.raw`function ${name}\s*\(`),
      `${name} is called from render() but is not defined`,
    );
  }
});

test("opening waits for a Play tap and gameplay rethrow sits on the throw stone", () => {
  const intro = readFileSync(new URL("../../app/BuddhabrotIntro.tsx", import.meta.url), "utf8");
  assert.match(intro, /ready/);
  assert.match(intro, />Play</);
});
