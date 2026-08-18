import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders Mandelbrot Skipping", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Mandelbrot Skipping<\/title>/i);
  assert.match(html, /Mandelbrot/);
  assert.match(html, /Skipping/);
  assert.match(html, /Local legends/);
  assert.match(html, /Drag the white orb/);
  assert.match(html, /Live score/);
  assert.match(html, /Score and local high scores/);
  assert.match(html, /Line persist/);
  assert.match(html, /Aim orbit preview/);
  assert.match(html, /Skip colors/);
  assert.match(html, /Coordinate axes/);
  assert.match(html, /Rotate 90° right/);
  assert.match(html, /Replay opening/);
  assert.match(html, /Share throw/);
  assert.match(html, /Replay throw/);
  assert.match(html, />Buddhabrot</);
  assert.match(html, /Opening visual computed live on your GPU/);
  assert.doesNotMatch(html, /buddhabrot-iterations\.gif|<video/i);
  assert.match(html, /Melinda Green/);
  assert.match(html, /z → z² \+ c/);
  assert.doesNotMatch(html, /How does this work/);
  assert.doesNotMatch(html, /Iteration means/);
  assert.doesNotMatch(html, /waterGrain|resultCard|gameTitle|hudPill/);
  assert.doesNotMatch(html, /introOverlay|introCanvas/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});
