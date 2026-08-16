# Live opening throws and flashlight

Date: 2026-08-16

## Problem

The opening painted a random Buddhabrot while a 2D overlay faked stones.
Flashlight then showed that pre-filmed texture. Trails and the nebula were
not the same system.

## Decision

Use the real orbit engine for both.

- Opening: auto-throw a simultaneous volley (24 stones, 3 per wave) on the
  playfield. Skip impacts spawn GPU orbits. No generator, cache, or second
  WebGPU canvas. Then reset for play. Reduce-motion and share links skip this.
- Flashlight: punch a hole in the dark overlay so live trails show in the
  cone. While aiming, throw invisible light skips into the cone
  (`6` dots, depth `8000`, cap `36` sources). Clear them on release.
- Do not draw or cache a Buddhabrot PNG in the flashlight.

## Atmosphere

Opening and flashlight share a grayscale, lineless presentation so the
nebula reads as density, not skip-colored paths.

- Hide orbit iteration lines (`drawLines: false`). Gameplay still draws them.
- Color both as monochrome depth gray, ignoring skip tints.
- Flashlight point energy is about 15% of play energy so the cone stays
  dim. Opening uses full play energy with many overlapping throws.
