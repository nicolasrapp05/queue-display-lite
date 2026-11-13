import type { Call } from '../shared/types';

interface RecentCallsStripProps {
  calls: Call[];
}

export function RecentCallsStrip({ calls }: RecentCallsStripProps) {
  if (calls.length === 0) {
    return (
      <div className="tv-recent-empty">
        <p>Nenhuma ainda</p>
      </div>
    );
  }

  return (
    <div className="tv-recent-list">
      {calls.map((call, index) => (
        <div
          key={call.id}
          className={`tv-recent-card${index === 0 ? ' tv-recent-card--active' : ''}`}
        >
          <span className="tv-recent-card__number" style={{ ['--len' as string]: call.password.length }}>
            {call.password}
          </span>
        </div>
      ))}
    </div>
  );
}
