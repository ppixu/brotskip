import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GAME_TAGLINE, GAME_TITLE } from "../../lib/brand.ts";

test("the game is named Mandelpond with a z-squared-plus-sea tagline", () => {
  assert.equal(GAME_TITLE, "Mandelpond");
  assert.equal(GAME_TAGLINE, "z² + sea");
});

test("title and tagline sit in the left corner and reload to loading", () => {
  const game = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const intro = readFileSync(new URL("../../app/BuddhabrotIntro.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(game, /GAME_TITLE/);
  assert.match(game, /GAME_TAGLINE/);
  assert.match(game, /className="gameBrand"/);
  assert.match(game, /location\.assign\(window\.location\.pathname\)/);
  assert.match(layout, /GAME_TITLE/);
  assert.match(layout, /GAME_TAGLINE/);
  assert.doesNotMatch(intro, /introTitle/);
  assert.doesNotMatch(intro, /Mandelbrot Skipping/);
  assert.match(css, /\.gameBrand \{/);
  assert.match(css, /\.gameBrandTitle \{/);
  assert.match(css, /\.gameBrandTag \{/);
});

test("the right menu is collapsed by default with a compact score and expand arrow", () => {
  const game = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(game, /useState\(false\)/);
  assert.match(game, /railOpen/);
  assert.match(game, /className="compactScore"/);
  assert.match(game, /className="railToggle"/);
  assert.match(game, /aria-label=\{railOpen \? "Hide menu" : "Show menu"\}/);
  assert.doesNotMatch(game, /Replay opening/);
  assert.doesNotMatch(game, /replayOpening/);
  assert.match(css, /\.compactScore \{/);
  assert.match(css, /\.railToggle \{/);
  assert.match(css, /\.gameShell\.railOpen/);
});
