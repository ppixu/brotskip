# Audio Synthesis System — Design

**Date:** 2026-08-18
**Status:** Approved

## Goals

1. Every shape sounds different: each of the 7 sacred glyphs has an unmistakable sonic identity, and each throw varies within that identity.
2. Always pleasant, modern synthesizer / videogame-rich sound — musicality guaranteed by construction, not by luck.
3. Big forms created early in a throw get loud, proud musical statements; ongoing iteration keeps an interesting, shape-driven texture that thins out as growth slows.

## Summary

Replace the inline synth in `app/MandelbrotSkipping.tsx` with a dedicated `lib/audio/` module offering **two complete sound engines behind a user toggle**:

- **Melodic** — a generative-music engine: quantized event layer (glyph instrument patches, arpeggio streams, milestone swells) over a macro-controlled wavetable bed.
- **Resonant** — a physical-modelling engine: each glyph's geometry defines a modal resonator bank; splashes strike it, orbits strum it, growing forms bow it.

Both share one master bus, one music-theory core, and one feature-extraction pipeline.

## Current state

`MandelbrotSkipping.tsx` (~3380 lines) contains:

- `tone()` blips for throw / skip impacts / round finish.
- `iterationSynth`: a continuous FM drone stack (carrier/overtone/sideband/sub + detune FM), 15 per-skip voices, an unquantized pulse sequencer, noise, short delay, compressor. Roughly 40 parameters driven from live orbit statistics via `orbitShape()` (area, spread, elongation, orientation, density, centroid) plus coverage/growth/contraction signals. Landing position seeds one of 5 scales (`SONIC_SCALES`), including whole-tone and in-sen.

Shortcomings relative to the goals: glyph identity is only a waveform choice and a small degree offset; harsh elements (sawtooth sideband, waveshaper drive, high resonance, wide detune FM) and unquantized pulse timing undermine pleasantness; big early forms only nudge the drone louder instead of getting a distinct musical event.

All of this inline audio code is removed and replaced by calls into `lib/audio/`.

## Architecture

```
lib/audio/
  engine.ts    — AudioContext owner, master bus, lookahead scheduler, mode crossfade
  theory.ts    — scales, chord progression, degree→Hz, palette seeding from landing c
  features.ts  — orbitScores → FeatureFrame + milestone detector
  melodic.ts   — Melodic engine
  modal.ts     — Resonant engine
  index.ts     — public no-throw API
```

### Public API (index.ts)

```ts
init(): void                       // create context on first user gesture
setMode(mode: "melodic" | "resonant"): void
setVolume(v: number): void
setMuted(m: boolean): void
throwStart(): void
splash(skipIndex: number, glyph: number, xNorm: number): void
update(frame: FeatureFrame, phase: Phase): void   // called from the game loop, ~24 Hz
finish(score: number): void
reset(): void
destroy(): void
```

