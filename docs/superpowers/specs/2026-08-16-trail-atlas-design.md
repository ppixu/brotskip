# World-space trail atlas

Date: 2026-08-16

## Problem

After a throw starts, pan/zoom pauses iteration for 100ms and warps a
screen-space trail bitmap. Continuous camera motion freezes the nebula and
smears hops.

## Decision

Accumulate trails in a fixed complex-plane atlas (`TRAIL_BOUNDS`, 4096²).
The camera only changes how that atlas is sampled. This frame’s hops also
draw in the current view so live ink stays sharp. No camera pause.

The flying stone is reprojected with the view so it stays on the same water.
Throw speed/gravity use `minDimension * (referenceHalfY / view.halfY)` so a
given pull covers the same pond distance at any zoom.

## Non-goals

Storing every hop as geometry. Regenerating a sharp atlas at deep zoom.
