import type { Call } from '../shared/types';
import { DISPLAY_TIMEZONE } from '../shared/types';

interface CallListProps {
  calls: Call[];
  currentId?: string;
  onRecall: (callId: string) => void;
  emptyTitle?: string;
  emptyHint?: string;
}

export function CallList({
  calls,
  currentId,
  onRecall,
  emptyTitle = 'Nenhuma senha chamada ainda',
  emptyHint = 'Digite um número acima para começar',
}: CallListProps) {
  if (!calls.length) {
    return (
      <div className="section-card text-center py-10">
        <p className="text-muted-foreground">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {calls.map((call, index) => {
        const onTv = call.id === currentId;
        return (
          <div
            key={call.id}
            className={`relative flex flex-col items-center p-4 rounded-xl border transition-shadow ${
              onTv ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border bg-card'
            }`}
          >
            {onTv && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Na TV
              </span>
            )}
            {!onTv && index === 0 && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-widest bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                Última
              </span>
            )}
            <span
              className={`font-display font-bold text-foreground text-center max-w-full px-1 leading-tight break-all ${
                call.password.length > 8 ? 'text-base' : call.password.length > 4 ? 'text-2xl' : 'text-3xl'
              }`}
            >
              {call.password}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground mt-1.5">
              {new Date(call.calledAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: DISPLAY_TIMEZONE,
              })}
            </span>
            {call.recallCount > 0 && (
              <span className="text-[10px] text-muted-foreground mt-1">
                rechamada {call.recallCount}x
              </span>
            )}
            <button
              type="button"
              className="mt-2 h-8 px-2 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              onClick={() => onRecall(call.id)}
              title="Rechamar esta senha"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
                <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
