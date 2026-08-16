import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  BUDDHABROT_EXPLAIN,
  escapingOrbit,
  magnitudeSq,
  squarePlus,
} from "../../lib/buddhabrot/explain.ts";

test("the first iterate of 0 is the seed itself", () => {
  const seed = { re: 0.28, im: 0.53 };
  assert.deepEqual(squarePlus({ re: 0, im: 0 }, seed), seed);
});

test("a demo seed escapes the radius-2 circle", () => {
  const orbit = escapingOrbit({ re: -0.64, im: 0.39 });
  assert.ok(orbit.length > 4);
  assert.ok(magnitudeSq(orbit[orbit.length - 1]) > 4);
});

test("escaping orbits stop once they leave the circle", () => {
  const orbit = escapingOrbit({ re: 1, im: 1 }, 64);
  assert.equal(orbit.length, 2);
  assert.ok(magnitudeSq(orbit[1]) > 4);
});

test("a trapped seed stays inside the radius-2 circle", () => {
  const orbit = escapingOrbit({ re: -0.2, im: 0.55 }, 80);
  assert.equal(orbit.length, 80);
  assert.ok(orbit.every((point) => magnitudeSq(point) <= 4));
});

test("the overlay summarizes Wikipedia's Buddhabrot with the article GIF", () => {
  const copy = BUDDHABROT_EXPLAIN.paragraphs.join(" ");
  assert.equal(BUDDHABROT_EXPLAIN.trigger, "Buddhabrot");
  assert.equal(BUDDHABROT_EXPLAIN.formula, "z → z² + c");
  assert.match(copy, /Mandelbrot/);
  assert.match(copy, /escape/);
  assert.match(copy, /Melinda Green/);
  assert.match(copy, /density|trajector/i);
  assert.doesNotMatch(copy, /iteration means/i);
  assert.equal(BUDDHABROT_EXPLAIN.gif.file, "buddhabrot-iterations.gif");
  assert.match(BUDDHABROT_EXPLAIN.gif.alt, /iteration/i);
  assert.equal(BUDDHABROT_EXPLAIN.gif.license, "CC BY-SA 4.0");
  assert.match(BUDDHABROT_EXPLAIN.gif.sourceUrl, /BuddhabrotIterationAnimation7729\.gif/);
  assert.equal(BUDDHABROT_EXPLAIN.gif.articleUrl, "https://en.wikipedia.org/wiki/Buddhabrot");
});

test("the Wikipedia Buddhabrot GIF is vendored next to the app", () => {
  const gif = new URL("../../public/buddhabrot-iterations.gif", import.meta.url);
  assert.ok(existsSync(gif), "public/buddhabrot-iterations.gif missing");
  const bytes = readFileSync(gif);
  assert.ok(bytes.length > 100_000, "GIF looks too small to be the Wikipedia animation");
  assert.equal(bytes.subarray(0, 6).toString("ascii"), "GIF89a");
});

test("HowItWorks shows the Wikipedia summary instead of the homemade films", () => {
  const source = readFileSync(new URL("../../app/HowItWorks.tsx", import.meta.url), "utf8");
  assert.match(source, /BUDDHABROT_EXPLAIN/);
  assert.match(source, /src=\{gif\.file\}/);
  assert.doesNotMatch(source, /How does this work/);
  assert.doesNotMatch(source, /HowItWorksFilm/);
  assert.doesNotMatch(source, /EXPLAIN_PARTS/);
});
