import assert from "node:assert/strict";
import test from "node:test";
import { MODAL_RATIOS } from "../../lib/audio/modal.ts";

test("every glyph has a well-formed modal ratio set", () => {
  assert.equal(MODAL_RATIOS.length, 7);
  for (const ratios of MODAL_RATIOS) {
    assert.ok(ratios.length >= 6, "at least six modes");
    assert.equal(ratios[0], 1, "fundamental first");
    for (let index = 1; index < ratios.length; index++) {
      assert.ok(ratios[index] > ratios[index - 1], "strictly increasing");
    }
    assert.ok(ratios[ratios.length - 1] <= 4.2, "modes stay under ~4x the root");
  }
});

test("glyph geometries differ audibly (no two ratio sets equal)", () => {
  for (let a = 0; a < MODAL_RATIOS.length; a++) {
    for (let b = a + 1; b < MODAL_RATIOS.length; b++) {
      assert.notDeepEqual(MODAL_RATIOS[a], MODAL_RATIOS[b]);
    }
  }
});
