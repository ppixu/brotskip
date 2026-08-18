/**
 * Musical core shared by both sound engines. Every pitched voice in the
 * game funnels through degreeToFrequency, so all output stays inside one
 * consonant, landing-seeded palette.
 */

export type AudioScale = { name: string; steps: readonly number[] };

export const AUDIO_SCALES: readonly AudioScale[] = [
  { name: "major-pentatonic", steps: [0, 2, 4, 7, 9] },
  { name: "minor-pentatonic", steps: [0, 3, 5, 7, 10] },
  { name: "dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  { name: "lydian", steps: [0, 2, 4, 6, 7, 9, 11] },
  { name: "mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
];

export const MAX_SUSTAINED_HZ = 2500;

/** Base scale degree per sacred glyph, so each glyph sits on its own step. */
export const GLYPH_DEGREE_OFFSET: readonly number[] = [0, 2, 1, 3, 4, 5, 6];

export type Palette = {
  seed: number;
  scaleName: string;
  steps: readonly number[];
  rootMidi: number;
};

export function paletteFromLanding(cr: number, ci: number): Palette {
  const seed = Math.abs(Math.round((cr + 2.2) * 137 + (ci + 1.5) * 211));
  const scale = AUDIO_SCALES[seed % AUDIO_SCALES.length];
  return { seed, scaleName: scale.name, steps: scale.steps, rootMidi: 36 + (seed * 7) % 12 };
}

export function degreeToFrequency(palette: Palette, degree: number, maxHz = MAX_SUSTAINED_HZ): number {
  const rounded = Math.round(degree);
  const length = palette.steps.length;
  const wrapped = ((rounded % length) + length) % length;
  const octave = Math.floor(rounded / length);
  const midi = palette.rootMidi + palette.steps[wrapped] + octave * 12;
  return Math.min(maxHz, 440 * 2 ** ((midi - 69) / 12));
}

/** Chords as scale-degree stacks; the progression advances every two bars. */
export const CHORD_PROGRESSION: readonly (readonly number[])[] = [
  [0, 2, 4],
  [5, 7, 9],
  [3, 5, 7],
  [4, 6, 8],
];

export function chordForBar(barIndex: number): readonly number[] {
  const step = Math.floor(Math.max(0, barIndex) / 2) % CHORD_PROGRESSION.length;
  return CHORD_PROGRESSION[step];
}

/** Snap a degree to the nearest chord tone in any octave. */
export function snapToChord(degree: number, chord: readonly number[], scaleLength: number): number {
  const rounded = Math.round(degree);
  let best = rounded;
  let bestDistance = Infinity;
  for (const tone of chord) {
    for (let octave = -3; octave <= 4; octave++) {
      const candidate = tone + octave * scaleLength;
      const distance = Math.abs(candidate - rounded);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  return best;
}
