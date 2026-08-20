/**
 * GameAudio: the one audio object the game component talks to. Owns the
 * lazy AudioContext, the chiptune engine, the feature tracker, the milestone
 * detector, and the per-round palette. Every method is no-throw — audio
 * is strictly optional and silently degrades.
 */
import { createChiptuneEngine, type ChiptuneEngine } from "./chiptune.ts";
import { createEngineShell, UPDATE_INTERVAL_SECONDS, type EngineShell } from "./engine.ts";
import { createIntroAudio, type IntroAudio } from "./intro.ts";
import {
  createFeatureTracker,
  createMilestoneDetector,
  type OrbitFeatureInput,
} from "./features.ts";
import { paletteFromLanding, type Palette } from "./theory.ts";

export type GamePhase = "ready" | "aiming" | "flying" | "resolving" | "result";
export type { OrbitFeatureInput } from "./features.ts";
export { finishComplexity } from "./chiptune.ts";

export type GameAudio = {
  init(): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  ambientStart(): void;
  playStart(): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  update(orbits: readonly OrbitFeatureInput[], phase: GamePhase, nowMs: number): void;
  finish(scoreRatio: number): void;
  reset(): void;
  destroy(): void;
};

const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_SECONDS * 1000;

export function createGameAudio(): GameAudio {
  let shell: EngineShell | null = null;
  let engine: ChiptuneEngine | null = null;
  let intro: IntroAudio | null = null;
  let volume = .9;
  let muted = false;
  let palette: Palette | null = null;
  let lastUpdate = 0;
  let pendingSplashes: Array<{ skipIndex: number; glyph: number; panPosition: number }> = [];
  const tracker = createFeatureTracker();
  const milestones = createMilestoneDetector();

  function ensureShell(): EngineShell | null {
    if (shell) {
      if (shell.context.state === "suspended") void shell.context.resume();
      return shell;
    }
    if (typeof AudioContext === "undefined") return null;
    shell = createEngineShell(new AudioContext());
    shell.setVolume(volume);
    shell.setMuted(muted);
    return shell;
  }

  function ensureEngine(): ChiptuneEngine | null {
    const current = ensureShell();
    if (!current) return null;
    if (!engine) {
      engine = createChiptuneEngine(current);
      if (palette) engine.setPalette(palette);
    }
    return engine;
  }

  function ensureIntro(): IntroAudio | null {
    const current = ensureShell();
    if (!current) return null;
    if (!intro) intro = createIntroAudio(current);
    return intro;
  }

  function establishPalette(cr: number, ci: number) {
    palette = paletteFromLanding(cr, ci);
    const current = ensureEngine();
    current?.setPalette(palette);
    if (current) {
      for (const queued of pendingSplashes) {
        current.splash(queued.skipIndex, queued.glyph, queued.panPosition);
      }
    }
    pendingSplashes = [];
  }

  return {
    init() {
      try { ensureShell(); } catch { /* audio stays optional */ }
    },
    setVolume(next) {
      try {
        volume = next;
        shell?.setVolume(next);
      } catch { /* audio stays optional */ }
    },
    setMuted(next) {
      try {
        muted = next;
        shell?.setMuted(next);
      } catch { /* audio stays optional */ }
    },
    ambientStart() {
      try {
        ensureIntro()?.start();
      } catch { /* audio stays optional */ }
    },
    playStart() {
      try {
        ensureIntro()?.play();
      } catch { /* audio stays optional */ }
    },
    throwStart() {
      try {
        ensureEngine();
        if (!shell || shell.context.state !== "running") return;
        engine?.throwStart();
      } catch { /* audio stays optional */ }
    },
    splash(skipIndex, glyph, panPosition) {
      try {
        if (!shell || shell.context.state !== "running") return;
        const current = ensureEngine();
        if (!current) return;
        if (!palette) {
          pendingSplashes.push({ skipIndex, glyph, panPosition });
          return;
        }
        current.splash(skipIndex, glyph, panPosition);
      } catch { /* audio stays optional */ }
    },
    update(orbits, phase, nowMs) {
      try {
        if (!shell) return;
        if (shell.context.state !== "running") return;
        const current = ensureEngine();
        if (!current) return;
        const playing = (phase === "flying" || phase === "resolving") && orbits.length > 0;
        if (!playing) {
          current.silence();
          return;
        }
        if (nowMs - lastUpdate < UPDATE_INTERVAL_MS) return;
        lastUpdate = nowMs;
        if (!palette) establishPalette(orbits[0].cr, orbits[0].ci);
        const frame = tracker.extract(orbits);
        for (const event of milestones.detect(frame.groups)) {
          current.milestone(event);
        }
        current.update(frame, phase === "resolving");
      } catch { /* audio stays optional */ }
    },
    finish(scoreRatio) {
      try {
        engine?.finish(Math.max(0, Math.min(1, scoreRatio)));
      } catch { /* audio stays optional */ }
    },
    reset() {
      try {
        palette = null;
        lastUpdate = 0;
        pendingSplashes = [];
        tracker.reset();
        milestones.reset();
        engine?.reset();
      } catch { /* audio stays optional */ }
    },
    destroy() {
      try {
        intro?.stop();
        engine?.silence();
        shell?.dispose();
        void shell?.context.close().catch(() => { /* already closed */ });
        shell = null;
        engine = null;
        intro = null;
      } catch { /* audio stays optional */ }
    },
  };
}
