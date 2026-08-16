# Live opening throws and flashlight

Date: 2026-08-16

## Problem

The opening painted a random Buddhabrot while a 2D overlay faked stones.
Flashlight then showed that pre-filmed texture. Trails and the nebula were
not the same system.

## Decision

Use the real orbit engine for both.

- Opening: keep throwing a simultaneous volley (16 stones per wave) as dim
  trajectories plus later orbit points until Play. Launch each rock from a
  random point aiming toward the pond. After a 5.4s settle, a Play button in
  the playfield center starts the game and clears the nebula. Reduce-motion
  and share links skip this.
- Flashlight: punch a hole in the dark overlay so live trails show in the
  cone. While aiming, throw invisible light skips into the cone
  (`6` dots, depth `8000`, cap `36` sources). Clear them on release.
- Do not draw or cache a Buddhabrot PNG in the flashlight.

## Atmosphere

Opening and flashlight share a grayscale, lineless presentation so the
nebula reads as density, not skip-colored paths.

- Hide orbit iteration lines (`drawLines: false`). Gameplay still draws them.
- Color both as monochrome depth gray, ignoring skip tints.
- Flashlight and opening skip the first 24 iterates so sacred-shape seeds
  stay invisible and only later orbit points fill in.
- Flashlight point energy is about 15% of play energy so the cone stays
  dim. Opening uses a dim grayscale nebula behind the volley, keeps
  iterating for a short settle, then fades before clearing for play.
