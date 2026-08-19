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

test("orbit trails accumulate in native-pixel pond and throw layers", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /gpuBufferSize\(/);
  assert.match(source, /magFilter: "nearest"/);
  assert.match(source, /minFilter: "nearest"/);
  assert.match(source, /setLayer/);
  assert.match(source, /beginThrow/);
  assert.match(source, /clearPond/);
  assert.match(source, /pondGain/);
  assert.match(source, /throwGain/);
  assert.match(source, /pond \* pondGain \* cone/);
  assert.doesNotMatch(source, /atlasFollowView/);
  assert.doesNotMatch(source, /atlasNeedsRecenter/);
  assert.doesNotMatch(source, /focusAtlasBounds/);
  assert.doesNotMatch(source, /TRAIL_ATLAS_SIZE/);
  assert.doesNotMatch(source, /const MIN_VIEW_HALF_Y/);
  assert.match(source, /reprojectScreenPoint/);
  assert.match(source, /zoomPixelScale/);
  assert.doesNotMatch(source, /cameraPausedUntil/);
  assert.match(source, /incomingLength <= 0\.12 && length\(z - previousZ\) <= 0\.12/);
});

test("loading Buddhabrot uses the precomputed rotating Gaussian cloud", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const cloud = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");
  assert.match(source, /const DEFAULT_TUNING: Tuning = \{[\s\S]*?rotateRight: true/);
  assert.match(source, /const POINT_BUDGET = 400_000/);
  assert.match(source, /const INTRO_SOURCE_CAP = 4096/);
  assert.match(source, /mandelbrot-skipping:tuning:v6/);
  assert.match(source, /const MAX_SOURCE_DOTS = 128/);
  assert.match(source, /sourceDots: 64,/);
  assert.match(source, /doublePixels/);
  assert.match(source, /gpuPixelRatio\(/);
  assert.match(source, /introMriSlice\(/);
  assert.match(source, /sliceEnabled/);
  assert.match(source, /const mriTime = mriFrozen/);
  assert.match(source, /writeBuffer\(fadeBuffer, 0, new Float32Array\(\[pondRetention, 0, 0, 0\]\)\)/);
  assert.match(source, /!mriEnabled \|\| !mriFrozen/);
  assert.match(source, /now - mriWarmupStartedAt >= MRI_PREITERATE_MS/);
  assert.match(source, /isMriReady/);
  assert.match(source, /let inferredDepth = clamp\(depthNumerator \/ depthDenominator/);
  assert.match(source, /let mriTexture: any = null/);
  assert.match(source, /const mriCapture = encoder\.beginRenderPass/);
  assert.match(source, /label: "mri-capture-reset"/);
  assert.match(source, /let mriRaw = select/);
  assert.match(source, /displayView\[28\] = mriEnabled && mriFrozen \? 1 : 0/);
  assert.match(source, /displayView\[31\] = slice\.zoom/);
  assert.doesNotMatch(source, /styleSliceBuffer|pointAtlasSliceBind|const mriPass/);
  assert.match(source, /doublePixels: true/);
  assert.match(source, /createOrbitEngine\(canvas, acquired, introActiveRef\.current\)/);
  assert.match(source, /className="gpuCanvas"/);
  assert.doesNotMatch(source, /introStashed/);
  assert.doesNotMatch(source, /setSuspended\(true\)/);
  assert.match(source, /engineRef\.current\?\.setSuspended\(false\)/);
  assert.match(cloud, /SparkRenderer/);
  assert.match(cloud, /SplatMesh/);
  assert.match(cloud, /henon-buddhabrot-4096\.spz/);
  assert.match(cloud, /yaw \+= delta \* 0\.000055/);
  assert.match(cloud, /blurAmount: 0/);
  assert.doesNotMatch(cloud, /dispatchWorkgroups|pointScale|epoch\+\+/);
  assert.match(source, /displayView\[6\] = mriEnabled \? 0 : liveGain/);
  assert.match(source, /displayView\[7\] = contrast/);
  assert.match(source, /pow\(clamp\(mapped, vec3f\(0\.0\), vec3f\(1\.0\)\), vec3f\(contrast\)\) \* pondGain \* cone/);
  assert.match(source, /liveMapped[\s\S]*?\* liveGain/);
  assert.match(source, /pointEnergy = atmosphere\.energy/);
});

test("flashlight is a GPU cone on the live pond; cached blit is GPU-fail only", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /drawMappedBuddhabrot/);
  assert.match(source, /readCachedTexture/);
  assert.match(source, /FLASHLIGHT_EDGE_BLUR_PX/);
  assert.match(source, /createConicGradient/);
  assert.match(source, /spawnIntroBackgroundOrbits/);
  assert.match(source, /AIMING_ATMOSPHERE/);
  assert.match(source, /setAtmosphere\(AIMING_ATMOSPHERE\)/);
  assert.match(source, /introActiveRef\.current \? INTRO_ATMOSPHERE : AIMING_ATMOSPHERE/);
  assert.match(source, /liveGain \* cone/);
  assert.match(source, /pondPersist/);
  assert.match(source, /layer === "pond" && pondPersist > 0/);
  assert.match(source, /displayLayerGains\("aiming"\)/);
  assert.match(source, /displayLayerGains\("play"\)/);
  assert.match(source, /displayLayerGains\("intro"\)/);
  assert.match(source, /setLayer\("pond"\)/);
  assert.match(source, /beginThrow\(/);
  assert.match(source, /clearPond\(/);
  assert.doesNotMatch(source, /spawnFlashlightPoints/);
  assert.doesNotMatch(source, /FLASHLIGHT_ATMOSPHERE/);
  assert.doesNotMatch(source, /FLASHLIGHT_SOURCE_CAP/);
  assert.doesNotMatch(source, /function zoomAt/);
  assert.doesNotMatch(source, /addEventListener\("wheel"/);
  assert.doesNotMatch(source, /event\.key === "\+"/);
  assert.doesNotMatch(source, /spawnFlashlightSkips/);
  assert.doesNotMatch(source, /traceFlashlightCone\(ctx, geometry\);\s*ctx\.stroke\(\)/);
  assert.doesNotMatch(source, /rgba\(224, 244, 255/);
  assert.doesNotMatch(source, /function spawnIntroBackgroundOrbits\(now: number\) \{\s*if \(introActiveRef\.current\) return;/);
});

test("opening and flashlight hide orbit lines, go grayscale, and throw overlapping intro rocks", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /setAtmosphere/);
  assert.match(source, /INTRO_ATMOSPHERE/);
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
  const renderMatch = source.match(/function render\(now: number\) \{([\s\S]*?)\n {4}\}\n/);
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
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(intro, /ready/);
  assert.match(intro, />Play</);
  assert.doesNotMatch(intro, /introMode|Precomputed 3D Gaussian cloud/);
  assert.match(intro, /introSetToggle/);
  assert.match(intro, /True z² \+ c Buddhabrot/);
  assert.match(intro, /BuddhabrotCloudCanvas/);
  assert.match(intro, /variant=\{showTrueBuddhabrot \? "classic" : "henon"\}/);
  assert.doesNotMatch(intro, /TrueBuddhabrotCanvas/);
  assert.doesNotMatch(intro, /introTraverse|gif\.file/);
  assert.match(intro, /BUDDHABROT_EXPLAIN/);
  assert.match(intro, /wikipedia/);
  assert.match(intro, /introPaper/);
  assert.doesNotMatch(intro, /introPaperRefs/);
  assert.doesNotMatch(intro, /rotateRight/);
  assert.doesNotMatch(css, /introBuddhaZoom/);
  assert.match(css, /introPaper/);
  const paperRule = css.match(/\.introPaper \{([^}]+)\}/)?.[1] ?? "";
  const titleRule = css.match(/\.introPaperTitle \{([^}]+)\}/)?.[1] ?? "";
  const dropCapRule = css.match(/\.introPaperLede::first-letter \{([^}]+)\}/)?.[1] ?? "";
  assert.match(paperRule, /color:\s*#fff/);
  assert.match(paperRule, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.1[0-9]/);
  assert.match(paperRule, /width:\s*min\(19rem,/);
  assert.doesNotMatch(paperRule, /border:/);
  assert.doesNotMatch(paperRule, /box-shadow:/);
  assert.match(titleRule, /font-size:\s*32px/);
  assert.match(dropCapRule, /font-size:\s*3\.5em/);
  assert.doesNotMatch(css, /gpuCanvas\.introStashed/);
  const game = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(css, /--throw-stone-x:\s*50%/);
  assert.match(css, /--throw-stone-y:\s*82%/);
  const playRule = css.match(/\.introPlay \{([^}]+)\}/)?.[1] ?? "";
  const rethrowRule = css.match(/\.playfieldThrowControl \{([^}]+)\}/)?.[1] ?? "";
  assert.match(playRule, /left:\s*var\(--throw-stone-x\)/);
  assert.match(playRule, /top:\s*var\(--throw-stone-y\)/);
  assert.match(rethrowRule, /left:\s*var\(--throw-stone-x\)/);
  assert.match(rethrowRule, /top:\s*var\(--throw-stone-y\)/);
  assert.doesNotMatch(css, /\.introPlay \{ top:/);
  assert.match(game, /function anchor\(\) \{ return \{ x: width \* 0\.5, y: height \* 0\.82 \}/);
  assert.match(game, /hud\.phase === "flying" \|\| hud\.phase === "resolving" \|\| hud\.phase === "result"/);
});

test("every skip stamps a tinted glyph and later skips keep iterating", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /function drawSacredGlyph\(/);
  assert.match(source, /impacts\.push\(\{[\s\S]*?glyph,/);
  assert.match(source, /drawSacredGlyph\(/);
  assert.match(source, /skipTintRgb\(impact\.index/);
  assert.match(source, /engineRef\.current\?\.spawnAppend\(sources, index\)/);
  assert.doesNotMatch(source, /Math\.min\(18, tuningRef\.current\.sourceDots\)/);
  assert.doesNotMatch(source, /fillStyle = `rgba\(235, 252, 255,/);
  assert.match(source, /pixelDots:\s*true/);
  assert.match(source, /fillRect\(/);
  assert.match(source, /1 \/ dpr/);
  assert.match(source, /IMPACT_LABEL_FADE_MS/);
  assert.match(source, /SOURCE_RADIUS_PX \+ /);
  assert.doesNotMatch(source, /fillText\(String\(impact\.index\), point\.x, point\.y/);
  assert.match(source, /previewDots[\s\S]*sourceDots \/ 3/);
});

test("throw orbits stay alive across the pond even when they leave the camera", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /let inPond = /);
  assert.match(source, /offscreenStreak = select\([\s\S]*inPond \|\| onScreen/);
  assert.match(source, /z\.x >= \$\{TRAIL_BOUNDS\.xMin\}/);
});
