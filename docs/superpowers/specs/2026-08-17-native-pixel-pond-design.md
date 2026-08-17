# Native-pixel pond and throw buffers

Date: 2026-08-17

Supersedes the view-following atlas in
`2026-08-17-mode-local-atlas-design.md` and the sparse flashlight recipe in
`2026-08-16-live-flashlight-design.md`.

## Problem

The GPU canvas is sized in CSS pixels, then a 2048² atlas is linear-filtered
onto it and the browser scales up to the display. Loading looks smudged and
half-res. Play zoom recenters that atlas and clears the throw. Flashlight
spawns one random cone point every 240ms, hides the first 24 iterates, and
blits a cached bitmap, so aiming is a few bright specks instead of a Buddha.

Loading and aiming should show the same pond-wide Buddhabrot at native
display pixels. Throws should paint 1px hops. Zoom can go away.

## Decision

Two screen-sized GPU layers, nearest-sampled, 1px points. One orbit engine
and one source buffer: pond and throw never iterate in the same frame.

### Framebuffer

Size the WebGPU canvas like the 2D overlay: CSS size × `min(devicePixelRatio, 2)`.
Recreate layer textures on that size. Sampler mag/min is `nearest`.

### Pond layer

Ping-pong accumulation the size of the GPU canvas. Bounds stay `TRAIL_BOUNDS`
(world-locked). Fade retention is 1 (pure accumulate). At intro framing this
is ~1 texel per pixel; play is a tighter crop (~2×), which is accepted
because zoom is gone.

- Loading: full-screen. Escaping `introNebulaSeed`s, `spawnAppend`,
  `INTRO_MAX_DEPTH`, `INTRO_SOURCE_CAP`, intro atmosphere (grayscale, no
  lines, hiddenSteps ≤ 1, low live gain). Splat into the pond textures.
- Play: keep the pond texels. `clear()` must not wipe them. Zero the source
  buffer so throws get the compute budget. Pond gain 0.
- Aiming: splat into the pond again. Composite only inside today’s
  flashlight cone (`FLASHLIGHT_HALF_ANGLE`, same soft edge) via display
  uniforms, not a 2D bitmap. Resume the intro spawn recipe so skipped intros
  still fill and loaded ponds keep refining.

Replay opening is the one path that clears the pond textures.

### Throw layer

Second canvas-sized ping-pong. On release, lock bounds to
`mathBoundsForView` at that camera so hops are 1 texel = 1 pixel. Clear throw
textures and sources on each new throw. Play atmosphere (colored, lines).
Throw gain 0 while aiming.

### Camera

Drop wheel and `+/-` zoom. Intro stays at `INTRO_VIEW_HALF_Y`; play stays at
`VIEW_HALF_Y`. Pan stays. Pond stays glued to the water. A throw stays 1:1
for the view you released from; a large pan can crop it.

Retire `atlasFollowView`, `focusAtlasBounds`, and recenter-on-zoom.

### Flashlight overlay

When the orbit engine is running, do not draw the cached Buddhabrot into
the cone. The live pond layer * cone is the picture. If WebGPU fails, keep
the cached blit as fallback.

## Display

Composite `pond * pondGain * cone + throw * throwGain + live`. Intro:
pondGain 1, cone 1, throwGain 0. Ready/flying/result: pondGain 0, throwGain
1. Aiming: pondGain 1, cone is the flashlight falloff, throwGain 0.

## Non-goals

Clipmaps. Deep zoom. Changing point-list topology. Rebuilding the cached
texture pipeline. Dual-buffer VRAM caps beyond the existing dpr cap of 2.
