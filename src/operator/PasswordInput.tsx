import { useCallback, useEffect, useRef, useState } from 'react';

interface PasswordInputProps {
  onSubmit: (password: string) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function PasswordInput({ onSubmit }: PasswordInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const submit = useCallback(() => {
    const trimmed = (inputRef.current?.value ?? valueRef.current).trim().slice(0, 20);
    if (!trimmed) return;
    onSubmit(trimmed);
    valueRef.current = '';
    setValue('');
    focusInput();
  }, [onSubmit, focusInput]);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.shortcutInput === 'true') return;

      const inOurInput = target === inputRef.current;
      if (isEditableTarget(target) && !inOurInput) return;

      if (/^\d$/.test(event.key)) {
        if (!inOurInput) {
          event.preventDefault();
          focusInput();
          setValue((current) => {
          const next = current.length >= 20 ? current : current + event.key;
          valueRef.current = next;
          return next;
        });
        }
        return;
      }

      if (event.key === 'Backspace' && !inOurInput) {
        event.preventDefault();
        focusInput();
        setValue((current) => {
          const next = current.slice(0, -1);
          valueRef.current = next;
          return next;
        });
        return;
      }

      if (event.key === 'Enter') {
        if (inOurInput) return;
        event.preventDefault();
        submit();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [submit, focusInput]);

  return (
    <div className="ticket-surface">
      <div className="ticket-notch" />
      <div className="px-6 pt-4 pb-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-primary mb-4">
          Nova chamada
        </p>
        <input
          ref={inputRef}
          data-testid="password-input"
          value={value}
          onChange={(event) => {
            const next = event.target.value.slice(0, 20);
            valueRef.current = next;
            setValue(next);
          }}
          onKeyDown={(event) => {
            if (event.defaultPrevented) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
            if (event.key === 'Escape') {
              valueRef.current = '';
              setValue('');
              focusInput();
            }
          }}
          placeholder="000"
          autoComplete="off"
          inputMode="numeric"
          maxLength={20}
          className="w-full h-24 sm:h-28 text-center font-mono text-5xl sm:text-6xl font-semibold tracking-[0.2em] bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/40 focus:ring-0"
        />
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            data-testid="call-button"
            onClick={submit}
            disabled={!value.trim()}
            onMouseDown={(event) => event.preventDefault()}
            className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Chamar senha
          </button>
        </div>
      </div>
    </div>
  );
}
