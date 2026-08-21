import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GAME_TAGLINE, GAME_TITLE, GAME_VERSION } from "../../lib/brand.ts";

test("the game is named Brotskipping with an on-mandelpond tagline", () => {
  assert.equal(GAME_TITLE, "Brotskipping");
  assert.equal(GAME_TAGLINE, "on mandelpond z² + c");
});

test("the header shows a large Brotskipping title with a small matching package version", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  const game = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(GAME_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(GAME_VERSION, pkg.version);
  assert.match(game, /GAME_VERSION/);
  assert.match(game, /className="gameBrandVersion"/);
  assert.match(game, /className="gameBrandHeading"/);
  const titleRule = css.match(/\.gameBrandTitle \{([^}]+)\}/)?.[1] ?? "";
  const versionRule = css.match(/\.gameBrandVersion \{([^}]+)\}/)?.[1] ?? "";
  const titleSize = Number(titleRule.match(/font-size:\s*(\d+(?:\.\d+)?)px/)?.[1] ?? 0);
  const versionSize = Number(versionRule.match(/font-size:\s*(\d+(?:\.\d+)?)px/)?.[1] ?? 0);
  assert.equal(titleSize, 68);
  assert.equal(versionSize, 5.5);
  assert.match(css, /\.gameBrandTitle \{ font-size: 52px; \}/);
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
  assert.match(css, /\.compactScore \{[\s\S]*?align-items: flex-end/);
  assert.match(css, /\.compactScoreLabel \{[\s\S]*?opacity:\s*\.25/);
  assert.match(css, /\.compactHighscoresTitle \{[\s\S]*?opacity:\s*\.25/);
  assert.match(css, /\.railToggle \{/);
  assert.match(css, /\.gameShell\.railOpen/);
});

test("the theme switch starts dark and offers a persisted light mode", () => {
  const game = readFileSync(new URL("../../app/MandelbrotSkipping.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(game, /className="themeToggle"/);
  assert.match(game, /aria-pressed=\{lightMode\}/);
  assert.match(game, /Switch to light mode/);
  assert.match(game, /Switch to dark mode/);
  assert.match(game, /localStorage\.setItem\(THEME_KEY/);
  assert.match(css, /\.themeToggle \{/);
  assert.match(css, /\.themeToggleTrack \{/);
  assert.match(css, /\.gameShell\.lightMode \{/);
  assert.match(css, /\.gameShell\.lightMode \.playfield/);
});
