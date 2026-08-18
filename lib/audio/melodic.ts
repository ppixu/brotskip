/**
 * The Melodic engine: a macro-controlled wavetable bed under a quantized
 * event layer. Each sacred glyph owns a signature instrument patch, orbit
 * groups run generative arpeggios, and coverage milestones trigger chord
 * swells so big early forms land as big musical moments.
 */
import {
  makeNoiseBuffer,
  scheduleCleanup,
  type EngineShell,
} from "./engine.ts";
import type { FeatureFrame, GlyphGroupFeatures, Milestone } from "./features.ts";
import {
  chordForBar,
  degreeToFrequency,
  GLYPH_DEGREE_OFFSET,
  snapToChord,
  type Palette,
} from "./theory.ts";

export type MelodicMacros = {
  brightness: number;
  warmth: number;
  motion: number;
  space: number;
  level: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function computeMacros(frame: FeatureFrame): MelodicMacros {
  const groups = frame.groups;
  const mean = (select: (group: GlyphGroupFeatures) => number) =>
    groups.length ? groups.reduce((sum, group) => sum + select(group), 0) / groups.length : 0;
  const spread = mean((group) => group.spread);
  const density = mean((group) => group.density);
  return {
    brightness: clamp01(spread * .8 + density * .4 + frame.proximity * .35),
    warmth: clamp01(1 - frame.chaos * .7),
    motion: clamp01(frame.chaos * .5 + frame.dispersion * .6),
    space: clamp01(spread * .5 + frame.glyphCount / 7 * .5),
    level: clamp01(.15 + frame.activeRatio * .45 + frame.growth * .4),
  };
}

/** Buckets a group's live mean orbit position into a scale degree. */
export function arpDegree(group: GlyphGroupFeatures, scaleLength: number): number {
  const angleUnit = group.zAngle / (Math.PI * 2) + .5;
  return Math.round(
    angleUnit * scaleLength * 2
    + group.zRadius * scaleLength
    + GLYPH_DEGREE_OFFSET[group.glyph % GLYPH_DEGREE_OFFSET.length],
  );
}

export function wavePartials(kind: "warm" | "glass"): { real: Float32Array; imag: Float32Array } {
  const count = 9;
  const real = new Float32Array(count);
  const imag = new Float32Array(count);
  for (let partial = 1; partial < count; partial++) {
    if (kind === "warm") {
      imag[partial] = 1 / partial ** 1.7;
    } else {
      imag[partial] = partial === 1 ? 1 : partial === 2 ? .38 : partial === 4 ? .22 : partial === 7 ? .1 : 0;
    }
  }
  return { real, imag };
}

export type MelodicEngine = {
  setPalette(palette: Palette): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  milestone(event: Milestone): void;
  update(frame: FeatureFrame, resolving: boolean): void;
  silence(): void;
  finish(scoreRatio: number): void;
  reset(): void;
};

const MAX_NOTES = 24;

export function createMelodicEngine(shell: EngineShell): MelodicEngine {
  const context = shell.context;
  const output = shell.submixFor("melodic");
  const noteBus = context.createGain();
  const noteSend = context.createGain();
  noteBus.connect(output);
  noteBus.connect(noteSend).connect(shell.reverbBus);
  noteSend.gain.value = .18;
  const noiseBuffer = makeNoiseBuffer(context);

  // ----- bed ------------------------------------------------------------
  const warmTable = wavePartials("warm");
  const glassTable = wavePartials("glass");
  const warmWave = context.createPeriodicWave(warmTable.real, warmTable.imag);
  const glassWave = context.createPeriodicWave(glassTable.real, glassTable.imag);
  const bedFilter = context.createBiquadFilter();
  bedFilter.type = "lowpass";
  bedFilter.frequency.value = 500;
  bedFilter.Q.value = .7;
  const bedGain = context.createGain();
  bedGain.gain.value = .0001;
  const bedSend = context.createGain();
  bedSend.gain.value = .0001;
  const lfo = context.createOscillator();
  lfo.frequency.value = .25;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(bedGain.gain);
  bedFilter.connect(bedGain).connect(output);
  bedGain.connect(bedSend).connect(shell.reverbBus);
  const bedVoices = [0, 2].map((degree) => {
    const warmOsc = context.createOscillator();
    const glassOsc = context.createOscillator();
    warmOsc.setPeriodicWave(warmWave);
    glassOsc.setPeriodicWave(glassWave);
    const warmGain = context.createGain();
    const glassGain = context.createGain();
    warmGain.gain.value = .5;
    glassGain.gain.value = .2;
    warmOsc.connect(warmGain).connect(bedFilter);
    glassOsc.connect(glassGain).connect(bedFilter);
    warmOsc.start();
    glassOsc.start();
    return { degree, warmOsc, glassOsc, warmGain, glassGain };
  });
  lfo.start();

  let palette: Palette | null = null;
  let lastFrame: FeatureFrame | null = null;
  let activeNotes = 0;
  const nextArpAt = new Map<number, number>();

  // ----- note plumbing ----------------------------------------------------
  function noiseSource(when: number, seconds: number): AudioBufferSourceNode {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = seconds > noiseBuffer.duration;
    source.start(when);
    source.stop(when + seconds);
    return source;
  }

  function envelope(when: number, attack: number, peak: number, decay: number): GainNode {
    const gain = context.createGain();
    const rise = Math.max(.003, attack);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), when + rise);
    gain.gain.exponentialRampToValueAtTime(.0001, when + rise + decay);
    return gain;
  }

  function notePanner(position: number): StereoPannerNode {
    const pan = context.createStereoPanner();
    pan.pan.value = Math.max(-.85, Math.min(.85, position));
    return pan;
  }

  /** One glyph note: builds an ephemeral patch graph and self-cleans. */
  function playNote(glyph: number, degree: number, velocity: number, when: number, position: number) {
    if (!palette || activeNotes >= MAX_NOTES) return;
    activeNotes += 1;
    const scaleLength = palette.steps.length;
    const frequency = degreeToFrequency(palette, degree);
    const pan = notePanner(position);
    pan.connect(noteBus);
    const cleanup: AudioNode[] = [pan];
    let tail = 2;
    switch (glyph % 7) {
      case 0: { // concentric halo — warm two-operator FM bell
        const carrier = context.createOscillator();
        const modulator = context.createOscillator();
        const modGain = context.createGain();
        carrier.frequency.value = frequency;
        modulator.frequency.value = frequency * 3.007;
        modGain.gain.setValueAtTime(frequency * 1.6 * velocity, when);
        modGain.gain.exponentialRampToValueAtTime(1, when + .55);
        modulator.connect(modGain).connect(carrier.frequency);
        const env = envelope(when, .004, velocity * .11, 1.3);
        carrier.connect(env).connect(pan);
        carrier.start(when);
        modulator.start(when);
        carrier.stop(when + 1.6);
        modulator.stop(when + 1.6);
        cleanup.push(carrier, modulator, modGain, env);
        tail = 1.8;
        break;
      }
      case 1: { // triangle mandala — Karplus-Strong pluck
        const burst = noiseSource(when, .02);
        const delay = context.createDelay(.05);
        delay.delayTime.value = 1 / Math.min(880, frequency);
        const loopFilter = context.createBiquadFilter();
        loopFilter.type = "lowpass";
        loopFilter.frequency.value = 3800;
        const feedback = context.createGain();
        feedback.gain.setValueAtTime(.93, when);
        feedback.gain.linearRampToValueAtTime(0, when + 1.2);
        const env = envelope(when, .003, velocity * .14, 1.0);
        burst.connect(delay);
        delay.connect(loopFilter).connect(feedback).connect(delay);
        delay.connect(env).connect(pan);
        cleanup.push(burst, delay, loopFilter, feedback, env);
        tail = 1.5;
        break;
      }
      case 2: { // vesica piscis — detuned supersaw pad
        const env = envelope(when, .22, velocity * .05, 1.5);
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, when);
        filter.frequency.exponentialRampToValueAtTime(320 + 1400 * velocity, when + .5);
        filter.frequency.exponentialRampToValueAtTime(360, when + 1.7);
        filter.connect(env).connect(pan);
        for (const cents of [-8, 0, 8]) {
          const osc = context.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.value = frequency;
          osc.detune.value = cents;
          osc.connect(filter);
          osc.start(when);
          osc.stop(when + 1.9);
          cleanup.push(osc);
        }
        cleanup.push(filter, env);
        tail = 2.1;
        break;
      }
      case 3: { // four-petal rose — glassy additive chime
        [1, 2.76, 5.40, 8.93].forEach((ratio, index) => {
          const partial = context.createOscillator();
          partial.frequency.value = Math.min(6000, frequency * ratio);
          const env = envelope(when + index * .008, .003, velocity * .07 / (index + 1), .5 + .6 / (index + 1));
          partial.connect(env).connect(pan);
          partial.start(when + index * .008);
          partial.stop(when + 1.4);
          cleanup.push(partial, env);
        });
        tail = 1.6;
        break;
      }
      case 4: { // pentagram — five-note rolling pluck
        [0, 2, 4, 5, 7].forEach((offset, index) => {
          const osc = context.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = degreeToFrequency(palette!, degree + offset);
          const env = envelope(when + index * .055, .004, velocity * .09, .38);
          osc.connect(env).connect(pan);
          osc.start(when + index * .055);
          osc.stop(when + index * .055 + .5);
          cleanup.push(osc, env);
        });
        tail = 1.0;
        break;
      }
      case 5: { // hexagram — formant-filtered square lead
        const osc = context.createOscillator();
        osc.type = "square";
        osc.frequency.value = frequency;
        const env = envelope(when, .035, velocity * .05, .6);
        for (const formant of [700, 1080]) {
          const band = context.createBiquadFilter();
          band.type = "bandpass";
          band.frequency.value = formant;
          band.Q.value = 8;
          osc.connect(band).connect(env);
          cleanup.push(band);
        }
        env.connect(pan);
        osc.start(when);
        osc.stop(when + .8);
        cleanup.push(osc, env);
        tail = 1.0;
        break;
      }
      default: { // flower of life — seven-partial shimmer
        const offsets = [0, scaleLength, scaleLength + 2, scaleLength + 4,
          2 * scaleLength, 2 * scaleLength + 2, 3 * scaleLength];
        offsets.forEach((offset, index) => {
          const osc = context.createOscillator();
          osc.frequency.value = degreeToFrequency(palette!, degree + offset);
          const env = envelope(when, .6 + index * .06, velocity * .02, 2.2);
          osc.connect(env).connect(pan);
          osc.start(when);
          osc.stop(when + 3.2);
          cleanup.push(osc, env);
        });
        tail = 3.4;
        break;
      }
    }
    scheduleCleanup(context, when + tail, cleanup, () => { activeNotes = Math.max(0, activeNotes - 1); });
  }

  // ----- generative arpeggios on the shared grid -------------------------
  // The tick registration lives as long as the shell; the facade disposes
  // the shell (and with it this tick) on destroy.
  shell.onTick((audioTime) => {
    if (!palette || !lastFrame) return;
    const chord = chordForBar(shell.barIndex());
    const scaleLength = palette.steps.length;
    for (const group of lastFrame.groups) {
      if (group.activity < .05 || group.coverage === 0) continue;
      if (audioTime < (nextArpAt.get(group.skip) || 0)) continue;
      const when = shell.nextEventTime(true);
      const octaveLift = Math.min(2, Math.floor(Math.log2(group.deepest + 1) / 7)) * scaleLength;
      const degree = snapToChord(arpDegree(group, scaleLength) + octaveLift, chord, scaleLength);
      playNote(group.glyph, degree, .18 + group.activity * .5, when, group.centroidX * .7);
      const interval = 1.5 - Math.min(1.28, group.activity * 1.35 + (lastFrame.growth || 0) * .3);
      nextArpAt.set(group.skip, when + interval);
    }
  });

  return {
    setPalette(next) {
      palette = next;
    },
    throwStart() {
      // Soft rising whoosh: filtered noise straight into the reverb.
      const when = context.currentTime + .005;
      const source = noiseSource(when, .35);
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 1.4;
      filter.frequency.setValueAtTime(300, when);
      filter.frequency.exponentialRampToValueAtTime(900, when + .3);
      const env = envelope(when, .12, .02, .25);
      source.connect(filter).connect(env).connect(shell.reverbBus);
      scheduleCleanup(context, when + .8, [source, filter, env]);
    },
    splash(skipIndex, glyph, panPosition) {
      if (!palette) return;
      const chord = chordForBar(shell.barIndex());
      const scaleLength = palette.steps.length;
      const when = shell.nextEventTime(true);
      playNote(glyph, snapToChord(2 + skipIndex, chord, scaleLength), .45 + Math.min(.3, skipIndex * .03), when, panPosition);
      const source = noiseSource(when, .18);
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 500 + skipIndex * 90;
      filter.Q.value = 1.2;
      const env = envelope(when, .004, .04, .16);
      const pan = notePanner(panPosition);
      source.connect(filter).connect(env).connect(pan).connect(noteBus);
      scheduleCleanup(context, when + .5, [source, filter, env, pan]);
    },
    milestone(event) {
      if (!palette) return;
      const chord = chordForBar(shell.barIndex());
      const scaleLength = palette.steps.length;
      const when = shell.nextEventTime(true);
      const rootDegree = snapToChord(GLYPH_DEGREE_OFFSET[event.glyph % GLYPH_DEGREE_OFFSET.length], chord, scaleLength);
      if (event.kind === "bloom") {
        // The glyph announces itself with its signature patch as it first blooms.
        playNote(event.glyph, rootDegree + scaleLength, .4 + event.magnitude * .5, when, 0);
      }
      // Harmonic glue: a quiet supersaw swell voices the current chord.
      chord.slice(0, 3).forEach((tone, index) => {
        playNote(2, tone + (index === 0 ? 0 : scaleLength), .16 + event.magnitude * .4, when, (index - 1) * .4);
      });
      if (event.magnitude > .45) {
        const boom = context.createOscillator();
        const env = envelope(when, .01, event.magnitude * .14, .7);
        boom.frequency.value = Math.max(32, degreeToFrequency(palette, rootDegree - scaleLength * 2, 200));
        boom.connect(env).connect(noteBus);
        boom.start(when);
        boom.stop(when + .9);
        scheduleCleanup(context, when + 1, [boom, env]);
      }
    },
    update(frame, resolving) {
      lastFrame = frame;
      if (!palette) return;
      const macros = computeMacros(frame);
      const at = context.currentTime;
      const scaleLength = palette.steps.length;
      for (const voice of bedVoices) {
        const frequency = degreeToFrequency(palette, voice.degree - scaleLength);
        voice.warmOsc.frequency.setTargetAtTime(frequency, at, .12);
        voice.glassOsc.frequency.setTargetAtTime(frequency, at, .12);
        voice.warmGain.gain.setTargetAtTime(.25 + macros.warmth * .45, at, .2);
        voice.glassGain.gain.setTargetAtTime(.12 + (1 - macros.warmth) * .4, at, .2);
      }
      bedFilter.frequency.setTargetAtTime(180 * 2 ** (macros.brightness * 3.6), at, .15);
      lfo.frequency.setTargetAtTime(.1 + macros.motion * 1.3, at, .3);
      const bedLevel = macros.level * .045 * (resolving ? .76 : 1);
      lfoGain.gain.setTargetAtTime(bedLevel * .3 * macros.motion, at, .25);
      bedGain.gain.setTargetAtTime(Math.max(.0001, bedLevel), at, .18);
      bedSend.gain.setTargetAtTime(macros.space * .3, at, .3);
    },
    silence() {
      lastFrame = null;
      bedGain.gain.setTargetAtTime(.0001, context.currentTime, .1);
      lfoGain.gain.setTargetAtTime(0, context.currentTime, .1);
    },
    finish(scoreRatio) {
      if (!palette) return;
      const chord = chordForBar(shell.barIndex());
      const scaleLength = palette.steps.length;
      [0, 1, 2].forEach((index) => {
        const when = shell.nextEventTime(true) + index * .12;
        const tone = chord[index % chord.length] + (index === 2 ? scaleLength : 0);
        playNote(0, tone, .3 + scoreRatio * .3, when, (index - 1) * .3);
      });
    },
    reset() {
      palette = null;
      lastFrame = null;
      nextArpAt.clear();
      bedGain.gain.setTargetAtTime(.0001, context.currentTime, .1);
      lfoGain.gain.setTargetAtTime(0, context.currentTime, .1);
    },
  };
}
