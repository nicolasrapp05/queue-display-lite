import { useEffect, useRef } from 'react';
import { isGlobalShortcut, matchesKeyboardShortcut } from '../shared/shortcuts';

interface KeyboardShortcutsOptions {
  onRecallLast: () => void;
  onClearPanel: () => void;
  recallShortcut?: string;
  clearPanelShortcut?: string;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.dataset.shortcutInput === 'true') return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts({
  onRecallLast,
  onClearPanel,
  recallShortcut = 'F9',
  clearPanelShortcut = 'F8',
  enabled = true,
}: KeyboardShortcutsOptions) {
  const onRecallLastRef = useRef(onRecallLast);
  const onClearPanelRef = useRef(onClearPanel);
  onRecallLastRef.current = onRecallLast;
  onClearPanelRef.current = onClearPanel;

  useEffect(() => {
    if (!enabled) return;

    const tryShortcut = (event: KeyboardEvent, shortcut: string, action: () => void) => {
      if (!matchesKeyboardShortcut(event, shortcut)) return false;
      if (isEditableTarget(event.target) && !isGlobalShortcut(shortcut)) return false;
      event.preventDefault();
      action();
      return true;
    };

    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.shortcutInput === 'true') return;
      if (tryShortcut(event, recallShortcut, () => onRecallLastRef.current())) return;
      tryShortcut(event, clearPanelShortcut, () => onClearPanelRef.current());
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recallShortcut, clearPanelShortcut, enabled]);
}
