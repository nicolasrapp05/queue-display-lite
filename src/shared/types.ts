import type { CallSoundId } from './callSound';

export const STORAGE_KEY = 'painel-senhas-lite';
export const CHANNEL_NAME = 'painel-senhas-lite';
export const DAY_CALLS_LIMIT = 100;
export const DISPLAY_TIMEZONE = 'America/Sao_Paulo';

export const DEFAULT_VOICE_TEMPLATE =
  'Atenção. Senha {senha_extenso}. Retirar seu pedido no balcão.';

export type ThemeName = 'light' | 'dark';

export interface Call {
  id: string;
  password: string;
  calledAt: string;
  recallCount: number;
}

export interface Settings {
  churchName: string;
  recentCallsLimit: number;
  voiceEnabled: boolean;
  voiceVolume: number;
  voiceRate: number;
  voiceLang: string;
  voiceName: string;
  voiceMessageTemplate: string;
  soundEnabled: boolean;
  soundId: CallSoundId;
  soundVolume: number;
  callDisplayDuration: number;
  shortcutRecall: string;
  shortcutClearPanel: string;
  tvSubtitleMessage: string;
  tvShowRecentList: boolean;
  operatorTheme: ThemeName;
  tvTheme: ThemeName;
}

export interface LastEvent {
  id: string;
  kind: 'call' | 'recall';
  callId: string;
  at: string;
}

export interface PanelSnapshot {
  currentCall: Call | null;
  recentCalls: Call[];
  dayCalls: Call[];
  settings: Settings;
  lastEvent: LastEvent | null;
}

export const defaultSettings: Settings = {
  churchName: 'Igreja',
  recentCallsLimit: 5,
  voiceEnabled: true,
  voiceVolume: 1,
  voiceRate: 1,
  voiceLang: 'pt-BR',
  voiceName: '',
  voiceMessageTemplate: DEFAULT_VOICE_TEMPLATE,
  soundEnabled: true,
  soundId: 'sino',
  soundVolume: 1,
  callDisplayDuration: 10,
  shortcutRecall: 'F9',
  shortcutClearPanel: 'F8',
  tvSubtitleMessage: 'Retire seu pedido no balcão',
  tvShowRecentList: true,
  operatorTheme: 'light',
  tvTheme: 'light',
};
