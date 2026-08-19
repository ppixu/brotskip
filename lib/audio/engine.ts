/**
 * Shared audio infrastructure: one master bus with a high-pass (no bass mud),
 * punchy compressor, short bright reverb, and a lookahead scheduler.
 * Pure helpers live at the top so Node tests can import this module.
 */

export const DEFAULT_BPM = 144;
export const TICK_MS = 25;
export const REVERB_SECONDS = .45;
export const HIGHPASS_HZ = 220;
export const UPDATE_INTERVAL_SECONDS = .042;

export function softClipCurve(length = 1024, amount = 1.6): Float32Array<ArrayBuffer> {
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
  decayPower = 3.4,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const length = Math.max(1, Math.round(sampleRate * seconds));
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(length),
    new Float32Array(length),
  ];
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

export function nextGridTime(now: number, gridStart: number, bpm = DEFAULT_BPM, beatsPerStep = .25): number {
  const step = 60 / bpm * beatsPerStep;
  const elapsed = Math.max(0, now - gridStart);
  return gridStart + Math.ceil(elapsed / step + 1e-6) * step;
}

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
  output: GainNode;
  reverbBus: GainNode;
  gridStart: number;
  nextEventTime(): number;
  onTick(callback: (audioTime: number) => void): () => void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
};

export function createEngineShell(context: AudioContext): EngineShell {
  const output = context.createGain();
  const highpass = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const shaper = context.createWaveShaper();
  const masterGain = context.createGain();
  const reverbBus = context.createGain();
  const reverbWet = context.createGain();
  highpass.type = "highpass";
  highpass.frequency.value = HIGHPASS_HZ;
  highpass.Q.value = .7;
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = .003;
  compressor.release.value = .12;
  shaper.curve = softClipCurve();
  shaper.oversample = "2x";
  masterGain.gain.value = .72;
  reverbWet.gain.value = .22;
  try {
    const [left, right] = buildImpulseResponse(context.sampleRate);
    const impulse = context.createBuffer(2, left.length, context.sampleRate);
    impulse.copyToChannel(left, 0);
    impulse.copyToChannel(right, 1);
    const convolver = context.createConvolver();
    convolver.buffer = impulse;
    reverbBus.connect(convolver).connect(reverbWet).connect(highpass);
  } catch {
    reverbBus.connect(reverbWet).connect(highpass);
  }
  output.connect(highpass);
  highpass.connect(compressor).connect(shaper).connect(masterGain).connect(context.destination);

  const gridStart = context.currentTime;
  let volume = .9;
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
    output,
    reverbBus,
    gridStart,
    nextEventTime: () => Math.max(context.currentTime + .02, nextGridTime(context.currentTime + .02, gridStart)),
    onTick(callback) {
      tickCallbacks.add(callback);
      return () => tickCallbacks.delete(callback);
    },
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
