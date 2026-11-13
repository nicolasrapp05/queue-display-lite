import { useEffect, useState, type ReactNode } from 'react';
import { clampInt, updateSettings } from '../shared/state';
import { formatShortcutLabel, shortcutFromEvent } from '../shared/shortcuts';
import { DEFAULT_VOICE_TEMPLATE, type Settings } from '../shared/types';
import { previewCallSound, CALL_SOUNDS } from '../shared/callSound';
import { previewVoice } from '../shared/voice';

interface SettingsPanelProps {
  settings: Settings;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function SettingsPanel({ settings }: SettingsPanelProps) {
  const [churchName, setChurchName] = useState(settings.churchName);
  const [subtitle, setSubtitle] = useState(settings.tvSubtitleMessage);
  const [template, setTemplate] = useState(settings.voiceMessageTemplate);
  const [recent, setRecent] = useState(String(settings.recentCallsLimit));
  const [duration, setDuration] = useState(String(settings.callDisplayDuration));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => setChurchName(settings.churchName), [settings.churchName]);
  useEffect(() => setSubtitle(settings.tvSubtitleMessage), [settings.tvSubtitleMessage]);
  useEffect(() => setTemplate(settings.voiceMessageTemplate), [settings.voiceMessageTemplate]);
  useEffect(() => setRecent(String(settings.recentCallsLimit)), [settings.recentCallsLimit]);
  useEffect(() => setDuration(String(settings.callDisplayDuration)), [settings.callDisplayDuration]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.lang.toLowerCase().startsWith('pt')),
      );
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const savedVoiceMissing =
    settings.voiceName && !voices.some((voice) => voice.name === settings.voiceName);

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="page-eyebrow">Sistema</p>
        <h2 className="page-title mt-1">Ajustes</h2>
      </header>

      <section className="section-card space-y-4">
        <h3 className="font-display text-lg font-semibold">Geral</h3>
        <Field label="Nome na TV">
          <input
            data-testid="settings-church-name"
            className={inputClass}
            value={churchName}
            maxLength={80}
            onChange={(event) => setChurchName(event.target.value)}
            onBlur={(event) => {
              const next = event.currentTarget.value.trim().slice(0, 80) || 'Igreja';
              setChurchName(next);
              if (next !== settings.churchName) updateSettings({ churchName: next });
            }}
          />
        </Field>
        <Field label="Subtítulo da senha" hint="Aparece embaixo do número na TV. Deixe vazio para ocultar.">
          <input
            className={inputClass}
            value={subtitle}
            maxLength={160}
            onChange={(event) => setSubtitle(event.target.value)}
            onBlur={(event) => {
              const next = event.currentTarget.value.slice(0, 160);
              setSubtitle(next);
              if (next !== settings.tvSubtitleMessage) updateSettings({ tvSubtitleMessage: next });
            }}
          />
        </Field>
        <Field label="Últimas senhas na TV" hint="De 1 a 15, na coluna da direita.">
          <input
            className={inputClass}
            inputMode="numeric"
            value={recent}
            onChange={(event) => setRecent(event.target.value)}
            onBlur={(event) => {
              const next = clampInt(event.currentTarget.value, settings.recentCallsLimit, 1, 15);
              setRecent(String(next));
              if (next !== settings.recentCallsLimit) updateSettings({ recentCallsLimit: next });
            }}
          />
        </Field>
        <Field label="Destaque da chamada (segundos)" hint="Por quanto tempo a senha recém-chamada fica brilhando.">
          <input
            className={inputClass}
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            onBlur={(event) => {
              const next = clampInt(event.currentTarget.value, settings.callDisplayDuration, 1, 60);
              setDuration(String(next));
              if (next !== settings.callDisplayDuration) updateSettings({ callDisplayDuration: next });
            }}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={settings.tvShowRecentList}
            onChange={(event) => updateSettings({ tvShowRecentList: event.target.checked })}
          />
          Mostrar últimas senhas na TV
        </label>
      </section>

      <section className="section-card space-y-4">
        <h3 className="font-display text-lg font-semibold">Aparência</h3>
        <ThemeChoice
          label="Balcão"
          value={settings.operatorTheme}
          onChange={(operatorTheme) => updateSettings({ operatorTheme })}
        />
        <ThemeChoice
          label="TV"
          value={settings.tvTheme}
          onChange={(tvTheme) => updateSettings({ tvTheme })}
        />
      </section>

      <section className="section-card space-y-4">
        <h3 className="font-display text-lg font-semibold">Atalhos</h3>
        <ShortcutField
          label="Rechamar última"
          value={settings.shortcutRecall}
          onChange={(shortcutRecall) => updateSettings({ shortcutRecall })}
        />
        <ShortcutField
          label="Limpar TV"
          value={settings.shortcutClearPanel}
          onChange={(shortcutClearPanel) => updateSettings({ shortcutClearPanel })}
        />
      </section>

      <section className="section-card space-y-4">
        <h3 className="font-display text-lg font-semibold">Som da chamada</h3>
        <p className="text-sm text-muted-foreground">
          Toca na TV antes da voz. O exemplo abaixo toca neste computador.
        </p>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={settings.soundEnabled}
            onChange={(event) => updateSettings({ soundEnabled: event.target.checked })}
          />
          Tocar som ao chamar
        </label>
        <Field label="Som">
          <select
            className={inputClass}
            value={settings.soundId}
            onChange={(event) => {
              const soundId = CALL_SOUNDS.find((sound) => sound.id === event.target.value)?.id;
              if (soundId) updateSettings({ soundId });
            }}
          >
            {CALL_SOUNDS.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Volume (${Math.round(settings.soundVolume * 100)}%)`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.soundVolume}
            onChange={(event) =>
              updateSettings({ soundVolume: Math.round(Number(event.target.value) * 100) / 100 })
            }
            className="w-full accent-primary"
          />
        </Field>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => previewCallSound(settings.soundId, settings.soundVolume)}
        >
          Ouvir exemplo
        </button>
      </section>

      <section className="section-card space-y-4">
        <h3 className="font-display text-lg font-semibold">Voz</h3>
        <p className="text-sm text-muted-foreground">
          A senha é falada na janela da TV. O exemplo abaixo toca neste computador para escolher a voz.
        </p>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={settings.voiceEnabled}
            onChange={(event) => updateSettings({ voiceEnabled: event.target.checked })}
          />
          Anunciar senha por voz
        </label>
        <Field label="Voz">
          <select
            className={inputClass}
            value={settings.voiceName}
            onChange={(event) => updateSettings({ voiceName: event.target.value })}
          >
            <option value="">Automática (português)</option>
            {savedVoiceMissing && <option value={settings.voiceName}>{settings.voiceName}</option>}
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Volume (${Math.round(settings.voiceVolume * 100)}%)`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.voiceVolume}
            onChange={(event) =>
              updateSettings({ voiceVolume: Math.round(Number(event.target.value) * 100) / 100 })
            }
            className="w-full accent-primary"
          />
        </Field>
        <Field label={`Velocidade (${settings.voiceRate.toFixed(1)})`}>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.voiceRate}
            onChange={(event) =>
              updateSettings({ voiceRate: Math.round(Number(event.target.value) * 10) / 10 })
            }
            className="w-full accent-primary"
          />
        </Field>
        <Field label="Mensagem" hint="Use {senha} para o número e {senha_extenso} para a fala.">
          <textarea
            className={`${inputClass} min-h-24`}
            value={template}
            maxLength={300}
            onChange={(event) => setTemplate(event.target.value)}
            onBlur={(event) => {
              const next = event.currentTarget.value.trim().slice(0, 300) || DEFAULT_VOICE_TEMPLATE;
              setTemplate(next);
              if (next !== settings.voiceMessageTemplate) updateSettings({ voiceMessageTemplate: next });
            }}
          />
        </Field>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => previewVoice({ ...settings, voiceMessageTemplate: template })}
        >
          Ouvir exemplo
        </button>
      </section>
    </div>
  );
}

function ThemeChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Settings['operatorTheme'];
  onChange: (theme: Settings['operatorTheme']) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex rounded-lg border border-border p-1">
        {(['light', 'dark'] as const).map((theme) => (
          <button
            key={theme}
            type="button"
            aria-pressed={value === theme}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              value === theme ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
            onClick={() => onChange(theme)}
          >
            {theme === 'light' ? 'Claro' : 'Escuro'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortcutField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (shortcut: string) => void;
}) {
  return (
    <Field label={label} hint="Clique no campo e pressione o atalho.">
      <input
        data-shortcut-input="true"
        readOnly
        className={inputClass}
        value={formatShortcutLabel(value)}
        onKeyDown={(event) => {
          event.preventDefault();
          const shortcut = shortcutFromEvent(event);
          if (shortcut) onChange(shortcut);
        }}
      />
    </Field>
  );
}
