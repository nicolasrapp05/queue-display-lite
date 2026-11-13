import { useLayoutEffect, useRef } from 'react';

interface CurrentPasswordProps {
  password: string;
  animKey: number;
  subtitle: string;
  highlight: boolean;
}

export function CurrentPassword({ password, animKey, subtitle, highlight }: CurrentPasswordProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const block = blockRef.current;
    const number = numberRef.current;
    if (!block || !number || animKey === 0) return;

    block.classList.remove('tv-call-block--enter');
    number.classList.remove('animate-call-enter');
    void block.offsetWidth;
    block.classList.add('tv-call-block--enter');
    number.classList.add('animate-call-enter');
  }, [animKey, password]);

  useLayoutEffect(() => {
    const slot = numberRef.current?.parentElement;
    const number = numberRef.current;
    if (!slot || !number) return;

    const fit = () => {
      number.style.fontSize = '';
      const style = getComputedStyle(slot);
      const available =
        slot.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (available <= 0) return;
      const size = parseFloat(getComputedStyle(number).fontSize);
      if (!size || number.scrollWidth <= available) return;
      number.style.fontSize = `${Math.max(28, (size * available) / number.scrollWidth)}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [password]);

  return (
    <div className="tv-call-display">
      <div className={`tv-call-frame${highlight ? ' tv-call-frame--live' : ''}`}>
        <div ref={blockRef} className="tv-call-block">
          <p className="tv-call-label text-base lg:text-lg uppercase font-semibold">Senha chamada</p>
          <div className="tv-password-slot">
            <div ref={numberRef} data-testid="current-password" className="tv-call-number">
              {password}
            </div>
          </div>
        </div>
      </div>
      {subtitle.trim() && (
        <p className="tv-call-subtitle tv-text-muted text-lg lg:text-2xl font-normal text-center max-w-lg shrink-0">
          {subtitle}
        </p>
      )}
    </div>
  );
}
