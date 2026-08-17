# Mode-local trail atlas

Date: 2026-08-17

Superseded by `2026-08-17-native-pixel-pond-design.md` (native-pixel pond and
throw buffers, no zoom).

## Problem

One 4096² atlas over `TRAIL_BOUNDS` made loading grainy (hops are 1px in 16M
texels) and play empty (each throw clears the atlas, then deposits at low
energy with 0.16 display gain). A fixed world atlas also goes blocky if you
zoom much past today’s floor (`halfY` 0.035).

Play should show only the current throw’s orbit, as a clear sharp shape.
Loading should still form a Buddhabrot. Zoom should go ~10× deeper than
today and stay sharp.

## Decision

Keep one orbit engine and one 2048² ping-pong atlas. Change the *window*,
not the pipeline.

- Loading: lock bounds to `TRAIL_BOUNDS`. 2048² over the pond is 4× denser
  than 4096², so the Buddha fills as a shape.
- Play and flashlight: sticky window ~2× the current view
  (`focusAtlasBounds` via `mathBoundsForView`). Recenter when the view
  leaves the atlas, the center leaves the inner half, or an atlas texel
  would cover more than 2 screen pixels. Recenter clears the atlas; the
  live screen-space layer still draws this frame’s hops.
- Each throw still clears. No intro nebula in play. Play `atlasGain` is
  ~1 so the throw is the picture.
- Zoom floor `MIN_VIEW_HALF_Y` is ~0.0035.

Shaders already sample uploaded bounds. CPU scoring still uses world
`TRAIL_BOUNDS`. The flashlight’s cached overlay is unchanged.

## Non-goals

A multi-level clipmap. Keeping already-drawn trails sharp after a recenter.
Infinite Mandelbrot explorer zoom. Changing point-list topology.
