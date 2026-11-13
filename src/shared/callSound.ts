export const CALL_SOUNDS = [
  { id: 'sino', label: 'Sino' },
  { id: 'campainha', label: 'Campainha' },
  { id: 'digital', label: 'Digital' },
  { id: 'suave', label: 'Suave' },
] as const;

export type CallSoundId = (typeof CALL_SOUNDS)[number]['id'];

export function isCallSoundId(value: unknown): value is CallSoundId {
  return typeof value === 'string' && CALL_SOUNDS.some((sound) => sound.id === value);
}

const SAMPLE_RATE = 22050;

interface Tone {
  frequency: number;
  start: number;
  duration: number;
  gain: number;
  type?: 'sine' | 'square';
}

const PATTERNS: Record<CallSoundId, { tones: Tone[]; length: number }> = {
  sino: {
    length: 1,
    tones: [
      { frequency: 880, start: 0, duration: 0.95, gain: 0.7 },
      { frequency: 1320, start: 0, duration: 0.7, gain: 0.28 },
    ],
  },
  campainha: {
    length: 0.85,
    tones: [
      { frequency: 698, start: 0, duration: 0.32, gain: 0.65 },
      { frequency: 932, start: 0.34, duration: 0.46, gain: 0.7 },
    ],
  },
  digital: {
    length: 0.7,
    tones: [
      { frequency: 880, start: 0, duration: 0.1, gain: 0.45, type: 'square' },
      { frequency: 880, start: 0.18, duration: 0.1, gain: 0.45, type: 'square' },
      { frequency: 1174, start: 0.36, duration: 0.22, gain: 0.4, type: 'square' },
    ],
  },
  suave: {
    length: 1,
    tones: [
      { frequency: 523, start: 0, duration: 0.55, gain: 0.4 },
      { frequency: 659, start: 0.16, duration: 0.55, gain: 0.4 },
      { frequency: 784, start: 0.32, duration: 0.62, gain: 0.42 },
    ],
  },
};

export function callSoundDuration(id: CallSoundId): number {
  return (PATTERNS[id] ?? PATTERNS.sino).length;
}

const clips = new Map<CallSoundId, HTMLAudioElement>();

function renderWav(samples: Float32Array): string {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

function renderPattern(id: CallSoundId): Float32Array {
  const pattern = PATTERNS[id];
  const samples = new Float32Array(Math.ceil(pattern.length * SAMPLE_RATE));
  for (const tone of pattern.tones) {
    const from = Math.floor(tone.start * SAMPLE_RATE);
    const to = Math.min(samples.length, Math.floor((tone.start + tone.duration) * SAMPLE_RATE));
    for (let i = from; i < to; i += 1) {
      const time = (i - from) / SAMPLE_RATE;
      const attack = Math.min(1, time / 0.012);
      const decay = Math.exp((-2.4 * time) / tone.duration);
      const phase = (2 * Math.PI * tone.frequency * i) / SAMPLE_RATE;
      const wave = tone.type === 'square' ? (Math.sin(phase) >= 0 ? 1 : -1) : Math.sin(phase);
      samples[i] += wave * tone.gain * attack * decay;
    }
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.92) {
    const scale = 0.92 / peak;
    for (let i = 0; i < samples.length; i += 1) samples[i] *= scale;
  }
  return samples;
}

function clipFor(id: CallSoundId): HTMLAudioElement {
  const existing = clips.get(id);
  if (existing) return existing;
  const audio = new Audio(renderWav(renderPattern(id)));
  audio.preload = 'auto';
  clips.set(id, audio);
  return audio;
}

export function playCallSound(id: CallSoundId, volume: number): void {
  const audio = clipFor(id);
  audio.volume = Math.min(1, Math.max(0, volume));
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* the clip is still loading; play() starts at the beginning */
  }
  void audio.play().catch(() => undefined);
}

export function previewCallSound(id: CallSoundId, volume: number): void {
  playCallSound(id, volume);
}
