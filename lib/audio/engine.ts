/**
 * Shared audio infrastructure: one master bus with soft clipping, a generated
 * impulse-response reverb, a lookahead scheduler, and the crossfade between
 * the two sound engines. Pure helpers live at the top so Node tests can
 * import this module without any browser globals.
 */

export type EngineMode = "melodic" | "resonant";

export const DEFAULT_BPM = 90;
export const TICK_MS = 25;
export const REVERB_SECONDS = 2.2;

export function softClipCurve(length = 1024, amount = 2.35): Float32Array {
  const curve = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const x = index / (length - 1) * 2 - 1;
    curve[index] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

export function buildImpulseResponse(
  sampleRate: number,
  seconds = REVERB_SECONDS,
  decayPower = 2.6,
): [Float32Array, Float32Array] {
  const length = Math.max(1, Math.round(sampleRate * seconds));
  const channels: [Float32Array, Float32Array] = [new Float32Array(length), new Float32Array(length)];
  let state = 0x2fca9d1;
  for (const data of channels) {
    for (let index = 0; index < length; index++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const noise = (state >>> 0) / 2147483648 - 1;
      data[index] = noise * (1 - index / length) ** decayPower;
    }
  }
  return channels;
}

export function nextGridTime(now: number, gridStart: number, bpm = DEFAULT_BPM, beatsPerStep = .5): number {
  const step = 60 / bpm * beatsPerStep;
  const elapsed = Math.max(0, now - gridStart);
  return gridStart + Math.ceil(elapsed / step + 1e-6) * step;
}

/** Shared xorshift noise buffer for splashes, plucks, mallets and bows. */
export function makeNoiseBuffer(context: BaseAudioContext, seconds = .5): AudioBuffer {
  const buffer = context.createBuffer(1, Math.max(1, Math.round(context.sampleRate * seconds)), context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x51f15e;
  for (let index = 0; index < data.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[index] = ((state >>> 0) / 2147483648 - 1) * .6;
  }
  return buffer;
}

/**
 * Disconnects ephemeral note graphs once they finish sounding. A silent
 * ConstantSource acts as the timer so cleanup follows the audio clock.
 */
export function scheduleCleanup(
  context: BaseAudioContext,
  when: number,
  nodes: AudioNode[],
  onDone?: () => void,
): void {
  const janitor = context.createConstantSource();
  janitor.onended = () => {
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    onDone?.();
  };
  janitor.start();
  janitor.stop(when);
}

export type EngineShell = {
  context: AudioContext;
  reverbBus: GainNode;
  gridStart: number;
  submixFor(mode: EngineMode): GainNode;
  nextEventTime(quantized: boolean): number;
  barIndex(): number;
  onTick(callback: (audioTime: number) => void): () => void;
  setMode(mode: EngineMode, fadeSeconds?: number): void;
  mode(): EngineMode;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
};

export function createEngineShell(context: AudioContext): EngineShell {
  const melodicMix = context.createGain();
  const resonantMix = context.createGain();
  const busIn = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const shaper = context.createWaveShaper();
  const masterGain = context.createGain();
  const reverbBus = context.createGain();
  const reverbWet = context.createGain();
  melodicMix.gain.value = 1;
  resonantMix.gain.value = .0001;
  compressor.threshold.value = -27;
  compressor.knee.value = 18;
  compressor.ratio.value = 5;
  shaper.curve = softClipCurve();
  shaper.oversample = "2x";
  masterGain.gain.value = .64;
  reverbWet.gain.value = .3;
  try {
    const [left, right] = buildImpulseResponse(context.sampleRate);
    const impulse = context.createBuffer(2, left.length, context.sampleRate);
    impulse.copyToChannel(left, 0);
    impulse.copyToChannel(right, 1);
    const convolver = context.createConvolver();
    convolver.buffer = impulse;
    reverbBus.connect(convolver).connect(reverbWet).connect(busIn);
  } catch {
    reverbBus.connect(reverbWet).connect(busIn); // dry fallback keeps sends audible
  }
  melodicMix.connect(busIn);
  resonantMix.connect(busIn);
  busIn.connect(compressor).connect(shaper).connect(masterGain).connect(context.destination);

  const gridStart = context.currentTime;
  let mode: EngineMode = "melodic";
  let volume = .8;
  let muted = false;
  const tickCallbacks = new Set<(audioTime: number) => void>();
  const interval = setInterval(() => {
    const now = context.currentTime;
    tickCallbacks.forEach((callback) => callback(now));
  }, TICK_MS);

  function applyMaster() {
    masterGain.gain.setTargetAtTime(
      muted ? .0001 : Math.max(.0001, volume * volume),
      context.currentTime, .05,
    );
  }

  return {
    context,
    reverbBus,
    gridStart,
    submixFor: (which) => which === "melodic" ? melodicMix : resonantMix,
    nextEventTime: (quantized) => quantized
      ? Math.max(context.currentTime + .02, nextGridTime(context.currentTime + .02, gridStart))
      : context.currentTime + .005,
    barIndex: () => Math.floor(Math.max(0, context.currentTime - gridStart) / (60 / DEFAULT_BPM * 4)),
    onTick(callback) {
      tickCallbacks.add(callback);
      return () => tickCallbacks.delete(callback);
    },
    setMode(next, fadeSeconds = .5) {
      mode = next;
      const tau = Math.max(.005, fadeSeconds / 3);
      melodicMix.gain.setTargetAtTime(next === "melodic" ? 1 : .0001, context.currentTime, tau);
      resonantMix.gain.setTargetAtTime(next === "resonant" ? 1 : .0001, context.currentTime, tau);
    },
    mode: () => mode,
    setVolume(next) {
      volume = Math.max(0, Math.min(1, next));
      applyMaster();
    },
    setMuted(next) {
      muted = next;
      applyMaster();
    },
    dispose() {
      clearInterval(interval);
      tickCallbacks.clear();
      try { masterGain.disconnect(); } catch { /* already gone */ }
    },
  };
}
