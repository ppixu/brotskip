/**
 * The Resonant engine: each sacred glyph is a physical body. Its geometry
 * picks the modal frequency ratios of a bandpass resonator bank; splashes
 * strike it, iterating orbits strum it with grain taps, and blooming forms
 * bow it into a singing-bowl swell.
 */
import {
  makeNoiseBuffer,
  scheduleCleanup,
  UPDATE_INTERVAL_SECONDS,
  type EngineShell,
} from "./engine.ts";
import type { FeatureFrame, Milestone } from "./features.ts";
import { degreeToFrequency, GLYPH_DEGREE_OFFSET, type Palette } from "./theory.ts";

/**
 * Mode frequency ratios per glyph. Circle modes follow drumhead Bessel
 * ratios; polygons use plate-like series; the vesica and rose split near-
 * degenerate pairs; the flower stacks detuned harmonic shells.
 */
export const MODAL_RATIOS: readonly (readonly number[])[] = [
  [1, 1.593, 2.135, 2.295, 2.917, 3.598],        // 0 concentric halo — circular drumhead
  [1, 1.732, 2.0, 2.646, 3.0, 3.606],            // 1 triangle mandala — triangular plate
  [1, 1.042, 1.593, 1.659, 2.135, 2.224],        // 2 vesica piscis — two coupled detuned circles
  [1, 1.583, 1.603, 2.283, 2.307, 2.917],        // 3 four-petal rose — split degenerate pairs
  [1, 1.512, 1.902, 2.288, 2.618, 3.077],        // 4 pentagram — pentagonal plate
  [1, 1.688, 1.732, 2.598, 2.646, 3.464],        // 5 hexagram — two overlaid triangles
  [1, 1.993, 2.007, 2.986, 3.0, 3.014, 3.982],   // 6 flower of life — hex lattice shells
];

export const MODE_Q = 26;

export type ResonantEngine = {
  setPalette(palette: Palette): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  milestone(event: Milestone): void;
  update(frame: FeatureFrame, resolving: boolean): void;
  silence(): void;
  finish(scoreRatio: number): void;
  reset(): void;
};

