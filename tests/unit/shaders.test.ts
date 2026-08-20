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
  assert.match(source, /mandelbrot-skipping:tuning:v8/);
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
  assert.match(source, /displayView\[31\] = mriEnabled \? slice\.zoom : cone \? AIMING_POND_ZOOM : 1/);
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

test("flashlight is a GPU cone on the live pond; cached Buddha slice fills the cone while aiming", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /drawMappedBuddhabrot/);
  assert.match(source, /drawBuddhabrotOutline/);
  assert.match(source, /buddhabrotImageTransform/);
  assert.match(source, /function drawMappedBuddhabrot[\s\S]*?imageSmoothingEnabled = false/);
  assert.match(source, /drawMappedBuddhabrot\(ctx, source\)/);
  assert.match(source, /buddhabrotIntroCrossfadeAlpha/);
  assert.match(source, /buddhabrotSlingFadeAlpha/);
  assert.match(source, /ctx\.globalAlpha = alpha/);
  assert.match(source, /introActiveRef\.current && !introFadingRef\.current/);
  assert.match(source, /buddhabrotSlingFadeStarted = performance\.now\(\)/);
  assert.match(source, /phase !== "aiming" \|\| introActiveRef\.current/);
  assert.doesNotMatch(source, /!engineRef\.current && buddhabrotSource/);
  assert.match(source, /if \(buddhabrotSource && flashlightContext\)/);
  assert.match(source, /FLASHLIGHT_CACHE_ALPHA/);
  assert.match(source, /ctx\.globalAlpha = FLASHLIGHT_CACHE_ALPHA/);
  assert.match(source, /createBuddhabrotGenerator/);
  assert.match(source, /liveBuddhabrot/);
  assert.match(source, /generator\.step\(/);
  assert.match(source, /generator\.blit\(/);
  assert.doesNotMatch(source, /extractBuddhabrotOutline/);
  assert.doesNotMatch(source, /let buddhabrotOutline/);
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
  assert.match(source, /AIMING_POND_ZOOM/);
  assert.match(source, /cone \? AIMING_POND_ZOOM : 1/);
  assert.match(source, /pondUv - vec2f\(0\.5\)\) \* max\(display\.mriZoom/);
  assert.match(source, /AIMING_BACKGROUND_SPAWN_MS/);
  assert.match(source, /AIMING_NEBULA_SEEDS_PER_WAVE/);
  assert.match(source, /AIMING_SOURCE_CAP/);
  assert.match(source, /aiming \? AIMING_BACKGROUND_SPAWN_MS : INTRO_BACKGROUND_SPAWN_MS/);
  assert.match(source, /aiming \? AIMING_NEBULA_SEEDS_PER_WAVE : INTRO_NEBULA_SEEDS_PER_WAVE/);
  assert.match(source, /spawn\(seeds, 1, AIMING_SOURCE_CAP\)/);
  assert.match(source, /spawnAppend\(seeds, 1, INTRO_SOURCE_CAP\)/);
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
  assert.doesNotMatch(source, /INTRO_SETTLE_MS/);
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
  assert.ok(names.includes("drawBuddhabrotOutline"), `render() helpers: ${names.join(", ")}`);
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
  assert.match(intro, />Play</);
  assert.doesNotMatch(intro, /liveProgress/);
  assert.doesNotMatch(intro, /\{ready &&/);
  assert.doesNotMatch(intro, /progress,/);
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
  assert.doesNotMatch(css, /\.introOverlay\.fading \{ opacity: 0/);
  assert.match(css, /\.introOverlay\.fading \.introChrome/);
  assert.match(css, /\.introOverlay\.fading \.introPaper/);
  assert.match(css, /\.introOverlay\.fading \.introPlay/);
  assert.match(css, /\.introCloudHost\.fading \{[^}]*opacity:\s*0/);
  assert.match(css, /transition:\s*opacity\s+2400ms\s+cubic-bezier\(0\.65,\s*0,\s*0\.35,\s*1\)\s+400ms/);
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
  assert.match(game, /setIntro\(true\)/);
  assert.match(game, /INTRO_PLAY_EXIT_MS/);
  assert.match(game, /applyView\(PLAY_POND_VIEW\)/);
  assert.doesNotMatch(game, /lerpView\(/);
  assert.doesNotMatch(game, /introPlayAlignT\(/);
  assert.match(game, /PLAY_POND_VIEW/);
  assert.match(game, /gameAudio\.ambientStart\(\)/);
  assert.match(game, /gameAudioRef\.current\?\.playStart\(\)/);
  assert.doesNotMatch(game, /setTimeout\(\(\) => \{[\s\S]*?setIntro\(false\)[\s\S]*?\}, 600\)/);
  assert.doesNotMatch(game, /setIntro\(\{ progress/);
  assert.match(css, /--throw-stone-x:\s*50%/);
  assert.match(css, /--throw-stone-y:\s*82%/);
  const playRule = css.match(/(?:^|\n)\.introPlay \{([^}]+)\}/)?.[1] ?? "";
  const rethrowRule = css.match(/\.playfieldThrowControl \{([^}]+)\}/)?.[1] ?? "";
  assert.match(playRule, /left:\s*var\(--throw-stone-x\)/);
  assert.match(playRule, /top:\s*var\(--throw-stone-y\)/);
  assert.match(rethrowRule, /left:\s*var\(--throw-stone-x\)/);
  assert.match(rethrowRule, /top:\s*var\(--throw-stone-y\)/);
  assert.doesNotMatch(css, /\.introPlay \{ top:/);
  assert.match(game, /function anchor\(\) \{ return \{ x: width \* 0\.5, y: height \* 0\.82 \}/);
  assert.match(game, /hud\.phase === "flying" \|\| hud\.phase === "resolving" \|\| hud\.phase === "result"/);
});

test("intro debug exposes only live splat size and replay", () => {
  const game = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const intro = readFileSync(new URL("../../app/BuddhabrotIntro.tsx", import.meta.url), "utf8");
  const cloud = readFileSync(new URL("../../app/BuddhabrotCloudCanvas.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(game, /className="introPlayDebug"/);
  assert.match(game, /aria-label="Intro splat debug"/);
  assert.match(game, /Replay intro/);
  assert.match(game, /replayIntro/);
  assert.match(game, /introPlayTune/);
  assert.match(game, /aria-label="Intro splat size"/);
  assert.doesNotMatch(game, /aria-label="Intro splat position [XY]"/);
  assert.doesNotMatch(game, /aria-label="Intro camera FOV"/);
  assert.match(intro, /tune=\{tune\}/);
  assert.match(cloud, /tune\?:/);
  assert.match(cloud, /scales: dyno\.mul\(scales, splatSize\)/);
  assert.match(cloud, /splatSize\.value = tuneRef\.current\.splatSize/);
  assert.match(cloud, /introPlayPose\(alignFrom, elapsed, reduceMotion, tuneRef\.current\)/);
  assert.match(css, /\.introPlayDebug \{/);
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
  assert.match(source, /drawSacredGlyph\(/);
});

test("the flying rock is a small rotating 3D sacred geometry ball", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /projectSacredBall\(/);
  assert.match(source, /SACRED_BALL_RADIUS/);
  assert.match(source, /function drawFlyingRock/);
  const flyingRock = source.match(/function drawFlyingRock\([\s\S]*?\n {4}\}/)?.[0] ?? "";
  assert.match(flyingRock, /projectSacredBall\(/);
  assert.match(flyingRock, /sacredBallPose\(now/);
  assert.match(flyingRock, /sacredBallGlyphPose\(/);
  assert.match(flyingRock, /sacredBallLifeScale\(/);
  assert.match(flyingRock, /sacredBallHopScale\(/);
  assert.match(flyingRock, /sacredBallHopT\(/);
  assert.match(flyingRock, /plannedSkips/);
  assert.match(flyingRock, /now \*/);
  assert.doesNotMatch(flyingRock, /drawSacredGlyph\(/);
  assert.doesNotMatch(flyingRock, /previewDots/);
  assert.match(flyingRock, /depth/);
  assert.match(source, /drawFlyingRock\(\{ \.\.\.rock, plannedSkips \}, shapeOffset, now\)/);
});

test("the first throw shows a stretching pull-back arrow from the idle rock", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /from "@\/lib\/tutorial-arrow"/);
  assert.match(source, /TUTORIAL_ARROW_LABEL/);
  assert.match(source, /function drawTutorialArrow/);
  assert.match(source, /tutorialArrowVisible\(/);
  assert.match(source, /tutorialArrowGeometry\(/);
  assert.match(source, /let hasThrown = false/);
  assert.match(source, /hasThrown = true/);
  const reset = source.match(/function resetRound\([\s\S]*?\n {4}\}/)?.[0] ?? "";
  assert.doesNotMatch(reset, /hasThrown/);
  const renderMatch = source.match(/function render\(now: number\) \{([\s\S]*?)\n {4}\}\n/);
  assert.ok(renderMatch, "render() missing");
  assert.match(renderMatch[1], /drawTutorialArrow\(now\)/);
  const draw = source.match(/function drawTutorialArrow\([\s\S]*?\n {4}\}/)?.[0] ?? "";
  assert.match(draw, /fillText\(TUTORIAL_ARROW_LABEL/);
  const launch = source.match(/function launchRock\([\s\S]*?\n {4}\}/)?.[0] ?? "";
  assert.match(launch, /hasThrown = true/);
});

test("throw orbits stay alive across the pond even when they leave the camera", () => {
  const source = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  assert.match(source, /let inPond = /);
  assert.match(source, /offscreenStreak = select\([\s\S]*inPond \|\| onScreen/);
  assert.match(source, /z\.x >= \$\{TRAIL_BOUNDS\.xMin\}/);
});
