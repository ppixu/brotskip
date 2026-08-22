/**
 * One Nintendo-bright engine: pentatonic chords while orbits grow, punchy
 * skip hits, and a unique patch per sacred glyph. Bass is a slow ambient pad.
 */
import {
  DEFAULT_BPM,
  makeNoiseBuffer,
  scheduleCleanup,
  type EngineShell,
} from "./engine.ts";
import type { FeatureFrame, GlyphGroupFeatures, Milestone } from "./features.ts";
import {
  degreeToFrequency,
  MAX_TRANSIENT_HZ,
  paletteFromLanding,
  type Palette,
} from "./theory.ts";

export type Waveform = "sine" | "triangle" | "square" | "pulse";

export type GlyphPatch = {
  waveform: Waveform;
  duty: number;
  chord: readonly number[];
  arp: readonly number[];
  splashOffset: number;
};

export const GLYPH_PATCHES: readonly GlyphPatch[] = [
  { waveform: "sine", duty: .5, chord: [0, 2, 4], arp: [0, 2, 4, 2], splashOffset: 0 },
  { waveform: "pulse", duty: .25, chord: [0, 2, 3], arp: [0, 2, 3], splashOffset: 1 },
  { waveform: "triangle", duty: .5, chord: [0, 4], arp: [0, 4, 0, 4], splashOffset: 2 },
  { waveform: "sine", duty: .5, chord: [0, 1, 3, 4], arp: [0, 1, 3, 4], splashOffset: 0 },
  { waveform: "pulse", duty: .125, chord: [0, 1, 2, 3, 4], arp: [0, 1, 2, 3, 4], splashOffset: 2 },
  { waveform: "square", duty: .5, chord: [0, 2, 3], arp: [0, 2, 3, 5, 3, 2], splashOffset: 1 },
  { waveform: "triangle", duty: .5, chord: [0, 2, 3, 4, 5], arp: [0, 2, 4, 5, 4, 2, 0], splashOffset: 0 },
];

const MAX_CHORD_VOICES = 5;
const MAX_ARP_VOICES = 15;
const LOOKAHEAD = .12;

export function chordDegrees(glyph: number): readonly number[] {
  return GLYPH_PATCHES[((glyph % 7) + 7) % 7].chord;
}

export function arpPattern(glyph: number): readonly number[] {
  return GLYPH_PATCHES[((glyph % 7) + 7) % 7].arp;
}

export function splashDegree(skipIndex: number, glyph: number): number {
  const patch = GLYPH_PATCHES[((glyph % 7) + 7) % 7];
  return 5 + Math.max(0, skipIndex - 1) + patch.splashOffset;
}

