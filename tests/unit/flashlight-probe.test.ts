import assert from "node:assert/strict";
import test from "node:test";
import {
  FLASHLIGHT_HALF_ANGLE,
  FLASHLIGHT_EDGE_BLUR_PX,
  INTRO_ATMOSPHERE,
  INTRO_BACKGROUND_SPAWN_MS,
  INTRO_SETTLE_MS,
  INTRO_SOURCE_DOTS,
  INTRO_THROW_STAGGER_MS,
  INTRO_THROWS_PER_WAVE,
  INTRO_ROCK_DRAW_EVERY,
  INTRO_TRAIL_FADE_MS,
  INTRO_MAX_DEPTH,
  INTRO_NEBULA_SEEDS_PER_WAVE,
  MRI_CYCLE_SECONDS,
  MRI_PREITERATE_MS,
  PLAY_ATMOSPHERE,
  AIMING_POND_GAIN,
  displayLayerGains,
  introMriSlice,
  flashlightConeFalloff,
  introLaunchOrigin,
  introNebulaSeed,
  pointInFlashlightCone,
  sampleRayInCone,
  flashlightSkipLandings,
} from "../../lib/flashlight-probe.ts";
import { allocateSources, allocateSourcesAppend } from "../../lib/orbit-sources.ts";

const cone = {
  apexX: 100,
  apexY: 180,
  directionX: 0,
  directionY: -1,
  range: 200,
};

test("flashlight is a cone mask, not a cheaper iterator", () => {
  assert.ok(FLASHLIGHT_EDGE_BLUR_PX >= 24);
  assert.ok(FLASHLIGHT_HALF_ANGLE > 0);
});

test("display layer gains match intro, play, and aiming", () => {
  assert.deepEqual(displayLayerGains("intro"), { pondGain: 0, throwGain: 1, coneEnabled: false });
  assert.deepEqual(displayLayerGains("play"), { pondGain: AIMING_POND_GAIN, throwGain: 1, coneEnabled: false });
  assert.deepEqual(displayLayerGains("aiming"), { pondGain: AIMING_POND_GAIN, throwGain: 0, coneEnabled: true });
  assert.ok(displayLayerGains("play").pondGain > 0);
  assert.ok(displayLayerGains("aiming").pondGain <= 0.15);
  assert.ok(displayLayerGains("aiming").pondGain < 1);
});

test("intro MRI slice sweeps hop-iteration like a cutting plane, not max-iter fill", () => {
  const start = introMriSlice(0);
  const mid = introMriSlice(MRI_CYCLE_SECONDS / 2);
  const end = introMriSlice(MRI_CYCLE_SECONDS);
  assert.ok(start.zCamera < 0.1);
  assert.ok(mid.zCamera > 0.2);
  assert.ok(Math.abs(end.zCamera - start.zCamera) < 0.05);
  assert.ok(start.sliceHalf > 0 && start.sliceHalf < 0.12);
  assert.ok(mid.zoom > start.zoom);
  const beforeTurn = introMriSlice(MRI_CYCLE_SECONDS / 2 - 0.01);
  const afterTurn = introMriSlice(MRI_CYCLE_SECONDS / 2 + 0.01);
  assert.ok(Math.abs(beforeTurn.zCamera - afterTurn.zCamera) < 0.001);
  assert.ok(MRI_PREITERATE_MS >= 1000 && MRI_PREITERATE_MS < INTRO_SETTLE_MS);
});

test("flashlight cone falloff is 1-ish on the aim ray and 0 outside the cone", () => {
  const onRay = flashlightConeFalloff(100, 80, cone);
  const outside = flashlightConeFalloff(10, 180, cone);
  const far = flashlightConeFalloff(100, -50, cone);
  assert.ok(onRay > 0.3, `on-ray falloff was ${onRay}`);
  assert.equal(outside, 0);
  assert.equal(far, 0);
});

test("a point along the aim ray sits inside the flashlight cone", () => {
  assert.equal(pointInFlashlightCone(100, 80, cone, FLASHLIGHT_HALF_ANGLE), true);
  assert.equal(pointInFlashlightCone(10, 180, cone, FLASHLIGHT_HALF_ANGLE), false);
});

test("sampled cone rays stay inside the cone and in range", () => {
  let seed = 1;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 20; i++) {
    const ray = sampleRayInCone(cone, random);
    assert.ok(pointInFlashlightCone(ray.x, ray.y, cone, FLASHLIGHT_HALF_ANGLE));
    assert.ok(ray.distance > 0 && ray.distance <= cone.range);
  }
});

test("invisible skip landings hop forward from the apex", () => {
  const landings = flashlightSkipLandings({
    x: 200,
    y: 300,
    angle: -Math.PI / 2,
    power: 0.7,
    pondScale: 400,
    width: 400,
    height: 400,
    plannedSkips: 3,
  });
  assert.ok(landings.length >= 1);
  assert.ok(landings[0].y < 300);
  assert.equal(landings[0].index, 1);
});

test("opening throws a dense simultaneous volley instead of a few sequential stones", () => {
  assert.ok(INTRO_THROWS_PER_WAVE >= 12);
  assert.ok(INTRO_THROW_STAGGER_MS <= 50);
  assert.equal(INTRO_SOURCE_DOTS, 6);
  assert.equal(INTRO_ROCK_DRAW_EVERY, 50);
});

