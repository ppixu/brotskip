/**
 * Loading-screen bed and Play-tap jingle. A faint pentatonic pad under the
 * intro, then a short Nintendo start phrase that fades the bed away.
 */
import { scheduleCleanup, type EngineShell } from "./engine.ts";
import { degreeToFrequency, MAX_TRANSIENT_HZ, paletteFromLanding } from "./theory.ts";

export const INTRO_AMBIENT_PEAK = 0.032;
export const INTRO_AMBIENT_FADE_IN_SECONDS = 2.4;
export const INTRO_AMBIENT_FADE_SECONDS = 1.4;

const INTRO_PALETTE = paletteFromLanding(-0.58, 0);

export function introAmbientDegrees(): readonly number[] {
  return [-5, 0, 2, 3, 7];
}

export function playJingleDegrees(): readonly number[] {
  return [0, 2, 3, 5, 7];
}

export function playJingleStepSeconds(): number {
  return 0.085;
}

export function playJingleDuration(): number {
  return playJingleDegrees().length * playJingleStepSeconds() + 0.22;
}

export type IntroAudio = {
  start(): void;
  play(): void;
  stop(): void;
};

type AmbientVoice = {
  oscillator: OscillatorNode;
  gain: GainNode;
};

export function createIntroAudio(shell: EngineShell): IntroAudio {
  const context = shell.context;
  const output = shell.output;
  const bus = context.createGain();
  const send = context.createGain();
  bus.gain.value = 0.0001;
  send.gain.value = 0.55;
  bus.connect(output);
  bus.connect(send).connect(shell.reverbBus);

  const voices: AmbientVoice[] = [];
  let started = false;
  let released = false;

  function chime(
    frequency: number,
    when: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    panPosition: number,
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    pan.pan.value = panPosition;
    oscillator.connect(gain).connect(pan).connect(output);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.04);
    scheduleCleanup(context, when + duration + 0.06, [oscillator, gain, pan]);
  }

  function fadeBus(target: number, seconds: number) {
    const now = context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), now + seconds);
  }

  function playJingle() {
    const melody = playJingleDegrees();
    const step = playJingleStepSeconds();
    const when = context.currentTime + 0.02;
    for (let index = 0; index < melody.length; index++) {
      const t = when + index * step;
      const hz = degreeToFrequency(INTRO_PALETTE, melody[index] + 5, MAX_TRANSIENT_HZ);
      const pan = (index / Math.max(1, melody.length - 1)) * 0.7 - 0.35;
      const hold = 0.16 + (index === melody.length - 1 ? 0.12 : 0);
      chime(hz, t, hold, 0.13, "square", pan);
      chime(hz, t, hold * 1.15, 0.06, "triangle", pan);
    }
    const chordWhen = when + (melody.length - 1) * step + 0.02;
    for (const degree of [0, 2, 3, 5]) {
      chime(degreeToFrequency(INTRO_PALETTE, degree + 5, MAX_TRANSIENT_HZ), chordWhen, 0.42, 0.07, "triangle", 0);
    }
  }

  return {
    start() {
      if (started || released) return;
      started = true;
      const now = context.currentTime;
      const mix = [0.28, 0.32, 0.18, 0.16, 0.06];
      introAmbientDegrees().forEach((degree, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 0 ? "triangle" : "sine";
        oscillator.frequency.value = degreeToFrequency(INTRO_PALETTE, degree, 900);
        oscillator.detune.value = index % 2 === 0 ? -6 : 7;
        gain.gain.value = mix[index] ?? 0.1;
        oscillator.connect(gain).connect(bus);
        oscillator.start(now);
        voices.push({ oscillator, gain });
      });
      fadeBus(INTRO_AMBIENT_PEAK, INTRO_AMBIENT_FADE_IN_SECONDS);
    },
    play() {
      if (released) return;
      released = true;
      fadeBus(0.0001, INTRO_AMBIENT_FADE_SECONDS);
      playJingle();
      const haltAt = context.currentTime + INTRO_AMBIENT_FADE_SECONDS + 0.08;
      for (const voice of voices) {
        try { voice.oscillator.stop(haltAt); } catch { /* already stopped */ }
      }
    },
    stop() {
      released = true;
      const now = context.currentTime;
      fadeBus(0.0001, 0.08);
      for (const voice of voices) {
        try { voice.oscillator.stop(now + 0.1); } catch { /* already stopped */ }
      }
      voices.length = 0;
    },
  };
}
