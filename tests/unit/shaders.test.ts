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

test("WGSL shaders do not reuse a binding name as an entry point", () => {
  assert.ok(Object.keys(shaders).includes("histogramShader"));
  for (const [name, source] of Object.entries(shaders)) {
    const { bindings, fns } = wgslNames(source);
    const overlap = bindings.filter((binding) => fns.includes(binding));
    assert.deepEqual(overlap, [], `${name} redeclares ${overlap.join(", ")}`);
  }
});
