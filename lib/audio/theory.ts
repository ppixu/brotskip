/**
 * Musical core: every pitched voice is pentatonic and mid/high.
 * Roots live in the Nintendo melody register (E4–B4), never as a bass drone.
 */

export type AudioScale = { name: string; steps: readonly number[] };

export const AUDIO_SCALES: readonly AudioScale[] = [
  { name: "major-pentatonic", steps: [0, 2, 4, 7, 9] },
  { name: "minor-pentatonic", steps: [0, 3, 5, 7, 10] },
];

/** G3 — anything below this is the bland register the last engines fell into. */
export const MIN_HZ = 196;
/** C7, for held chord/arp tones. */
export const MAX_SUSTAINED_HZ = 2093;
/** C8, for skip transients. */
export const MAX_TRANSIENT_HZ = 4186;

export const ROOT_MIDI_MIN = 64;
export const ROOT_MIDI_MAX = 71;

export type Palette = {
  seed: number;
  scaleName: string;
  steps: readonly number[];
  rootMidi: number;
};

export function paletteFromLanding(cr: number, ci: number): Palette {
  const seed = Math.abs(Math.round((cr + 2.2) * 137 + (ci + 1.5) * 211));
  const scale = AUDIO_SCALES[seed % AUDIO_SCALES.length];
  return {
    seed,
    scaleName: scale.name,
    steps: scale.steps,
    rootMidi: ROOT_MIDI_MIN + seed % (ROOT_MIDI_MAX - ROOT_MIDI_MIN),
  };
}

export function degreeToFrequency(
  palette: Palette,
  degree: number,
  maxHz = MAX_SUSTAINED_HZ,
): number {
  const rounded = Math.round(degree);
  const length = palette.steps.length;
  const wrapped = ((rounded % length) + length) % length;
  const octave = Math.floor(rounded / length);
  const midi = palette.rootMidi + palette.steps[wrapped] + octave * 12;
  const hz = 440 * 2 ** ((midi - 69) / 12);
  return Math.min(maxHz, Math.max(MIN_HZ, hz));
}
