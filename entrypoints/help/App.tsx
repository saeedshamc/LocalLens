import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  buttonSecondaryClassName,
  inputClassName,
} from '../../components/Field';
import { PageShell } from '../../components/PageShell';
import { t } from '../../lib/i18n';
import { buildOllamaOriginsCommand } from '../../lib/ollama/connection';
import { getSettings, onSettingsChanged } from '../../lib/settings/storage';
import type { UiLanguage } from '../../lib/settings/types';

type OsTab = 'windows' | 'linux' | 'macos';

function detectOs(): OsTab {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('linux')) return 'linux';
  return 'windows';
}

export function HelpApp() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [os, setOs] = useState<OsTab>(detectOs);
  const [copied, setCopied] = useState(false);
  const extensionId = chrome.runtime.id;

  useEffect(() => {
    void getSettings().then((s) => setUiLanguage(s.uiLanguage));
    return onSettingsChanged((s) => setUiLanguage(s.uiLanguage));
  }, []);

  const command = useMemo(
    () => buildOllamaOriginsCommand(extensionId, os),
    [extensionId, os],
  );

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const lang = uiLanguage;

  return (
    <PageShell
      uiLanguage={lang}
      title={t(lang, 'helpTitle')}
      actions={
        <a
          className={buttonSecondaryClassName}
          href={chrome.runtime.getURL('/options.html')}
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, 'optionsTitle')}
        </a>
      }
    >
      <HelpSection title={t(lang, 'helpInstallTitle')}>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-sm leading-relaxed text-[var(--ll-ink)]">
          <li>
            Download and install Ollama from{' '}
            <a
              className="text-[var(--ll-accent)] underline"
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
            >
              ollama.com/download
            </a>
            .
          </li>
          <li>Start Ollama so it listens on port 11434 by default.</li>
        </ol>
      </HelpSection>

      <HelpSection title={t(lang, 'helpPullTitle')}>
        <p className="m-0 text-sm leading-relaxed">
          Pull at least one chat/translate model and an embedding model:
        </p>
        <pre className={`${inputClassName} mt-2 overflow-x-auto font-mono text-xs`}>
          {`ollama pull llama3.2
ollama pull bge-m3`}
        </pre>
        <p className="m-0 mt-2 text-sm text-[var(--ll-muted)]">
          Any compatible model works; pick what fits your machine in Settings after a
          successful connection test.
        </p>
      </HelpSection>

      <HelpSection title={t(lang, 'helpOriginsTitle')}>
        <p className="m-0 text-sm leading-relaxed">
          Chrome extensions run on a <code>chrome-extension://</code> origin. Ollama
          blocks those requests with HTTP 403 unless <code>OLLAMA_ORIGINS</code> includes
          this extension.
        </p>
        <p className="m-0 mt-2 text-sm">
          <span className="font-medium">{t(lang, 'extensionId')}:</span>{' '}
          <code className="rounded bg-[var(--ll-bg)] px-1.5 py-0.5 text-xs">
            {extensionId}
          </code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="OS">
          {(
            [
              ['windows', 'osWindows'],
              ['linux', 'osLinux'],
              ['macos', 'osMacos'],
            ] as const
          ).map(([key, labelKey]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={os === key}
              className={
                os === key ? buttonSecondaryClassName + ' ring-2 ring-[var(--ll-accent)]' : buttonSecondaryClassName
              }
              onClick={() => setOs(key)}
            >
              {t(lang, labelKey)}
            </button>
          ))}
        </div>
        <pre className={`${inputClassName} mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs`}>
          {command}
        </pre>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={buttonSecondaryClassName} onClick={() => void copyCommand()}>
            {copied ? t(lang, 'copied') : t(lang, 'copy')}
          </button>
          <p className="m-0 text-sm text-[var(--ll-muted)]">{t(lang, 'restartHint')}</p>
        </div>
        {os === 'windows' ? (
          <p className="m-0 mt-2 text-sm text-[var(--ll-muted)]">
            On Windows, run <code>setx</code> in a new terminal, then quit Ollama from the
            tray and start it again (or sign out / reboot) so the new environment variable
            is picked up.
          </p>
        ) : null}
      </HelpSection>

      <HelpSection title={t(lang, 'helpFeaturesTitle')}>
        <ul className="m-0 list-disc space-y-2 ps-5 text-sm leading-relaxed">
          <li>Whole-page contextual translation (coming in the next releases).</li>
          <li>Inspect-style element picker: translate, explain, summarize, or ask in chat.</li>
          <li>Side panel chat grounded on the current page, with streamed answers.</li>
          <li>Everything stays on your machine via local Ollama — no cloud API keys.</li>
        </ul>
      </HelpSection>

      <HelpSection title={t(lang, 'helpShortcutsTitle')}>
        <p className="m-0 text-sm leading-relaxed">{t(lang, 'shortcutInfo')}</p>
        <p className="m-0 mt-2 text-sm text-[var(--ll-muted)]">
          Element-picker and translation shortcuts will appear here once those features
          ship.
        </p>
      </HelpSection>

      <HelpSection title={t(lang, 'helpTroubleshootTitle')}>
        <ul className="m-0 list-disc space-y-2 ps-5 text-sm leading-relaxed">
          <li>
            <strong>HTTP 403 / CORS:</strong> set <code>OLLAMA_ORIGINS</code> as above and
            restart Ollama.
          </li>
          <li>
            <strong>Ollama not running:</strong> start the Ollama app/service and re-test
            from Settings.
          </li>
          <li>
            <strong>Model missing:</strong> <code>ollama pull &lt;model&gt;</code> then
            refresh models with Test connection.
          </li>
          <li>
            <strong>Slow responses:</strong> try a smaller model, lower <code>num_ctx</code>,
            or ensure the GPU/CPU is not overloaded.
          </li>
        </ul>
      </HelpSection>

      <HelpSection title={t(lang, 'helpPrivacyTitle')}>
        <p className="m-0 text-sm leading-relaxed">{t(lang, 'privacyNote')}</p>
      </HelpSection>
    </PageShell>
  );
}

function HelpSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
      <h2 className="m-0 mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
