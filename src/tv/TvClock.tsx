import { memo, useEffect, useState } from 'react';
import { DISPLAY_TIMEZONE } from '../shared/types';

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TIMEZONE,
  });

  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIMEZONE,
  });

  return { dateStr, timeStr };
}

export const TvClock = memo(function TvClock() {
  const { dateStr, timeStr } = useClock();

  return (
    <div className="text-right shrink-0">
      <div className="capitalize tv-text-muted text-sm">{dateStr}</div>
      <div className="tv-clock text-3xl lg:text-4xl font-semibold">{timeStr}</div>
    </div>
  );
});
