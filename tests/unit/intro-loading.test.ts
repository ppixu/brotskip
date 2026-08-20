import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const intro = readFileSync(new URL("../../app/BuddhabrotIntro.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("intro loading bar tracks the classic splat and Play waits for it", () => {
  assert.match(intro, /className={`introLoadProgress/);
  assert.match(intro, /aria-valuenow=\{Math\.round\(loadProgress \* 100\)\}/);
  assert.match(intro, /onLoadProgress=\{handleLoadProgress\}/);
  assert.match(intro, /onReady=\{handleReady\}/);
  assert.match(intro, /variant="classic"/);
  assert.match(intro, /\{splatReady && \(/);
  assert.match(css, /\.introLoadProgress \{/);
  assert.match(css, /\.introLoadProgress\.complete \{ opacity: 0; \}/);
});
