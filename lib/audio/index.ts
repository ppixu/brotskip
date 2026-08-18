/**
 * GameAudio: the one audio object the game component talks to. Owns the
 * lazy AudioContext, the two engines, the feature tracker, the milestone
 * detector, and the per-round palette. Every method is no-throw — audio
 * is strictly optional and silently degrades.
 */
import { createEngineShell, UPDATE_INTERVAL_SECONDS, type EngineShell } from "./engine.ts";
import {
  createFeatureTracker,
  createMilestoneDetector,
  type OrbitFeatureInput,
} from "./features.ts";
import { createMelodicEngine, type MelodicEngine } from "./melodic.ts";
import { createResonantEngine, type ResonantEngine } from "./modal.ts";
import { paletteFromLanding, type Palette } from "./theory.ts";

export type GamePhase = "ready" | "aiming" | "flying" | "resolving" | "result";
export type SoundEngineMode = "melodic" | "resonant";
export type { OrbitFeatureInput } from "./features.ts";

export type GameAudio = {
  init(): void;
  setMode(mode: SoundEngineMode): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  throwStart(): void;
  splash(skipIndex: number, glyph: number, panPosition: number): void;
  update(orbits: readonly OrbitFeatureInput[], phase: GamePhase, nowMs: number): void;
  finish(scoreRatio: number): void;
  reset(): void;
  destroy(): void;
};

const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_SECONDS * 1000;

export function createGameAudio(initialMode: SoundEngineMode = "melodic"): GameAudio {
  let shell: EngineShell | null = null;
  let melodic: MelodicEngine | null = null;
  let resonant: ResonantEngine | null = null;
  let mode: SoundEngineMode = initialMode;
  let volume = .8;
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
    shell.setMode(mode, .001);
    shell.setVolume(volume);
    shell.setMuted(muted);
    return shell;
  }

  function activeEngine(): MelodicEngine | ResonantEngine | null {
    const current = shell;
    if (!current) return null;
    if (mode === "melodic") {
      if (!melodic) {
        melodic = createMelodicEngine(current);
        if (palette) melodic.setPalette(palette);
      }
      return melodic;
    }
    if (!resonant) {
      resonant = createResonantEngine(current);
      if (palette) resonant.setPalette(palette);
    }
    return resonant;
  }

  function establishPalette(cr: number, ci: number) {
    palette = paletteFromLanding(cr, ci);
    melodic?.setPalette(palette);
    resonant?.setPalette(palette);
    const engine = activeEngine();
    if (engine) {
      for (const queued of pendingSplashes) {
        engine.splash(queued.skipIndex, queued.glyph, queued.panPosition);
      }
    }
    pendingSplashes = [];
  }

  return {
    init() {
      try { ensureShell(); } catch { /* audio stays optional */ }
    },
    setMode(next) {
      try {
        const previous = mode;
        mode = next;
        shell?.setMode(next);
        if (previous !== next) {
          // Stop the outgoing engine's stale-frame arps before it goes quiet.
          const outgoing = previous === "melodic" ? melodic : resonant;
          outgoing?.silence();
        }
        activeEngine(); // build the target engine so it is ready mid-crossfade
      } catch { /* audio stays optional */ }
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
    throwStart() {
      try {
        ensureShell();
        // Frozen clock while suspended: scheduled nodes would pile up until
        // the first user gesture resumes the context, then burst all at once.
        if (!shell || shell.context.state !== "running") return;
        activeEngine()?.throwStart();
      } catch { /* audio stays optional */ }
    },
    splash(skipIndex, glyph, panPosition) {
      try {
        // Frozen clock while suspended: scheduled nodes would pile up until
        // the first user gesture resumes the context, then burst all at once.
        if (!shell || shell.context.state !== "running") return;
        const engine = activeEngine();
        if (!engine) return;
        if (!palette) {
          // The first splash can precede the first update; replay it once
          // the landing position has seeded the palette.
          pendingSplashes.push({ skipIndex, glyph, panPosition });
          return;
        }
        engine.splash(skipIndex, glyph, panPosition);
      } catch { /* audio stays optional */ }
    },
    update(orbits, phase, nowMs) {
      try {
        if (!shell) return; // no context until a user gesture called init()
        // Frozen clock while suspended: scheduled nodes would pile up until
        // the first user gesture resumes the context, then burst all at once.
        if (shell.context.state !== "running") return;
        const engine = activeEngine();
        if (!engine) return;
        const playing = (phase === "flying" || phase === "resolving") && orbits.length > 0;
        if (!playing) {
          engine.silence();
          return;
        }
        if (nowMs - lastUpdate < UPDATE_INTERVAL_MS) return;
        lastUpdate = nowMs;
        if (!palette) establishPalette(orbits[0].cr, orbits[0].ci);
        const frame = tracker.extract(orbits);
        for (const event of milestones.detect(frame.groups)) {
          engine.milestone(event);
        }
        engine.update(frame, phase === "resolving");
      } catch { /* audio stays optional */ }
    },
    finish(scoreRatio) {
      try {
        activeEngine()?.finish(Math.max(0, Math.min(1, scoreRatio)));
      } catch { /* audio stays optional */ }
    },
    reset() {
      try {
        palette = null;
        lastUpdate = 0;
        pendingSplashes = [];
        tracker.reset();
        milestones.reset();
        melodic?.reset();
        resonant?.reset();
      } catch { /* audio stays optional */ }
    },
    destroy() {
      try {
        melodic?.silence();
        resonant?.silence();
        shell?.dispose();
        void shell?.context.close().catch(() => { /* already closed */ });
        shell = null;
        melodic = null;
        resonant = null;
      } catch { /* audio stays optional */ }
    },
  };
}
