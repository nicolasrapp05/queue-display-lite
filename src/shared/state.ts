import {
  CHANNEL_NAME,
  DAY_CALLS_LIMIT,
  STORAGE_KEY,
  defaultSettings,
  type Call,
  type LastEvent,
  type PanelSnapshot,
  type Settings,
  type ThemeName,
} from './types';
import { isCallSoundId } from './callSound';

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampFloat(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function asTheme(value: unknown, fallback: ThemeName): ThemeName {
  return value === 'dark' || value === 'light' ? value : fallback;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCall(value: unknown): Call | null {
  if (!value || typeof value !== 'object') return null;
  const call = value as Partial<Call>;
  if (typeof call.id !== 'string' || !call.id) return null;
  if (typeof call.password !== 'string') return null;
  const password = call.password.trim().slice(0, 20);
  if (!password) return null;
  const recallCount = clampInt(call.recallCount, 0, 0, 9999);
  const calledAt = typeof call.calledAt === 'string' && call.calledAt ? call.calledAt : new Date().toISOString();
  return { id: call.id, password, calledAt, recallCount };
}

function normalizeCalls(value: unknown): Call[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const calls: Call[] = [];
  for (const item of value) {
    const call = normalizeCall(item);
    if (!call || seen.has(call.id)) continue;
    seen.add(call.id);
    calls.push(call);
  }
  return calls.slice(0, DAY_CALLS_LIMIT);
}

function normalizeClearShortcut(value: unknown): string {
  if (typeof value !== 'string') return defaultSettings.shortcutClearPanel;
  const shortcut = value.trim().slice(0, 40);
  if (!shortcut || shortcut.toLowerCase() === 'control+shift+l') {
    return defaultSettings.shortcutClearPanel;
  }
  return shortcut;
}

function normalizeEvent(value: unknown): LastEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<LastEvent>;
  if (event.kind !== 'call' && event.kind !== 'recall') return null;
  if (typeof event.id !== 'string' || typeof event.callId !== 'string') return null;
  return {
    id: event.id,
    kind: event.kind,
    callId: event.callId,
    at: typeof event.at === 'string' ? event.at : new Date().toISOString(),
  };
}

export function normalizeSettings(value: unknown): Settings {
  const raw = value && typeof value === 'object' ? (value as Partial<Settings>) : {};
  const churchName = typeof raw.churchName === 'string' ? raw.churchName.slice(0, 80).trim() : '';
  const template = typeof raw.voiceMessageTemplate === 'string' ? raw.voiceMessageTemplate.slice(0, 300).trim() : '';
  const shortcutRecall = typeof raw.shortcutRecall === 'string' ? raw.shortcutRecall.trim().slice(0, 40) : '';
  const shortcutClear = normalizeClearShortcut(raw.shortcutClearPanel);

  return {
    churchName: churchName || defaultSettings.churchName,
    recentCallsLimit: clampInt(raw.recentCallsLimit, defaultSettings.recentCallsLimit, 1, 15),
    voiceEnabled: asBoolean(raw.voiceEnabled, defaultSettings.voiceEnabled),
    voiceVolume: clampFloat(raw.voiceVolume, defaultSettings.voiceVolume, 0, 1),
    voiceRate: clampFloat(raw.voiceRate, defaultSettings.voiceRate, 0.5, 2),
    voiceLang: typeof raw.voiceLang === 'string' && raw.voiceLang.trim() ? raw.voiceLang.slice(0, 20) : defaultSettings.voiceLang,
    voiceName: typeof raw.voiceName === 'string' ? raw.voiceName.slice(0, 120) : '',
    voiceMessageTemplate: template || defaultSettings.voiceMessageTemplate,
    soundEnabled: asBoolean(raw.soundEnabled, defaultSettings.soundEnabled),
    soundId: isCallSoundId(raw.soundId) ? raw.soundId : defaultSettings.soundId,
    soundVolume: clampFloat(raw.soundVolume, defaultSettings.soundVolume, 0, 1),
    callDisplayDuration: clampInt(raw.callDisplayDuration, defaultSettings.callDisplayDuration, 1, 60),
    shortcutRecall: shortcutRecall || defaultSettings.shortcutRecall,
    shortcutClearPanel: shortcutClear || defaultSettings.shortcutClearPanel,
    tvSubtitleMessage: typeof raw.tvSubtitleMessage === 'string'
      ? raw.tvSubtitleMessage.slice(0, 160)
      : defaultSettings.tvSubtitleMessage,
    tvShowRecentList: asBoolean(raw.tvShowRecentList, defaultSettings.tvShowRecentList),
    operatorTheme: asTheme(raw.operatorTheme, defaultSettings.operatorTheme),
    tvTheme: asTheme(raw.tvTheme, defaultSettings.tvTheme),
  };
}

export function normalizeSnapshot(value: unknown): PanelSnapshot {
  const source = value && typeof value === 'object' ? (value as Partial<PanelSnapshot>) : {};
  const settings = normalizeSettings(source.settings);
  const dayCalls = normalizeCalls(source.dayCalls);
  const current = normalizeCall(source.currentCall);
  const currentCall = current ? dayCalls.find((call) => call.id === current.id) ?? null : null;

  return {
    currentCall,
    dayCalls,
    recentCalls: dayCalls.slice(0, settings.recentCallsLimit),
    settings,
    lastEvent: normalizeEvent(source.lastEvent),
  };
}

export function createEmpty(): PanelSnapshot {
  return normalizeSnapshot({
    currentCall: null,
    recentCalls: [],
    dayCalls: [],
    settings: defaultSettings,
    lastEvent: null,
  });
}

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

function emit() {
  for (const listener of listeners) listener();
}

export function readSnapshot(): PanelSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSnapshot(snapshot: PanelSnapshot): PanelSnapshot {
  const normalized = normalizeSnapshot(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  getChannel()?.postMessage({ type: 'snapshot' });
  emit();
  return normalized;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  const bus = getChannel();
  const onMessage = () => listener();
  bus?.addEventListener('message', onMessage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    bus?.removeEventListener('message', onMessage);
  };
}

export function callPassword(raw: string): { ok: true; snapshot: PanelSnapshot } | { ok: false; error: string } {
  const password = raw.trim().slice(0, 20);
  if (!password) return { ok: false, error: 'Digite uma senha' };

  const current = readSnapshot() ?? createEmpty();
  const call: Call = {
    id: createId(),
    password,
    calledAt: new Date().toISOString(),
    recallCount: 0,
  };

  const snapshot = writeSnapshot({
    ...current,
    currentCall: call,
    dayCalls: [call, ...current.dayCalls].slice(0, DAY_CALLS_LIMIT),
    lastEvent: {
      id: createId(),
      kind: 'call',
      callId: call.id,
      at: new Date().toISOString(),
    },
  });

  return { ok: true, snapshot };
}

export function recallCall(callId: string): PanelSnapshot | null {
  const current = readSnapshot();
  if (!current) return null;
  const found = current.dayCalls.find((call) => call.id === callId);
  if (!found) return null;

  const updated: Call = { ...found, recallCount: found.recallCount + 1 };
  return writeSnapshot({
    ...current,
    currentCall: updated,
    dayCalls: current.dayCalls.map((call) => (call.id === callId ? updated : call)),
    lastEvent: {
      id: createId(),
      kind: 'recall',
      callId,
      at: new Date().toISOString(),
    },
  });
}

export function clearPanel(): PanelSnapshot {
  const current = readSnapshot() ?? createEmpty();
  return writeSnapshot({ ...current, currentCall: null });
}

export function resetDay(): PanelSnapshot {
  const current = readSnapshot() ?? createEmpty();
  return writeSnapshot({
    ...createEmpty(),
    settings: current.settings,
  });
}

export function updateSettings(patch: Partial<Settings>): PanelSnapshot {
  const current = readSnapshot() ?? createEmpty();
  return writeSnapshot({
    ...current,
    settings: { ...current.settings, ...patch },
  });
}
