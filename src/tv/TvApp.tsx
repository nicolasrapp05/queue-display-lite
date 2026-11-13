import { useCallback, useEffect, useRef, useState } from 'react';
import { CurrentPassword } from './CurrentPassword';
import { RecentCallsStrip } from './RecentCallsStrip';
import { TvClock } from './TvClock';
import { defaultSettings, type PanelSnapshot } from '../shared/types';
import { useTvPanel } from '../shared/usePanelSnapshot';
import { VoiceAnnouncer } from '../shared/voice';

export function TvApp() {
  const announcerRef = useRef<VoiceAnnouncer | null>(null);
  if (!announcerRef.current) announcerRef.current = new VoiceAnnouncer(defaultSettings);

  const [animKey, setAnimKey] = useState(0);
  const [highlight, setHighlight] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const timerRef = useRef<number>();

  const onLive = useCallback((next: PanelSnapshot) => {
    const password = next.currentCall?.password;
    if (!password) return;
    setAnimKey((key) => key + 1);
    setHighlight(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setHighlight(false), next.settings.callDisplayDuration * 1000);
    announcerRef.current?.updateSettings(next.settings);
    announcerRef.current?.announce(password);
  }, []);

  const snapshot = useTvPanel(onLive);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (snapshot) announcerRef.current?.updateSettings(snapshot.settings);
  }, [snapshot]);

  useEffect(() => {
    const theme = snapshot?.settings.tvTheme ?? 'light';
    document.documentElement.dataset.tvTheme = theme;
    document.body.dataset.tvTheme = theme;
  }, [snapshot?.settings.tvTheme]);

  const activate = async () => {
    if (unlocking || audioUnlocked) return;
    setUnlocking(true);
    const ok = (await announcerRef.current?.unlock()) ?? false;
    if (ok) setAudioUnlocked(true);
    setUnlocking(false);
  };

  const theme = snapshot?.settings.tvTheme ?? 'light';
  const wantsVoice = Boolean(snapshot?.settings.voiceEnabled) && VoiceAnnouncer.isSupported();
  const wantsSound = snapshot?.settings.soundEnabled !== false;
  const showAudioGate = (wantsVoice || wantsSound) && !audioUnlocked;

  return (
    <div data-tv-theme={theme} className="tv-root relative h-screen overflow-hidden flex flex-col">
      {!snapshot ? (
        <div className="h-full grid place-items-center px-8 text-center" data-testid="tv-waiting-panel">
          <div>
            <p className="font-display text-4xl lg:text-5xl font-semibold">Aguardando o painel</p>
            <p className="tv-text-muted text-lg mt-4">Abra esta janela pelo botão Abrir na TV.</p>
          </div>
        </div>
      ) : (
        <>
          {showAudioGate && (
            <button
              type="button"
              data-testid="unlock-audio"
              className="tv-clickable absolute inset-0 z-50 flex items-center justify-center tv-overlay backdrop-blur-sm"
              onClick={() => void activate()}
            >
              <div className="text-center px-8 max-w-xl animate-fade-up">
                <span className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--tv-accent)]/30 bg-[var(--tv-accent)]/10">
                  <svg className="h-12 w-12 tv-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                </span>
                <h2 className="font-display text-3xl lg:text-4xl font-semibold mb-4">
                  Toque na tela para ativar o áudio
                </h2>
                <p className="tv-text-muted text-lg">
                  {unlocking
                    ? 'Ativando o áudio...'
                    : 'O navegador pede um clique nesta janela antes de tocar o som e anunciar as senhas.'}
                </p>
              </div>
            </button>
          )}

          <header className="tv-header shrink-0 flex items-center justify-between gap-6 px-6 lg:px-8 py-4 border-b">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] tv-accent opacity-90 mb-0.5 font-semibold">
                Painel de Senhas
              </p>
              <h1 className="tv-church-name text-xl lg:text-2xl font-semibold truncate" data-testid="tv-church-name">
                {snapshot.settings.churchName}
              </h1>
            </div>
            <TvClock />
          </header>

          <div className="flex flex-1 min-h-0 gap-4 lg:gap-5 p-4 lg:p-5">
            <section className="tv-panel flex-1 min-w-0 flex flex-col rounded-2xl border overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 w-full p-6 lg:p-8">
                {snapshot.currentCall ? (
                  <CurrentPassword
                    password={snapshot.currentCall.password}
                    animKey={animKey}
                    subtitle={snapshot.settings.tvSubtitleMessage}
                    highlight={highlight}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center" data-testid="tv-idle">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-dashed tv-waiting-ring mb-6">
                      <span className="text-3xl tv-text-subtle font-display">···</span>
                    </div>
                    <p className="font-display text-3xl lg:text-4xl tv-text-muted font-medium">
                      Aguardando próxima senha
                    </p>
                  </div>
                )}
              </div>
            </section>

            {snapshot.settings.tvShowRecentList && (
              <aside className="tv-recent-column tv-panel rounded-2xl border overflow-hidden">
                <h2 className="tv-recent-title">Últimas senhas</h2>
                <RecentCallsStrip calls={snapshot.recentCalls} />
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
