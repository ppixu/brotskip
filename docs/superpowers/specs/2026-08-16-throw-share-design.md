# Share a finished throw

Date: 2026-08-16

## Problem

A good skip exists only on the device that threw it. There is no way to send
that round to someone else or watch it again from a link.

## Decision

Encode the finished throw into the page hash (`#t=...`). Opening the link
auto-plays that throw after the pond is ready. Replay runs the same snapshot.
Shared playback does not write Local legends. Glyph-dot count and 90° rotation
follow the snapshot for playback only and are not saved to the recipient's
tuning.

## Snapshot

version, view (centerX, centerY, halfY), rotateRight, aim angle, raw power,
planned skips, glyph offset, bounce seed, sourceDots.

## Non-goals

Server-side short links. Recording every splash coordinate. Changing the
recipient's saved orbit-limit or acceleration.
