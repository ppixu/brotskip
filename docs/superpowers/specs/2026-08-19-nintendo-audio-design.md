# Nintendo Pentatonic Audio — Design

**Date:** 2026-08-19
**Status:** Implemented

## Goals

1. Every sacred glyph sounds different.
2. Always pleasant, Nintendo-bright synthesizer / videogame-rich sound.
3. Big early forms get proud musical statements; ongoing iteration keeps a shape-driven pentatonic texture that thins as growth slows.

## Why the previous engines were reverted

The Melodic/Resonant pair sat in a bass register (root MIDI 36–47, ~C2–B2), used long dark pads and a 2.2 s cathedral reverb, and replaced the current game’s sparkle with bland low drones. This design keeps one engine, in the melody register, with short envelopes.

## Sound

- **Scales:** major pentatonic and minor pentatonic only. Landing `c` picks scale and root. Roots are MIDI 64–70 (E4–Bb4). Nothing is allowed below 196 Hz; skip transients live above 400 Hz.
- **Master bus:** high-pass at 220 Hz, punchy compressor (threshold −18 dB), mild soft clip, 0.45 s bright reverb. Tempo 144 BPM.
- **Skip hits:** noise click + square coin-blip (pitch falls from 1.38×) + pentatonic chord stab. Pitch climbs the scale with skip index so combos brighten. Each glyph uses its own chord and waveform.
- **Iteration:** a held pentatonic chord (triangle, voiced from the lead glyph) plus per-skip arpeggios (square/pulse). Arp rate follows coverage growth: 16th notes while forms bloom, quarter-note twinkles when they settle.
- **Glyph patches:** seven unique waveform/duty/chord/arp combinations (halo bells, 25% pulse triad, vesica two-note, 4-petal roll, 12.5% pulse pentatonic sparkle, interlocking hexagram arp, 7-step flower).
- **Milestones:** coverage bloom (8 cells) and later doublings fire a short rising pentatonic flourish. Early large forms cross thresholds fast and loud.

## Architecture

```
lib/orbit-shape.ts     — coverage-grid stats (shared with scoring)
lib/audio/theory.ts    — pentatonic palettes, degree→Hz, bright register
lib/audio/features.ts  — orbitScores → FeatureFrame + milestone detector
lib/audio/engine.ts    — AudioContext, high-pass bus, short reverb, scheduler
lib/audio/chiptune.ts  — the one sound engine
lib/audio/index.ts     — no-throw GameAudio facade
```

`MandelbrotSkipping.tsx` calls `init` / `throwStart` / `splash` / `update` / `finish` / `reset` / `destroy`. Audio stays optional: every public method is no-throw and silent without a running `AudioContext`.