export function splashPeakHz(palette: Palette, skipIndex: number, glyph: number): number {
  return degreeToFrequency(palette, splashDegree(skipIndex, glyph), MAX_TRANSIENT_HZ);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Busy growth → 16th notes; settled forms → slower twinkles. */
export function arpIntervalSeconds(activity: number, growth: number): number {
  const sixteenth = 60 / DEFAULT_BPM / 4;
  const quarter = 60 / DEFAULT_BPM;
  const energy = clamp01(activity * .6 + growth * .85);
  return sixteenth + (quarter - sixteenth) * (1 - energy);
}

export function chordGain(presence: number, growth: number, resolving: boolean): number {
  const level = .04 + clamp01(presence) * .08 + clamp01(growth) * .055;
  return resolving ? level * .72 : level;
}

/** Slow pentatonic pad; long spirals drop an extra octave. */
export const BASS_PATTERN: readonly number[] = [0, 3];

export function bassDegree(step: number, depthBand: number, glyph: number): number {
  const walk = BASS_PATTERN[((Math.floor(step) + Math.floor(glyph)) % BASS_PATTERN.length + BASS_PATTERN.length) % BASS_PATTERN.length];
  const octave = depthBand > 10 ? -10 : -5;
  return walk + octave;
}

export function bassIntervalSeconds(): number {
  return 60 / DEFAULT_BPM * 8;
}

/** Arp lick plus a climb/twist so a long spiral does not loop one ostinato. */
export function melodyDegree(glyph: number, step: number, depthBand: number, zAngle: number): number {
  const pattern = arpPattern(glyph);
  const base = pattern[((Math.floor(step) % pattern.length) + pattern.length) % pattern.length];
  const climb = Math.floor(Math.max(0, depthBand) * .35);
  const swirl = Math.round((zAngle / Math.PI + 1) * 1.5) % 5;
  return base + 5 + climb + swirl;
}

/**
 * The sling draw ratchets through a fixed number of steps, like a wind-up
 * meter: one short tick per step crossed, never a held tone.
 */
export const SLING_TICK_STEPS = 7;
export const SLING_TICK_MIN_GAP_SECONDS = .04;

export function slingTickIndex(tension: number): number {
  return Math.round(clamp01(tension) * SLING_TICK_STEPS);
}

/** Pentatonic climb, so winding up stays in key with everything else. */
export function slingTickDegree(index: number): number {
  return 2 + Math.max(0, Math.min(SLING_TICK_STEPS, index));
}

/**
 * The launch body: a pitched-down thump lands on the release. It bottoms out
 * above the master high-pass (72 Hz) so the weight survives the bus.
 */
export const LAUNCH_THUMP_END_HZ = 88;

export function launchThumpStartHz(power: number): number {
  return 150 + clamp01(power) * 140;
}

export function launchThumpGain(power: number): number {
  return .26 + clamp01(power) * .2;
}

/** Launch rip: a short upward run that grows a note or two with draw power. */
export function launchDegrees(power: number): readonly number[] {
  const steps = 3 + Math.round(clamp01(power) * 3);
  return Array.from({ length: steps }, (_, index) => 3 + index * 2);
}

/** Rising celebratory arpeggios on the tonic triad (0, 2, 3) plus octaves. */
export function fanfareMelodyDegrees(tier: 0 | 1 | 2 | 3): readonly number[] {
  const phrases: readonly (readonly number[])[] = [
    [0, 2, 3, 5],
    [0, 2, 3, 5, 7, 10],
    [0, 2, 3, 5, 3, 5, 7, 8, 10, 12],
    [0, 2, 3, 5, 3, 5, 5, 7, 8, 10, 8, 10, 12, 15, 17, 20],
  ];
  return phrases[tier];
}

export function fanfareChordDegrees(tier: 0 | 1 | 2 | 3): readonly number[] {
  return tier >= 3 ? [0, 2, 3, 5, 7, 10] : [0, 2, 3, 5];
}

export type FanfarePlan = {
  tier: 0 | 1 | 2 | 3;
  noteCount: number;
  stepSeconds: number;
  duration: number;
  bassStyle: "none" | "pad";
  withFinalChord: boolean;
};

export function fanfareTier(complexity: number): 0 | 1 | 2 | 3 {
  const value = clamp01(complexity);
  if (value < .18) return 0;
  if (value < .4) return 1;
  if (value < .7) return 2;
  return 3;
}

export function fanfarePlan(complexity: number): FanfarePlan {
  const tier = fanfareTier(complexity);
  const melody = fanfareMelodyDegrees(tier);
  const noteCount = melody.length;
  const stepSeconds = [.07, .075, .08, .072][tier];
  const tail = [.12, .28, .55, 1.05][tier];
  const phraseGap = tier >= 2 ? .1 : 0;
  return {
    tier,
    noteCount,
    stepSeconds,
    duration: noteCount * stepSeconds + phraseGap + tail,
    bassStyle: "none",
    withFinalChord: tier >= 2,
  };
}

export function finishComplexity(input: {
  score: number;
  deepest: number;
  coverage: number;
  skips: number;
}): number {
  const scorePart = Math.min(1, Math.max(0, input.score) / 2_000_000);
  const depthPart = Math.min(1, Math.log2(Math.max(0, input.deepest) + 1) / 22);
  const coverPart = Math.min(1, Math.log2(Math.max(0, input.coverage) + 1) / 14);
  const skipPart = Math.min(1, Math.max(0, input.skips - 2) / 10);
  return clamp01(scorePart * .4 + depthPart * .25 + coverPart * .25 + skipPart * .1);
}

function pulsePartials(duty: number, count = 24): { real: Float32Array; imag: Float32Array } {
  const real = new Float32Array(count);
  const imag = new Float32Array(count);
  const width = Math.max(.05, Math.min(.5, duty));
  for (let partial = 1; partial < count; partial++) {
    imag[partial] = 2 / (partial * Math.PI) * Math.sin(partial * Math.PI * width);
  }
  return { real, imag };
}

export type ChiptuneEngine = {
  setPalette(palette: Palette): void;
  slingGrab(): void;
  slingPull(tension: number): void;
  throwStart(power?: number): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  milestone(event: Milestone): void;
  update(frame: FeatureFrame, resolving: boolean): void;
  silence(): void;
  finish(scoreRatio: number): number;
  reset(): void;
};

type ArpVoice = {
  oscillator: OscillatorNode;
  gain: GainNode;
  pan: StereoPannerNode;
  step: number;
  nextTime: number;
};

export function createChiptuneEngine(shell: EngineShell): ChiptuneEngine {
  const context = shell.context;
  const output = shell.output;
  const gameplayTransientBus = context.createGain();
  const victoryBus = context.createGain();
  gameplayTransientBus.gain.value = 1;
  victoryBus.gain.value = 0;
  gameplayTransientBus.connect(output);
  victoryBus.connect(output);
  const noiseBuffer = makeNoiseBuffer(context, .35);
  const pulseWaves = {
    125: context.createPeriodicWave(...Object.values(pulsePartials(.125)) as [Float32Array, Float32Array]),
    25: context.createPeriodicWave(...Object.values(pulsePartials(.25)) as [Float32Array, Float32Array]),
  };

  const chordFilter = context.createBiquadFilter();
  chordFilter.type = "lowpass";
  chordFilter.frequency.value = 2800;
  chordFilter.Q.value = .7;
  const chordBus = context.createGain();
  const chordSend = context.createGain();
  chordBus.gain.value = 1;
  chordSend.gain.value = .14;
  chordFilter.connect(chordBus).connect(output);
  chordBus.connect(chordSend).connect(shell.reverbBus);

  const chordVoices = Array.from({ length: MAX_CHORD_VOICES }, () => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 440;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(chordFilter);
    oscillator.start();
    return { oscillator, gain };
  });

  const arpVoices: ArpVoice[] = Array.from({ length: MAX_ARP_VOICES }, () => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    oscillator.type = "square";
    oscillator.frequency.value = 660;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(pan).connect(output);
    oscillator.start();
    return { oscillator, gain, pan, step: 0, nextTime: 0 };
  });

  const bassRoot = context.createOscillator();
  const bassFifth = context.createOscillator();
  const bassGain = context.createGain();
  const bassFifthGain = context.createGain();
  bassRoot.type = "triangle";
  bassFifth.type = "sine";
  bassRoot.frequency.value = 110;
  bassFifth.frequency.value = 165;
  bassGain.gain.value = 0;
  bassFifthGain.gain.value = 0;
  bassRoot.connect(bassGain).connect(output);
  bassFifth.connect(bassFifthGain).connect(output);
  bassRoot.start();
  bassFifth.start();

  let palette: Palette | null = null;
  let lastChordGlyph = 0;
  let finishGeneration = 0;
  let silenced = true;
  let slingTick = -1;
  let slingTickAt = 0;

  function setBusGain(bus: GainNode, value: number, timeConstant = .02) {
    const now = context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(value, now, timeConstant);
  }

  /**
   * Ramp to exact zero. setTargetAtTime only ever approaches its target, so a
   * .0001 floor left every sustained voice ringing forever; a linear ramp
   * lands on true silence.
   */
  function fadeToSilence(gain: GainNode, seconds: number) {
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + seconds);
  }

  function silenceVoices() {
    for (const voice of chordVoices) fadeToSilence(voice.gain, .12);
    for (const voice of arpVoices) {
      fadeToSilence(voice.gain, .1);
      voice.nextTime = 0;
    }
    fadeToSilence(bassGain, .34);
    fadeToSilence(bassFifthGain, .34);
  }

  function applyWave(oscillator: OscillatorNode, patch: GlyphPatch) {
    if (patch.waveform === "pulse") {
      oscillator.setPeriodicWave(patch.duty < .2 ? pulseWaves[125] : pulseWaves[25]);
      return;
    }
    oscillator.type = patch.waveform;
  }

  function blip(
    frequency: number,
    when: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    panPosition: number,
    extra?: { startRatio?: number },
    bus: GainNode = gameplayTransientBus,
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    oscillator.type = type;
    const startHz = frequency * (extra?.startRatio ?? 1);
    oscillator.frequency.setValueAtTime(startHz, when);
    if (extra?.startRatio) oscillator.frequency.exponentialRampToValueAtTime(Math.max(MIN_SAFE_HZ, frequency), when + duration * .45);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    pan.pan.value = panPosition;
    oscillator.connect(gain).connect(pan).connect(bus);
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
    scheduleCleanup(context, when + duration + .04, [oscillator, gain, pan]);
  }

  const MIN_SAFE_HZ = 80;

  function noiseClick(when: number, volume: number, panPosition: number, bus: GainNode = gameplayTransientBus) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 2400;
    filter.Q.value = .8;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .014);
    pan.pan.value = panPosition;
    source.connect(filter).connect(gain).connect(pan).connect(bus);
    source.start(when);
    source.stop(when + .03);
    scheduleCleanup(context, when + .05, [source, filter, gain, pan]);
  }

  /** Pitched-down low body — the weight behind a launch. */
  function thump(when: number, volume: number, fromHz: number, toHz: number, duration: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(fromHz, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(MIN_SAFE_HZ, toHz), when + duration * .55);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain).connect(gameplayTransientBus);
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
    scheduleCleanup(context, when + duration + .04, [oscillator, gain]);
  }

  /** Low-passed noise smack that fattens the first few milliseconds. */
  function noiseBody(when: number, volume: number, cutoffHz: number) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoffHz, when);
    filter.frequency.exponentialRampToValueAtTime(180, when + .12);
    gain.gain.setValueAtTime(Math.max(.0002, volume), when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .13);
    source.connect(filter).connect(gain).connect(gameplayTransientBus);
    source.start(when);
    source.stop(when + .16);
    scheduleCleanup(context, when + .18, [source, filter, gain]);
  }

  /** Band-passed noise sweep — the air the stone leaves behind. */
  function whoosh(when: number, duration: number, volume: number, fromHz: number, toHz: number) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(fromHz, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, toHz), when + duration);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + duration * .3);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(filter).connect(gain).connect(gameplayTransientBus);
    source.start(when);
    source.stop(when + duration + .02);
    scheduleCleanup(context, when + duration + .04, [source, filter, gain]);
  }

  function chordStab(when: number, glyph: number, peakHz: number, panPosition: number) {
    if (!palette) return;
    const patch = GLYPH_PATCHES[((glyph % 7) + 7) % 7];
    for (const degree of patch.chord.slice(0, 4)) {
      const hz = degreeToFrequency(palette, degree + 5, MAX_TRANSIENT_HZ);
      const mix = hz / Math.max(peakHz, 1);
      blip(hz, when, .16 + mix * .04, .07, patch.waveform === "square" || patch.waveform === "pulse" ? "square" : "triangle", panPosition);
    }
  }

  function scheduleArp(voice: ArpVoice, group: GlyphGroupFeatures, when: number, resolving: boolean, growth: number, depthBand: number) {
    if (!palette) return;
    const patch = GLYPH_PATCHES[((group.glyph % 7) + 7) % 7];
    const degree = melodyDegree(group.glyph, voice.step, depthBand, group.zAngle);
    const hz = degreeToFrequency(palette, degree);
    applyWave(voice.oscillator, patch);
    voice.oscillator.frequency.setValueAtTime(hz, when);
    voice.pan.pan.setTargetAtTime(Math.max(-.85, Math.min(.85, group.centroidX * .7)), when, .04);
    const peak = (.035 + group.activity * .09 + group.presence * .03) * (resolving ? .7 : 1);
    voice.gain.gain.cancelScheduledValues(when);
    voice.gain.gain.setValueAtTime(Math.max(.0001, voice.gain.gain.value), when);
    voice.gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), when + .01);
    voice.gain.gain.exponentialRampToValueAtTime(.0001, when + .07 + group.area * .05);
    voice.step += 1;
    voice.nextTime = when + arpIntervalSeconds(group.activity, growth);
  }

  return {
    setPalette(next) {
      palette = next;
    },
    slingGrab() {
      silenced = false;
      setBusGain(gameplayTransientBus, 1);
      const used = palette ?? paletteFromLanding(-0.58, 0);
      const when = context.currentTime + .005;
      slingTick = 0;
      slingTickAt = when;
      noiseClick(when, .13, 0);
      blip(degreeToFrequency(used, 0), when, .06, .09, "square", 0, { startRatio: 1.5 });
    },
    slingPull(tension) {
      const index = slingTickIndex(tension);
      if (index === slingTick) return;
      const now = context.currentTime;
      if (now - slingTickAt < SLING_TICK_MIN_GAP_SECONDS) return;
      const rising = index > slingTick;
      slingTick = index;
      slingTickAt = now;
      if (index <= 0) return;
      silenced = false;
      setBusGain(gameplayTransientBus, 1);
      const used = palette ?? paletteFromLanding(-0.58, 0);
      const when = now + .005;
      const hz = degreeToFrequency(used, slingTickDegree(index), MAX_TRANSIENT_HZ);
      noiseClick(when, rising ? .07 : .04, 0);
      blip(hz, when, .05, rising ? .08 : .05, "square", 0);
    },
    throwStart(power = 1) {
      silenced = false;
      slingTick = -1;
      setBusGain(gameplayTransientBus, 1);
      const used = palette ?? paletteFromLanding(-0.58, 0);
      const when = context.currentTime + .01;
      const strength = clamp01(power);
      // Punch first: low thump plus a noise smack, then the rip climbs off it.
      thump(when, launchThumpGain(strength), launchThumpStartHz(strength), LAUNCH_THUMP_END_HZ, .26 + strength * .12);
      noiseBody(when, .2 + strength * .14, 900 + strength * 600);
      const degrees = launchDegrees(strength);
      for (let index = 0; index < degrees.length; index++) {
        const hz = degreeToFrequency(used, degrees[index], MAX_TRANSIENT_HZ);
        blip(hz, when + index * .036, .09, .15 + strength * .07, "square", 0, { startRatio: 1.18 });
        blip(hz, when + index * .036, .075, .07, "triangle", 0);
      }
      whoosh(when, .2 + strength * .12, .08 + strength * .07, 520, 3200);
    },
    splash(skipIndex, glyph, panPosition) {
      if (!palette) return;
      silenced = false;
      setBusGain(gameplayTransientBus, 1);
      const when = context.currentTime + .005;
      const pan = Math.max(-.9, Math.min(.9, panPosition));
      const peak = splashPeakHz(palette, skipIndex, glyph);
      noiseClick(when, .2, pan);
      blip(peak, when, .11, .24, "square", pan, { startRatio: 1.38 });
      chordStab(when + .012, glyph, peak, pan);
    },
    milestone(event) {
      if (!palette) return;
      const when = context.currentTime + .01;
      const patch = GLYPH_PATCHES[((event.glyph % 7) + 7) % 7];
      const notes = event.kind === "bloom" ? 6 : 4;
      const volume = .1 + event.magnitude * .16;
      for (let index = 0; index < notes; index++) {
        const degree = patch.arp[index % patch.arp.length] + 5 + Math.floor(index / patch.arp.length);
        const hz = degreeToFrequency(palette, degree, MAX_TRANSIENT_HZ);
        blip(hz, when + index * .032, .09, volume * (.7 + index * .05), "square", 0, { startRatio: 1.08 });
      }
    },
    update(frame, resolving) {
      if (!palette) return;
      silenced = false;
      const now = context.currentTime;
      const groups = frame.groups.filter((group) => group.coverage > 0);
      const lead = groups.reduce((best, group) => group.activity >= best.activity ? group : best, groups[0]);
      if (lead) lastChordGlyph = lead.glyph;
      const patch = GLYPH_PATCHES[((lastChordGlyph % 7) + 7) % 7];
      const presence = lead ? lead.presence : 0;
      const growth = frame.growth;
      const gain = groups.length ? chordGain(presence, growth, resolving) : 0;
      const brightness = 1400 + (lead?.spread ?? 0) * 1800 + (lead?.density ?? 0) * 900 + frame.proximity * 700;
      chordFilter.frequency.setTargetAtTime(Math.min(4200, brightness), now, .08);
      for (let index = 0; index < chordVoices.length; index++) {
        const voice = chordVoices[index];
        const degree = patch.chord[index];
        if (degree === undefined || !groups.length) {
          voice.gain.gain.setTargetAtTime(0, now, .08);
          continue;
        }
        const hz = degreeToFrequency(palette, degree + Math.round((lead?.spread ?? 0) * 1.5));
        voice.oscillator.frequency.setTargetAtTime(hz, now, .06);
        const voiceGain = gain / Math.max(2, patch.chord.length) * (index === 0 ? 1.15 : .9);
        voice.gain.gain.setTargetAtTime(voiceGain, now, .07);
      }
      arpVoices.forEach((voice, index) => {
        const group = groups.find((candidate) => candidate.skip === index + 1);
        if (!group) {
          voice.gain.gain.setTargetAtTime(0, now, .06);
          voice.nextTime = 0;
          return;
        }
        const interval = arpIntervalSeconds(group.activity, frame.growth);
        if (voice.nextTime === 0) voice.nextTime = now;
        if (now + LOOKAHEAD >= voice.nextTime) {
          const when = Math.max(now + .005, voice.nextTime);
          scheduleArp(voice, group, when, resolving, frame.growth, frame.depthBand);
          voice.nextTime = when + interval;
        }
      });
      if (!groups.length) {
        bassGain.gain.setTargetAtTime(0, now, .18);
        bassFifthGain.gain.setTargetAtTime(0, now, .18);
      } else {
        const tonic = frame.depthBand > 10 ? -10 : -5;
        const rootHz = degreeToFrequency(palette, tonic, 250);
        const fifthHz = degreeToFrequency(palette, tonic + 3, 250);
        bassRoot.frequency.setTargetAtTime(rootHz, now, .45);
        bassFifth.frequency.setTargetAtTime(fifthHz, now, .5);
        const peak = (resolving ? .055 : .08) * (0.75 + frame.growth * .25);
        bassGain.gain.setTargetAtTime(peak, now, .22);
        bassFifthGain.gain.setTargetAtTime(peak * .55, now, .28);
      }
    },
    silence() {
      if (silenced) return;
      silenced = true;
      setBusGain(gameplayTransientBus, 0, .01);
      silenceVoices();
    },
    finish(scoreRatio) {
      const used = palette ?? paletteFromLanding(-0.58, 0);
      const plan = fanfarePlan(scoreRatio);
      const melody = fanfareMelodyDegrees(plan.tier);
      const when = context.currentTime + .02;
      const phraseBreak = plan.tier >= 2 ? 6 : 0;
      const finishId = ++finishGeneration;
      silenced = false;
      setBusGain(gameplayTransientBus, 0, .01);
      setBusGain(victoryBus, 1, .005);
      let fanfareEnd = when + plan.duration;
      for (let index = 0; index < melody.length; index++) {
        const gap = phraseBreak && index >= phraseBreak ? .1 : 0;
        const t = when + index * plan.stepSeconds + gap;
        const hz = degreeToFrequency(used, melody[index] + 5, MAX_TRANSIENT_HZ);
        const pan = (index / Math.max(1, melody.length - 1)) * 1.15 - .575;
        const length = .14 + plan.tier * .025 + (index === melody.length - 1 ? .08 : 0);
        blip(hz, t, length, .14 + plan.tier * .02, "square", pan, undefined, victoryBus);
        if (plan.tier >= 2) {
          blip(degreeToFrequency(used, melody[index] + 5, MAX_TRANSIENT_HZ), t, length, .05, "triangle", pan, undefined, victoryBus);
        }
      }
      if (plan.withFinalChord) {
        const chordWhen = when + melody.length * plan.stepSeconds + (phraseBreak ? .1 : 0) + .04;
        const hold = .5 + plan.tier * .28;
        fanfareEnd = Math.max(fanfareEnd, chordWhen + hold);
        for (const degree of fanfareChordDegrees(plan.tier)) {
          blip(degreeToFrequency(used, degree + 5, MAX_TRANSIENT_HZ), chordWhen, hold, .11, "triangle", 0, undefined, victoryBus);
          blip(degreeToFrequency(used, degree + 5, MAX_TRANSIENT_HZ), chordWhen, hold * .85, .06, "square", 0, undefined, victoryBus);
        }
      }
      // Once the jingle's tail has rung out, drop every sustained voice to
      // true zero so the result screen sits in silence.
      scheduleCleanup(context, fanfareEnd + .5, [], () => {
        if (finishId !== finishGeneration) return;
        silenced = true;
        setBusGain(victoryBus, 0, .04);
        silenceVoices();
      });
      return Math.max(0, fanfareEnd - context.currentTime);
    },
    reset() {
      finishGeneration += 1;
      palette = null;
      lastChordGlyph = 0;
      slingTick = -1;
      for (const voice of arpVoices) {
        voice.step = 0;
        voice.nextTime = 0;
      }
      silenced = true;
      setBusGain(gameplayTransientBus, 1);
      setBusGain(victoryBus, 0, .01);
      silenceVoices();
    },
  };
}
