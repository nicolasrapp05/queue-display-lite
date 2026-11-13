const MODIFIER_ALIASES: Record<string, keyof Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>> = {
  control: 'ctrlKey',
  ctrl: 'ctrlKey',
  shift: 'shiftKey',
  alt: 'altKey',
  meta: 'metaKey',
  cmd: 'metaKey',
  command: 'metaKey',
};

export function formatShortcutLabel(shortcut: string): string {
  return shortcut.replace(/Control/gi, 'Ctrl').replace(/\+/g, ' + ');
}

export function isGlobalShortcut(shortcut: string): boolean {
  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) return true;

  const key = parts[0]?.toUpperCase() ?? '';
  return /^F\d{1,2}$/.test(key) || key === 'ESCAPE' || key === 'ESC';
}

export function matchesKeyboardShortcut(event: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut.trim()) return false;

  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return false;

  const keyPart = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  const expected = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };

  for (const modifier of modifiers) {
    const prop = MODIFIER_ALIASES[modifier.toLowerCase()];
    if (!prop) return false;
    expected[prop] = true;
  }

  if (
    event.ctrlKey !== expected.ctrlKey ||
    event.shiftKey !== expected.shiftKey ||
    event.altKey !== expected.altKey ||
    event.metaKey !== expected.metaKey
  ) {
    return false;
  }

  const normalize = (value: string) => {
    if (value.length === 1) return value.toUpperCase();
    if (value.toLowerCase() === 'space') return ' ';
    return value;
  };

  return normalize(event.key) === normalize(keyPart);
}

export function shortcutFromEvent(event: {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): string | null {
  const key = event.key;
  if (['Control', 'Shift', 'Alt', 'Meta', 'Escape', 'Tab', 'Enter'].includes(key)) return null;

  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');
  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join('+');
}
