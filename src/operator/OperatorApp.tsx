import { useCallback, useEffect, useRef, useState } from 'react';
import { CallList } from './CallList';
import { PasswordInput } from './PasswordInput';
import { SettingsPanel } from './SettingsPanel';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { formatShortcutLabel } from '../shared/shortcuts';
import { callPassword, clearPanel, recallCall, resetDay } from '../shared/state';
import { playCallSound } from '../shared/callSound';
import { useOperatorPanel } from '../shared/usePanelSnapshot';
import { openTvWindow, tvPageUrl } from '../shared/tvWindow';

const DESK_RECENT_LIMIT = 4;

type View = 'chamar' | 'historico' | 'ajustes';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export function OperatorApp() {
  const snapshot = useOperatorPanel();
  const [view, setView] = useState<View>('chamar');
  const [tvBlocked, setTvBlocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const toastTimer = useRef<number>();
  const tvUrl = tvPageUrl();

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!snapshot) return;
    document.documentElement.classList.toggle('dark', snapshot.settings.operatorTheme === 'dark');
  }, [snapshot]);

  const confirming = useRef(false);

  const ask = useCallback((request: Omit<ConfirmRequest, 'resolve'>) => {
    if (confirming.current) return Promise.resolve(false);
    confirming.current = true;
    return new Promise<boolean>((resolve) => {
      setConfirm({
        ...request,
        resolve: (ok) => {
          confirming.current = false;
          resolve(ok);
        },
      });
    });
  }, []);

  const answer = useCallback((ok: boolean) => {
    setConfirm((current) => {
      current?.resolve(ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!confirm) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      answer(event.key === 'Enter');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [confirm, answer]);

  const playCue = () => {
    if (!snapshot?.settings.soundEnabled || snapshot.settings.soundVolume <= 0) return;
    playCallSound(snapshot.settings.soundId, snapshot.settings.soundVolume);
  };

  const handleCall = (password: string) => {
    playCue();
    const result = callPassword(password);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    showToast(`Senha ${result.snapshot.currentCall?.password ?? password} chamada`);
  };

  const handleRecall = (callId: string) => {
    playCue();
    const next = recallCall(callId);
    if (!next?.currentCall) {
      showToast('Não foi possível rechamar');
      return;
    }
    showToast(`Senha ${next.currentCall.password} rechamada`);
  };

  const handleClear = useCallback(async () => {
    const ok = await ask({
      title: 'Limpar painel da TV',
      message: 'A senha atual será removida da TV. A lista do dia continua.',
      confirmLabel: 'Limpar painel',
      danger: true,
    });
    if (!ok) return;
    clearPanel();
    showToast('Painel da TV limpo');
  }, [ask, showToast]);

  const handleReset = async () => {
    const ok = await ask({
      title: 'Zerar o dia',
      message: 'Todas as senhas de hoje serão apagadas. Os ajustes continuam.',
      confirmLabel: 'Zerar o dia',
      danger: true,
    });
    if (!ok) return;
    resetDay();
    showToast('Dia zerado');
  };

  const handleOpenTv = () => {
    setTvBlocked(!openTvWindow());
  };

  useKeyboardShortcuts({
    onRecallLast: () => {
      const latest = snapshot?.dayCalls[0];
      if (latest) handleRecall(latest.id);
    },
    onClearPanel: () => {
      if (snapshot?.currentCall) void handleClear();
    },
    recallShortcut: snapshot?.settings.shortcutRecall,
    clearPanelShortcut: snapshot?.settings.shortcutClearPanel,
    enabled: Boolean(snapshot) && !confirm,
  });

  if (!snapshot) {
    return (
      <div className="h-screen grid place-items-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const recallLabel = formatShortcutLabel(snapshot.settings.shortcutRecall);
  const clearLabel = formatShortcutLabel(snapshot.settings.shortcutClearPanel);
  const onTv = snapshot.currentCall?.password;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col bg-brand-dark text-white">
        <div className="shrink-0 p-4 md:p-6 md:border-b border-white/10 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-brand-light/90 font-semibold truncate">
            {snapshot.settings.churchName}
          </p>
          <h1 className="font-display text-xl font-bold mt-1 tracking-tight">Painel de Senhas</h1>
        </div>

        <nav className="flex md:flex-col flex-1 gap-1 p-3 min-w-0">
          <NavButton active={view === 'chamar'} onClick={() => setView('chamar')}>
            Chamar senha
          </NavButton>
          <NavButton active={view === 'historico'} onClick={() => setView('historico')}>
            Histórico
          </NavButton>
          <NavButton active={view === 'ajustes'} onClick={() => setView('ajustes')}>
            Ajustes
          </NavButton>
          <div className="md:mt-auto pt-2">
            <button
              type="button"
              data-testid="open-tv"
              onClick={handleOpenTv}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-left hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Abrir na TV
            </button>
            {tvBlocked && (
              <a
                href={tvUrl}
                target="painel-senhas-tv"
                className="mt-2 block text-xs text-brand-light underline underline-offset-2"
              >
                O navegador bloqueou a janela. Abra a TV por este link.
              </a>
            )}
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-8">
          {view === 'chamar' ? (
            <div className="space-y-8">
              <header>
                <p className="page-eyebrow">Balcão</p>
                <h2 className="page-title mt-1">Chamar senha</h2>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="tv-status">
                  {onTv ? `Na TV: ${onTv}` : 'A TV está sem senha no momento'}
                </p>
              </header>

              <PasswordInput onSubmit={handleCall} />

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>
                  <kbd className="kbd-hint">Enter</kbd> chamar
                </span>
                <span className="text-border">·</span>
                <span>
                  <kbd className="kbd-hint">Esc</kbd> limpar
                </span>
                <span className="text-border">·</span>
                <span>
                  <kbd className="kbd-hint">{recallLabel}</kbd> rechamar
                </span>
                <span className="text-border">·</span>
                <span>
                  <kbd className="kbd-hint">{clearLabel}</kbd> limpar TV
                </span>
              </div>

              <section className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-40"
                  onClick={() => snapshot.dayCalls[0] && handleRecall(snapshot.dayCalls[0].id)}
                  disabled={!snapshot.dayCalls.length}
                >
                  Rechamar última
                </button>
                <button
                  type="button"
                  data-testid="clear-panel"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                  onClick={() => void handleClear()}
                  disabled={!snapshot.currentCall}
                >
                  Limpar painel da TV
                </button>
                <button
                  type="button"
                  data-testid="reset-day"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-40"
                  onClick={() => void handleReset()}
                  disabled={!snapshot.dayCalls.length}
                >
                  Zerar o dia
                </button>
              </section>

              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold">Últimas chamadas</h3>
                  {snapshot.dayCalls.length > DESK_RECENT_LIMIT && (
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => setView('historico')}
                    >
                      Ver histórico
                    </button>
                  )}
                </div>
                <CallList
                  calls={snapshot.dayCalls.slice(0, DESK_RECENT_LIMIT)}
                  currentId={snapshot.currentCall?.id}
                  onRecall={handleRecall}
                />
              </section>
            </div>
          ) : view === 'historico' ? (
            <div className="space-y-8">
              <header>
                <p className="page-eyebrow">Balcão</p>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="page-title mt-1">Histórico</h2>
                  {snapshot.dayCalls.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {snapshot.dayCalls.length} no dia
                    </span>
                  )}
                </div>
              </header>
              <CallList
                calls={snapshot.dayCalls}
                currentId={snapshot.currentCall?.id}
                onRecall={handleRecall}
                emptyHint="As senhas chamadas hoje aparecem aqui."
              />
            </div>
          ) : (
            <SettingsPanel settings={snapshot.settings} />
          )}
        </div>
      </main>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-ticket-lg"
          >
            <h3 id="confirm-title" className="font-display text-xl font-semibold">
              {confirm.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{confirm.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary"
                onClick={() => answer(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="confirm-action"
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  confirm.danger
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
                onClick={() => answer(true)}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium toast-success animate-fade-up"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
        active ? 'admin-nav-active' : 'admin-nav-idle'
      }`}
    >
      {children}
    </button>
  );
}
