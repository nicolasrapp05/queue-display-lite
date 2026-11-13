import { useEffect, useRef, useState } from 'react';
import { createEmpty, readSnapshot, subscribe, writeSnapshot } from './state';
import type { PanelSnapshot } from './types';

export function useOperatorPanel(): PanelSnapshot | null {
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(() => readSnapshot());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const next = readSnapshot();
      if (next) setSnapshot(next);
    });

    if (!readSnapshot()) writeSnapshot(createEmpty());
    else setSnapshot(readSnapshot());

    return unsubscribe;
  }, []);

  return snapshot;
}

export function useTvPanel(onLive: (snapshot: PanelSnapshot) => void): PanelSnapshot | null {
  const onLiveRef = useRef(onLive);
  onLiveRef.current = onLive;
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(() => readSnapshot());

  useEffect(() => {
    const boot = readSnapshot();
    let seen = boot?.lastEvent?.id ?? null;
    setSnapshot(boot);

    return subscribe(() => {
      const next = readSnapshot();
      const eventId = next?.lastEvent?.id ?? null;
      const isNew = eventId !== null && eventId !== seen;
      seen = eventId;
      setSnapshot(next);
      if (isNew && next?.currentCall) onLiveRef.current(next);
    });
  }, []);

  return snapshot;
}
