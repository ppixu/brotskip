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
  the game and clears the nebula. Reduce-motion and share links skip this.
- Flashlight: punch a soft-edged hole in the dark overlay. While aiming,
  show a dim cached Buddhabrot in the cone and iterate random single
  points there (`1` seed, depth `8000`, cap `36` sources). Do not throw
  rocks. Clear live cone orbits on release.

## Atmosphere

Opening and flashlight share a grayscale, lineless presentation so the
nebula reads as density, not skip-colored paths.

- Hide orbit iteration lines (`drawLines: false`). Gameplay still draws them.
- Color both as monochrome depth gray, ignoring skip tints.
- Flashlight skips the first 24 iterates so sacred-shape seeds stay
  invisible. Opening plots from the first iterate so a Buddhabrot can form.
- Flashlight point energy stays low so the cone stays dim. Gameplay nebula
  energy is much lower so the background Buddhabrot stays a faint wash.
  Opening uses a brighter grayscale nebula behind a sparse volley, keeps
  iterating for a short settle, then fades before clearing for play.
  The aim cone has no fill or stroked rim; its sides fade with a conic mask.
