import { DEFAULT_VOICE_TEMPLATE, type Settings } from './types';
import { callSoundDuration, type CallSoundId } from './callSound';
import { formatVoiceMessage } from './numberToWords';

function coerceBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
}

function coerceNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function waitForVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const timer = window.setTimeout(() => {
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    }, timeoutMs);

    const onChange = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        window.clearTimeout(timer);
        synth.removeEventListener('voiceschanged', onChange);
        resolve(voices);
      }
    };

    synth.addEventListener('voiceschanged', onChange);
    synth.getVoices();
  });
}

export class VoiceAnnouncer {
  private settings: Settings;
  private unlocked = false;
  private pending: string[] = [];
  private playToken = 0;
  private keepAliveTimer?: ReturnType<typeof setInterval>;
  private voicesCache: SpeechSynthesisVoice[] = [];

  constructor(settings: Settings) {
    this.settings = settings;
    if (VoiceAnnouncer.isSupported()) {
      void waitForVoices().then((voices) => {
        this.voicesCache = voices;
      });
    }
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  updateSettings(settings: Settings) {
    this.settings = settings;
  }

  async unlock(): Promise<boolean> {
    const wantsVoice = VoiceAnnouncer.isSupported() && coerceBoolean(this.settings.voiceEnabled, true);
    if (!wantsVoice) {
      this.unlocked = true;
      this.flushQueue();
      return true;
    }
    if (this.unlocked) return true;

    this.voicesCache = await waitForVoices();

    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume();

      const utterance = new SpeechSynthesisUtterance('Áudio ativado');
      utterance.lang = this.settings.voiceLang || 'pt-BR';
      utterance.volume = 0.01;
      utterance.rate = 1;

      const finish = (ok: boolean) => {
        this.unlocked = ok;
        if (ok) this.flushQueue();
        resolve(ok);
      };

      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(true);

      window.setTimeout(() => {
        synth.speak(utterance);
        synth.resume();
      }, 50);

      window.setTimeout(() => {
        if (!this.unlocked) finish(synth.speaking);
      }, 1500);
    });
  }

  announce(password: string) {
    const wantsVoice = VoiceAnnouncer.isSupported() && coerceBoolean(this.settings.voiceEnabled, true);
    const wantsSound = coerceBoolean(this.settings.soundEnabled, true);
    if (!wantsVoice && !wantsSound) return;

    if (!this.unlocked) {
      this.pending.push(password);
      return;
    }

    void this.play(password);
  }

  private flushQueue() {
    const queue = [...this.pending];
    this.pending = [];
    const last = queue[queue.length - 1];
    if (last) void this.play(last);
  }

  private async play(password: string) {
    const token = ++this.playToken;
    const volume = coerceNumber(this.settings.soundVolume, 1);
    if (coerceBoolean(this.settings.soundEnabled, true) && volume > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, callSoundDuration(this.soundId()) * 1000));
      if (token !== this.playToken) return;
    }
    if (VoiceAnnouncer.isSupported() && coerceBoolean(this.settings.voiceEnabled, true)) {
      await this.speak(password);
    }
  }

  private soundId(): CallSoundId {
    return this.settings.soundId || 'sino';
  }

  private resolveVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
    const lang = this.settings.voiceLang || 'pt-BR';

    if (this.settings.voiceName) {
      const named = voices.find((voice) => voice.name === this.settings.voiceName);
      if (named) return named;
    }

    return (
      voices.find((voice) => voice.lang === lang) ??
      voices.find((voice) => voice.lang.replace('_', '-').startsWith(lang.split('-')[0])) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('pt')) ??
      voices[0]
    );
  }

  private clearKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
  }

  private async speak(password: string) {
    const synth = window.speechSynthesis;
    const template = this.settings.voiceMessageTemplate?.trim() || DEFAULT_VOICE_TEMPLATE;
    const text = formatVoiceMessage(template, password).trim();
    if (!text) return;

    const voices = this.voicesCache.length ? this.voicesCache : await waitForVoices();
    this.voicesCache = voices;

    this.clearKeepAlive();
    synth.cancel();
    await new Promise((resolve) => setTimeout(resolve, 80));
    synth.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.settings.voiceLang || 'pt-BR';
    utterance.volume = coerceNumber(this.settings.voiceVolume, 1);
    utterance.rate = coerceNumber(this.settings.voiceRate, 1);

    const voice = this.resolveVoice(voices);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      this.clearKeepAlive();
      this.keepAliveTimer = setInterval(() => {
        if (synth.speaking && !synth.paused) {
          synth.pause();
          synth.resume();
        } else if (!synth.speaking) {
          this.clearKeepAlive();
        }
      }, 10000);
    };

    utterance.onend = () => this.clearKeepAlive();
    utterance.onerror = () => this.clearKeepAlive();

    synth.speak(utterance);
    synth.resume();

    window.setTimeout(() => {
      if (synth.paused) synth.resume();
    }, 200);
  }
}

export function previewVoice(settings: Settings, sample = '123') {
  if (!VoiceAnnouncer.isSupported()) return;
  const template = settings.voiceMessageTemplate.trim() || DEFAULT_VOICE_TEMPLATE;
  const utterance = new SpeechSynthesisUtterance(formatVoiceMessage(template, sample));
  utterance.lang = settings.voiceLang || 'pt-BR';
  utterance.volume = coerceNumber(settings.voiceVolume, 1);
  utterance.rate = coerceNumber(settings.voiceRate, 1);
  const voices = window.speechSynthesis.getVoices();
  if (settings.voiceName) {
    const voice = voices.find((item) => item.name === settings.voiceName);
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