Every function is wrapped in try/catch; audio remains strictly optional (same contract as today's `tone()`). No sound is produced before a user gesture; a suspended context is resumed on gesture or stays silent.

### engine.ts — shared infrastructure

- Owns the `AudioContext` (created lazily on first gesture, mirroring the existing `ensureAudio` pattern).
- **Master bus:** engine submixes → `DynamicsCompressorNode` (gentle: threshold −27 dB, ratio ~5) → tanh soft-clip `WaveShaperNode` → destination. Parallel reverb send: `ConvolverNode` with a generated stereo impulse response (~2.2 s exponentially decaying noise, decorrelated channels; built with `OfflineAudioContext`, falling back to dry if generation fails). No sample assets.
- **Lookahead scheduler:** 25 ms `setInterval` tick scheduling events up to 120 ms ahead on the audio clock. The Melodic engine quantizes events to a soft ~90 BPM eighth-note grid; the Resonant engine uses the scheduler for grain timing without a musical grid.
- **Mode switch:** each engine renders into its own submix `GainNode`; switching crossfades submixes over 0.5 s. Engines are lazily constructed on first use.

### theory.ts — musical core

- Consonant-only scale set: major pentatonic, minor pentatonic, dorian, lydian, mixolydian (replaces whole-tone and in-sen).
- Palette seeding retained: the landing position `c` of the first orbit seeds scale choice and root (root MIDI in the mid-30s to mid-40s), so every throw lands in a fresh but always-consonant key.
- `degreeToFrequency(degree)` maps scale degrees (with octave wrap) to Hz; **all pitched material in both engines goes through it**. Sustained tones are capped at ~2.5 kHz.
- Slow chord progression for the Melodic mode: a 4-chord ambient loop (e.g. i–VI–III–VII pattern expressed as scale-degree stacks), advancing every 2 bars; milestone swells and arpeggios voice the current chord.

### features.ts — one pipeline for both engines

- `extractFrame(orbitScores, rock, phase, now): FeatureFrame` — ports the statistics currently computed inside `updateIterationSound`: per-glyph-group area/spread/elongation/orientation/density/centroid/coverage/coverage-motion/deepest, plus global activeRatio, dispersion, chaos, growth, contraction, proximity, glyph count.
- **Milestone detector:** per glyph group, fires `firstBloom` when `distinct ≥ 8`, then a `doubling` event every time coverage doubles thereafter. Event magnitude = log2(gained cells) × shape area. Early large forms cross several thresholds quickly → large layered events; the late fine-detail tail fires rarely and softly. Both engines consume the same milestone stream.

## Melodic engine (melodic.ts)

- **Bed:** two morphing wavetable voices (`PeriodicWave` tables). Shape statistics collapse into four slew-limited macros:
  - brightness ← spread + density → lowpass cutoff
  - warmth ← symmetry → wavetable morph position
  - motion ← chaos + dispersion → LFO depth/rate
  - space ← spread + glyph count → reverb send
- **Glyph patches** (event voices, all scale-locked):
  | Glyph | Patch |
  |---|---|
  | 0 concentric halo | warm 2-op FM bell |
  | 1 triangle mandala | Karplus-Strong pluck (delay-line string) |
  | 2 vesica piscis | detuned supersaw pad, slow filter sweep |
  | 3 four-petal rose | glassy 4-partial additive chime |
  | 4 pentagram | 5-note rolling arpeggio pluck |
  | 5 hexagram | formant-filtered square lead |
  | 6 flower of life | 7-partial shimmer drone |
  Landing `c` varies octave, detune, and brightness per throw so a glyph never repeats exactly.
- **Iteration life:** one arpeggio stream per active skip. Live orbit `z` positions bucket into scale degrees; note rate follows coverage motion and fades to sparse twinkles as growth slows. Deepest depth slowly raises the register; distance contraction bends pitch upward.
- **Splash:** pluck voiced on the current chord (pitch rising with skip index) plus a lowpass-filtered noise splash.
- **Milestones:** chord swell + sub-bass boom, gain and voicing width scaled by event magnitude.

## Resonant engine (modal.ts)

- **Resonator banks:** one per glyph, built from 6–10 parallel bandpass `BiquadFilter`s. Mode frequency ratios derive from the glyph's geometry: circle → drumhead Bessel ratios; triangle/pentagon/hexagon → polygonal plate ratio sets; vesica piscis → two slightly detuned coupled circle series; four-petal rose → circle series with split degenerate modes; flower of life → 7 hex-lattice partials. Root frequencies are scale-locked via `theory.ts` so output stays musical.
- **Exciters:**
  - splash → mallet strike (short noise burst + pitch-swept sine thump) into that glyph's bank;
  - iteration → grain taps whose rate follows coverage motion, panned from group centroid;
  - big form → "bow": sustained filtered-noise energy into the bank with gain proportional to area growth, producing a singing-bowl swell on milestones.
- Q values and per-mode gains are tuned constants; banks for all 7 glyphs are cheap enough to keep alive and are gated by per-bank gain.

## Game integration

`MandelbrotSkipping.tsx` changes:

- Delete `tone()`, `ensureIterationSynth`, `updateIterationSound`, `iterationSynth` state and related bookkeeping (~350 lines).
- Call sites: throw release → `throwStart()`; each skip impact → `splash(...)`; the per-frame block that called `updateIterationSound` → `extractFrame(...)` + `update(frame, phase)`; round end → `finish(score)`; `resetRound` → `reset()`.
- `update` remains rate-limited to roughly the current 42 ms cadence; all continuous parameter moves inside the engines use `setTargetAtTime` with per-parameter time constants (no zipper noise, no jumps).

## UI + persistence

- Tuning panel gains: **Sound engine** toggle (Melodic / Resonant), volume slider, mute.
- Stored on the existing `Tuning` object; `sanitizeTuning` defaults missing fields (engine = melodic, volume = 0.8, muted = false). No storage-key bump required.

## Error handling

- All public API calls are no-throw; failures degrade to silence.
- Impulse-response generation failure → dry signal path.
- `AudioContext` suspended → resume attempted on user gesture; otherwise silent.
- Engine construction failure → the other engine remains usable; toggle still renders.

## Testing

- Vitest unit tests (existing `tests/` + vite setup) for pure logic:
  - `theory.ts`: degree→frequency math, scale wrapping, palette seeding determinism;
  - `features.ts`: milestone detector thresholds and magnitudes, feature extraction on synthetic `orbitScores`;
  - `modal.ts`: modal ratio tables (shape, ordering, bounds).
- Audio-graph code is kept thin and declarative; verified by ear during implementation.

## Out of scope

- Background music independent of gameplay.
- Sample-based assets of any kind.
- AudioWorklet DSP (revisit only if node-graph CPU cost proves problematic).
- Intro/loading-phase sonification (can be a follow-up; the API accepts phases, so wiring it later is cheap).
