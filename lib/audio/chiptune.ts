/**
 * One Nintendo-bright engine: pentatonic chords while orbits grow, punchy
 * skip hits, and a unique patch per sacred glyph. No bass drone, no pads.
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
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  milestone(event: Milestone): void;
  update(frame: FeatureFrame, resolving: boolean): void;
  silence(): void;
  finish(scoreRatio: number): void;
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
    gain.gain.value = .0001;
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
    gain.gain.value = .0001;
    oscillator.connect(gain).connect(pan).connect(output);
    oscillator.start();
    return { oscillator, gain, pan, step: 0, nextTime: 0 };
  });

  let palette: Palette | null = null;
  let lastChordGlyph = 0;

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
    oscillator.connect(gain).connect(pan).connect(output);
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
    scheduleCleanup(context, when + duration + .04, [oscillator, gain, pan]);
  }

  const MIN_SAFE_HZ = 80;

  function noiseClick(when: number, volume: number, panPosition: number) {
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
    source.connect(filter).connect(gain).connect(pan).connect(output);
    source.start(when);
    source.stop(when + .03);
    scheduleCleanup(context, when + .05, [source, filter, gain, pan]);
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

  function scheduleArp(voice: ArpVoice, group: GlyphGroupFeatures, when: number, resolving: boolean, growth: number) {
    if (!palette) return;
    const patch = GLYPH_PATCHES[((group.glyph % 7) + 7) % 7];
    const pattern = patch.arp;
    const degree = pattern[voice.step % pattern.length] + 5 + Math.round(group.spread * 2);
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
    throwStart() {
      const used = palette ?? paletteFromLanding(-0.58, 0);
      const when = context.currentTime + .01;
      for (let index = 0; index < 3; index++) {
        const hz = degreeToFrequency(used, index * 2);
        blip(hz, when + index * .045, .09, .12, "square", 0, { startRatio: 1.12 });
      }
    },
    splash(skipIndex, glyph, panPosition) {
      if (!palette) return;
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
      const now = context.currentTime;
      const groups = frame.groups.filter((group) => group.coverage > 0);
      const lead = groups.reduce((best, group) => group.activity >= best.activity ? group : best, groups[0]);
      if (lead) lastChordGlyph = lead.glyph;
      const patch = GLYPH_PATCHES[((lastChordGlyph % 7) + 7) % 7];
      const presence = lead ? lead.presence : 0;
      const growth = frame.growth;
      const gain = groups.length ? chordGain(presence, growth, resolving) : .0001;
      const brightness = 1400 + (lead?.spread ?? 0) * 1800 + (lead?.density ?? 0) * 900 + frame.proximity * 700;
      chordFilter.frequency.setTargetAtTime(Math.min(4200, brightness), now, .08);
      for (let index = 0; index < chordVoices.length; index++) {
        const voice = chordVoices[index];
        const degree = patch.chord[index];
        if (degree === undefined || !groups.length) {
          voice.gain.gain.setTargetAtTime(.0001, now, .08);
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
          voice.gain.gain.setTargetAtTime(.0001, now, .06);
          voice.nextTime = 0;
          return;
        }
        const interval = arpIntervalSeconds(group.activity, frame.growth);
        if (voice.nextTime === 0) voice.nextTime = now;
        if (now + LOOKAHEAD >= voice.nextTime) {
          const when = Math.max(now + .005, voice.nextTime);
          scheduleArp(voice, group, when, resolving, frame.growth);
          voice.nextTime = when + interval;
        }
      });
    },
    silence() {
      const now = context.currentTime;
      for (const voice of chordVoices) voice.gain.gain.setTargetAtTime(.0001, now, .06);
      for (const voice of arpVoices) {
        voice.gain.gain.setTargetAtTime(.0001, now, .05);
        voice.nextTime = 0;
      }
    },
    finish(scoreRatio) {
      const used = palette ?? paletteFromLanding(-0.58, 0);
      const when = context.currentTime + .02;
      const steps = 3 + Math.round(clamp01(scoreRatio) * 4);
      for (let index = 0; index < steps; index++) {
        const hz = degreeToFrequency(used, 2 + index, MAX_TRANSIENT_HZ);
        blip(hz, when + index * .055, .14, .14, "square", (index / Math.max(1, steps - 1)) * 1.2 - .6, { startRatio: 1.15 });
      }
    },
    reset() {
      palette = null;
      lastChordGlyph = 0;
      for (const voice of arpVoices) {
        voice.step = 0;
        voice.nextTime = 0;
      }
      this.silence();
    },
  };
}
