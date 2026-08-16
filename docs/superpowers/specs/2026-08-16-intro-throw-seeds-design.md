# Intro Buddhabrot from throws

Date: 2026-08-16

## Problem

The opening overlay throws stones while a GPU Buddhabrot fills from
uniform random `c` samples. Landings never become seeds, so the nebula
grows independently of the trajectories.

## Decision

During the intro (motion on), accumulate only around skip landings:
sacred-shape dots at the splash plus a small complex-plane jitter cloud.
Aim/snap each skip to an escaping `c` so it actually paints. Reduced
motion keeps uniform sampling and skips the overlay.

Draw the actual iteration polyline of each skip on top of the film,
skip-tinted and bright, growing out from the splash.

The cached flashlight is the picture those throws built.