test("opening throws rocks from random points instead of the throw stone", () => {
  const width = 800;
  const height = 600;
  const stone = { x: width * 0.5, y: height * 0.82 };
  let seed = 1;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const origins = Array.from({ length: 24 }, () => introLaunchOrigin(width, height, random));
  const unique = new Set(origins.map((origin) => `${origin.x.toFixed(0)},${origin.y.toFixed(0)}`));
  assert.ok(unique.size >= 16, `only ${unique.size} distinct launch points`);
  assert.ok(origins.every((origin) => origin.x > 0 && origin.x < width && origin.y > 0 && origin.y < height));
  assert.ok(origins.some((origin) => Math.hypot(origin.x - stone.x, origin.y - stone.y) > 80));
});

test("opening pre-iterates a dense Buddhabrot pool before the scan loop", () => {
  assert.ok(INTRO_SETTLE_MS >= 5000);
  assert.ok(INTRO_BACKGROUND_SPAWN_MS <= 50);
  assert.ok(INTRO_MAX_DEPTH >= 500_000);
  assert.ok(INTRO_TRAIL_FADE_MS >= 3500);
  assert.ok(INTRO_NEBULA_SEEDS_PER_WAVE >= 64);
  assert.ok(MRI_PREITERATE_MS < INTRO_SETTLE_MS);
});

test("intro nebula seeds escape often enough that loading stays live", () => {
  let seed = 1;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const escapeAt = (c: { x: number; y: number }, max = 20_000) => {
    let zr = 0;
    let zi = 0;
    for (let n = 1; n <= max; n++) {
      const nextR = zr * zr - zi * zi + c.x;
      const nextI = 2 * zr * zi + c.y;
      zr = nextR;
      zi = nextI;
      if (zr * zr + zi * zi > 4) return n;
    }
    return max + 1;
  };
  const samples = 80;
  let trapped = 0;
  for (let i = 0; i < samples; i++) {
    if (escapeAt(introNebulaSeed(random)) > 20_000) trapped += 1;
  }
  assert.ok(trapped / samples < 0.08, `trapped ${trapped}/${samples} intro seeds past 20k iterates`);
});

test("intro nebula seeds fill the Buddhabrot body, not just the cardioid rim", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const samples = Array.from({ length: 120 }, () => introNebulaSeed(random));
  const wide = samples.filter((point) => Math.abs(point.y) > 0.45).length;
  const antenna = samples.filter((point) => point.x < -1.15).length;
  const east = samples.filter((point) => point.x > 0.05).length;
  assert.ok(wide >= 18, `only ${wide}/120 seeds sit off the real axis`);
  assert.ok(antenna >= 8, `only ${antenna}/120 seeds reach the antenna`);
  assert.ok(east >= 8, `only ${east}/120 seeds sit on the east cardioid`);
});

test("intro and play atmospheres drop flashlight-specific iteration, and aiming reuses intro", () => {
  assert.equal(PLAY_ATMOSPHERE.drawLines, true);
  assert.equal(PLAY_ATMOSPHERE.grayscale, false);
  assert.equal(PLAY_ATMOSPHERE.hiddenSteps, 0);
  assert.equal(INTRO_ATMOSPHERE.drawLines, false);
  assert.equal(INTRO_ATMOSPHERE.grayscale, true);
  assert.ok(PLAY_ATMOSPHERE.energy >= 0.04);
  assert.ok(PLAY_ATMOSPHERE.energy <= 0.08);
  assert.ok(PLAY_ATMOSPHERE.energy < INTRO_ATMOSPHERE.energy * 0.3);
  assert.ok((PLAY_ATMOSPHERE.atlasGain ?? 1) >= 0.8);
  assert.ok((INTRO_ATMOSPHERE.atlasGain ?? 1) >= 0.9);
  assert.equal("atlasFollowView" in PLAY_ATMOSPHERE, false);
  assert.equal("atlasFollowView" in INTRO_ATMOSPHERE, false);
  assert.ok(INTRO_ATMOSPHERE.energy >= 0.24);
  assert.ok((INTRO_ATMOSPHERE.liveGain ?? 1) <= 0.2);
  assert.ok((INTRO_ATMOSPHERE.contrast ?? 0.72) >= 1.1);
  assert.ok((PLAY_ATMOSPHERE.liveGain ?? 1) >= 0.9);
  assert.ok(INTRO_ATMOSPHERE.hiddenSteps <= 1);
});

test("source allocation wraps inside the live cap", () => {
  const first = allocateSources(0, 0, 6, 36);
  assert.deepEqual(first, { start: 0, nextSource: 6, sourceCount: 6 });
  const wrap = allocateSources(34, 36, 6, 36);
  assert.equal(wrap.start, 0);
  assert.equal(wrap.nextSource, 6);
  assert.equal(wrap.sourceCount, 36);
});

test("intro source allocation appends without overwriting live orbits", () => {
  const first = allocateSourcesAppend(0, 12, 36);
  assert.deepEqual(first, { start: 0, nextSource: 12, sourceCount: 12, added: 12 });
  const fill = allocateSourcesAppend(30, 12, 36);
  assert.equal(fill.start, 30);
  assert.equal(fill.added, 6);
  assert.equal(fill.sourceCount, 36);
  const full = allocateSourcesAppend(36, 12, 36);
  assert.equal(full.added, 0);
  assert.equal(full.sourceCount, 36);
});
