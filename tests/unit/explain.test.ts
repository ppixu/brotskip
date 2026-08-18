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

test("the overlay explains the pre-iterated GPU escape-depth scan", () => {
  const copy = BUDDHABROT_EXPLAIN.paragraphs.join(" ");
  assert.equal(BUDDHABROT_EXPLAIN.trigger, "Buddhabrot");
  assert.equal(BUDDHABROT_EXPLAIN.formula, "z → z² + c");
  assert.match(copy, /Mandelbrot/);
  assert.match(copy, /escape/);
  assert.match(copy, /Melinda Green/);
  assert.match(copy, /density|trajector/i);
  assert.match(copy, /GPU pre-iterates the orbit pool/i);
  assert.match(copy, /loops smoothly back and forth/i);
  assert.doesNotMatch(copy, /iteration means/i);
  assert.equal("gif" in BUDDHABROT_EXPLAIN, false);
});

test("loading paper quotes Wikipedia's first paragraph with numbered references", () => {
  const paper = BUDDHABROT_EXPLAIN.wikipedia;
  const lede = paper.sentences.map((sentence) => sentence.text).join(" ");
  assert.equal(
    lede,
    "The Buddhabrot is the probability distribution over the trajectories of points that escape the Mandelbrot fractal. Its name reflects its pareidolic resemblance to classical depictions of Gautama Buddha, seated in a meditation pose with a forehead mark (tika), a traditional oval crown (ushnisha), and ringlet of hair.",
  );
  assert.equal(paper.sentences[0].cite, 1);
  assert.equal(paper.sentences[1].cite, 2);
  assert.equal(paper.references.length, 2);
  assert.match(paper.references[0].text, /Green, M\./);
  assert.match(paper.references[0].text, /Buddhabrot Technique/);
  assert.match(paper.references[1].text, /Wikipedia/);
  assert.equal(paper.references[1].url, "https://en.wikipedia.org/wiki/Buddhabrot");
  assert.match(paper.journal, /fractal/i);
});

test("the pre-rendered Buddhabrot GIF is no longer vendored", () => {
  const gif = new URL("../../public/buddhabrot-iterations.gif", import.meta.url);
  assert.equal(existsSync(gif), false);
});

test("HowItWorks describes the pre-iterated GPU intro instead of embedding a film", () => {
  const source = readFileSync(new URL("../../app/HowItWorks.tsx", import.meta.url), "utf8");
  assert.match(source, /BUDDHABROT_EXPLAIN/);
  assert.match(source, /Pre-iterated on your GPU, then looped live/);
  assert.doesNotMatch(source, /<img|gif\.file|buddhabrot-iterations/);
  assert.doesNotMatch(source, /How does this work/);
  assert.doesNotMatch(source, /HowItWorksFilm/);
  assert.doesNotMatch(source, /EXPLAIN_PARTS/);
});
