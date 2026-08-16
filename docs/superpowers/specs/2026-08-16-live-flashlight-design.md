# Live opening throws and flashlight

Date: 2026-08-16

## Problem

The opening painted a random Buddhabrot while a 2D overlay faked stones.
Flashlight then showed that pre-filmed texture. Trails and the nebula were
not the same system.

## Decision

Use the real orbit engine for both.

- Opening: auto-throw visible stones on the playfield. Skip impacts spawn
  GPU orbits. No generator, cache, or second WebGPU canvas. About four
  throws, then reset for play. Reduce-motion and share links skip this.
- Flashlight: punch a hole in the dark overlay so live trails show in the
  cone. While aiming, throw invisible light skips into the cone
  (`6` dots, depth `8000`, cap `36` sources). Clear them on release.
- Do not draw or cache a Buddhabrot PNG in the flashlight.
