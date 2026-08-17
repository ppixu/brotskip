# Live opening throws and flashlight

Date: 2026-08-16

## Problem

The opening painted a random Buddhabrot while a 2D overlay faked stones.
Flashlight then showed that pre-filmed texture. Trails and the nebula were
not the same system.

## Decision

Use the real orbit engine for both.

- Opening: keep throwing a simultaneous volley (16 stones per wave) until
  Play, but only draw every 50th rock so trajectories stay sparse. Launch
  each rock from a random point aiming toward the pond. Append random nebula
  seeds from just outside the set, without overwriting live orbits, so a
  Buddhabrot can form until Play. Splash ripples mark pond hits; trajectories
  ease out. After a 5.4s settle, a Play button in the playfield center starts
  the game and hides the nebula without wiping it. Reduce-motion and share
  links skip this.
- Flashlight: punch a soft-edged hole in the dark overlay. While aiming,
  show the live pond Buddhabrot in the cone (same iteration as loading).
  Cached bitmap is GPU-fail fallback only. See
  `2026-08-17-native-pixel-pond-design.md`. Do not throw rocks.

## Atmosphere

Opening and flashlight share a grayscale, lineless presentation so the
nebula reads as density, not skip-colored paths.

- Hide orbit iteration lines (`drawLines: false`). Gameplay still draws them.
- Color both as monochrome depth gray, ignoring skip tints.
- Opening and aiming both plot from the first iterate so a Buddhabrot can
  form. Aiming no longer skips 24 steps or uses a 36-source cap.
- Gameplay hides the pond nebula except inside the aim cone. Each throw
  paints a native-pixel throw buffer. Opening uses a brighter grayscale
  nebula behind a sparse volley, keeps iterating for a short settle, then
  hides (does not wipe) the pond for play.
  The aim cone has no fill or stroked rim; its sides fade with a conic mask.
- Opening samples escaping seeds across the trail bounds (not just the
  cardioid rim), accumulates them in a native-pixel pond buffer, and hides
  the sparkly live overlay so filaments read sharp. Coordinates default to
  90° right so the Buddha sits upright.