export function createResonantEngine(shell: EngineShell): ResonantEngine {
  const context = shell.context;
  const output = shell.submixFor("resonant");
  const noiseBuffer = makeNoiseBuffer(context);

  const banks = MODAL_RATIOS.map((ratios) => {
    const input = context.createGain();
    const bankOut = context.createGain();
    const pan = context.createStereoPanner();
    const send = context.createGain();
    bankOut.gain.value = .0001;
    send.gain.value = .12;
    const filters = ratios.map((ratio, index) => {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 220 * ratio;
      filter.Q.value = MODE_Q;
      const modeGain = context.createGain();
      modeGain.gain.value = 1 / (1 + index * .35);
      input.connect(filter).connect(modeGain).connect(bankOut);
      return filter;
    });
    bankOut.connect(pan).connect(output);
    pan.connect(send).connect(shell.reverbBus);
    // Bow chain: looped noise, gated by bowGain, bandpassed near the root.
    const bowSource = context.createBufferSource();
    bowSource.buffer = noiseBuffer;
    bowSource.loop = true;
    const bowFilter = context.createBiquadFilter();
    bowFilter.type = "bandpass";
    bowFilter.frequency.value = 220;
    bowFilter.Q.value = 2;
    const bowGain = context.createGain();
    bowGain.gain.value = .0001;
    bowSource.connect(bowFilter).connect(bowGain).connect(input);
    bowSource.start();
    return { input, bankOut, pan, send, filters, bowFilter, bowGain, root: 220, ratios };
  });

  function strike(glyph: number, velocity: number, when: number) {
    const bank = banks[glyph % banks.length];
    const burst = context.createBufferSource();
    burst.buffer = noiseBuffer;
    burst.start(when);
    burst.stop(when + .025);
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 300;
    const burstGain = context.createGain();
    burstGain.gain.setValueAtTime(velocity * .9, when);
    burstGain.gain.exponentialRampToValueAtTime(.0001, when + .05);
    burst.connect(highpass).connect(burstGain).connect(bank.input);
    // Mallet thump under the bank, straight to the submix.
    const thump = context.createOscillator();
    thump.frequency.setValueAtTime(130, when);
    thump.frequency.exponentialRampToValueAtTime(50, when + .2);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(.0001, when);
    thumpGain.gain.exponentialRampToValueAtTime(velocity * .2, when + .012);
    thumpGain.gain.exponentialRampToValueAtTime(.0001, when + .24);
    thump.connect(thumpGain).connect(output);
    thump.start(when);
    thump.stop(when + .3);
    scheduleCleanup(context, when + .6, [burst, highpass, burstGain, thump, thumpGain]);
  }

  function tap(glyph: number, velocity: number, when: number) {
    const bank = banks[glyph % banks.length];
    const blip = context.createBufferSource();
    blip.buffer = noiseBuffer;
    blip.start(when, Math.random() * .3);
    blip.stop(when + .006);
    const blipGain = context.createGain();
    blipGain.gain.value = velocity * .25;
    blip.connect(blipGain).connect(bank.input);
    scheduleCleanup(context, when + .3, [blip, blipGain]);
  }

  function bow(glyph: number, magnitude: number) {
    const bank = banks[glyph % banks.length];
    const at = context.currentTime;
    bank.bowGain.gain.cancelScheduledValues(at);
    bank.bowGain.gain.setValueAtTime(Math.max(.0001, bank.bowGain.gain.value), at);
    bank.bowGain.gain.linearRampToValueAtTime(magnitude * .2, at + .6);
    bank.bowGain.gain.setTargetAtTime(.0001, at + .9, .9);
  }

  return {
    setPalette(next) {
      const at = context.currentTime;
      banks.forEach((bank, glyph) => {
        const root = Math.max(110, Math.min(440,
          degreeToFrequency(next, GLYPH_DEGREE_OFFSET[glyph % GLYPH_DEGREE_OFFSET.length])));
        bank.root = root;
        bank.filters.forEach((filter, index) => {
          filter.frequency.setTargetAtTime(root * bank.ratios[index], at, .1);
        });
        bank.bowFilter.frequency.setTargetAtTime(root, at, .1);
      });
    },
    throwStart() {
      const when = context.currentTime + .005;
      const source = context.createBufferSource();
      source.buffer = noiseBuffer;
      source.start(when);
      source.stop(when + .3);
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(700, when);
      filter.frequency.exponentialRampToValueAtTime(250, when + .28);
      const gain = context.createGain();
      gain.gain.setValueAtTime(.02, when);
      gain.gain.exponentialRampToValueAtTime(.0001, when + .3);
      source.connect(filter).connect(gain).connect(shell.reverbBus);
      scheduleCleanup(context, when + .8, [source, filter, gain]);
    },
    splash(skipIndex, glyph, panPosition) {
      const bank = banks[glyph % banks.length];
      bank.pan.pan.setTargetAtTime(Math.max(-.85, Math.min(.85, panPosition)), context.currentTime, .05);
      strike(glyph, .45 + Math.min(.3, skipIndex * .02), shell.nextEventTime(false));
    },
    milestone(event) {
      bow(event.glyph, event.magnitude);
      if (event.kind === "bloom") strike(event.glyph, .3 + event.magnitude * .4, shell.nextEventTime(false));
    },
    update(frame, resolving) {
      const at = context.currentTime;
      const damp = resolving ? .76 : 1;
      const active = new Set(frame.groups.map((group) => group.glyph % banks.length));
      frame.groups.forEach((group) => {
        const bank = banks[group.glyph % banks.length];
        bank.bankOut.gain.setTargetAtTime((.0001 + group.presence * .12) * damp, at, .12);
        bank.pan.pan.setTargetAtTime(Math.max(-.85, Math.min(.85, group.centroidX * .7)), at, .15);
        bank.send.gain.setTargetAtTime(.06 + group.spread * .25, at, .2);
        // Iteration strums the body: expected taps this frame from activity.
        const expected = group.activity * 14 * UPDATE_INTERVAL_SECONDS;
        const taps = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
        for (let index = 0; index < taps; index++) {
          tap(group.glyph, .1 + group.activity * .3, shell.nextEventTime(false) + Math.random() * .03);
        }
      });
      banks.forEach((bank, glyph) => {
        if (!active.has(glyph)) bank.bankOut.gain.setTargetAtTime(.0001, at, .12);
      });
    },
    silence() {
      const at = context.currentTime;
      for (const bank of banks) {
        bank.bankOut.gain.setTargetAtTime(.0001, at, .15);
        bank.bowGain.gain.setTargetAtTime(.0001, at, .15);
      }
    },
    finish(scoreRatio) {
      banks.forEach((bank, glyph) => {
        if (bank.bankOut.gain.value > .001) {
          strike(glyph, .2 + scoreRatio * .3, shell.nextEventTime(false) + glyph * .07);
        }
      });
    },
    reset() {
      // Bank roots persist until the next setPalette; just quiet everything.
      const at = context.currentTime;
      for (const bank of banks) {
        bank.bankOut.gain.setTargetAtTime(.0001, at, .1);
        bank.bowGain.gain.setTargetAtTime(.0001, at, .1);
      }
    },
  };
}
