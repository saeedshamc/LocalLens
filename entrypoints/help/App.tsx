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
            {t(lang, 'helpInstallLi1Before')}{' '}
            <a
              className="text-[var(--ll-accent)] underline"
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
            >
              ollama.com/download
            </a>
            {t(lang, 'helpInstallLi1After')}
          </li>
          <li>{t(lang, 'helpInstallLi2')}</li>
        </ol>
      </HelpSection>

      <HelpSection title={t(lang, 'helpPullTitle')}>
        <p className="m-0 text-sm leading-relaxed">{t(lang, 'helpPullIntro')}</p>
        <pre className={`${inputClassName} mt-2 overflow-x-auto font-mono text-xs`}>
          {`ollama pull llama3.2
ollama pull bge-m3`}
        </pre>
        <p className="m-0 mt-2 text-sm text-[var(--ll-muted)]">{t(lang, 'helpPullHint')}</p>
      </HelpSection>

      <HelpSection title={t(lang, 'helpOriginsTitle')}>
        <p className="m-0 text-sm leading-relaxed">{t(lang, 'helpOriginsIntro')}</p>
        <p className="m-0 mt-2 text-sm">
          <span className="font-medium">{t(lang, 'extensionId')}:</span>{' '}
          <code className="rounded bg-[var(--ll-bg)] px-1.5 py-0.5 text-xs">
            {extensionId}
          </code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={t(lang, 'osTablist')}>
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
                os === key
                  ? buttonSecondaryClassName + ' ring-2 ring-[var(--ll-accent)]'
                  : buttonSecondaryClassName
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
          <button
            type="button"
            className={buttonSecondaryClassName}
            onClick={() => void copyCommand()}
          >
            {copied ? t(lang, 'copied') : t(lang, 'copy')}
          </button>
          <p className="m-0 text-sm text-[var(--ll-muted)]">{t(lang, 'restartHint')}</p>
        </div>
        {os === 'windows' ? (
          <p className="m-0 mt-2 text-sm text-[var(--ll-muted)]">{t(lang, 'helpWindowsHint')}</p>
        ) : null}
      </HelpSection>

      <HelpSection title={t(lang, 'helpFeaturesTitle')}>
        <ul className="m-0 list-disc space-y-2 ps-5 text-sm leading-relaxed">
          <li>{t(lang, 'helpFeature1')}</li>
          <li>{t(lang, 'helpFeature2')}</li>
          <li>{t(lang, 'helpFeature3')}</li>
          <li>{t(lang, 'helpFeature4')}</li>
        </ul>
      </HelpSection>

      <HelpSection title={t(lang, 'helpShortcutsTitle')}>
        <p className="m-0 text-sm leading-relaxed">{t(lang, 'shortcutInfo')}</p>
        <p className="m-0 mt-2 text-sm text-[var(--ll-muted)]">
          {t(lang, 'helpShortcutPicker')}
        </p>
      </HelpSection>

      <HelpSection title={t(lang, 'helpTroubleshootTitle')}>
        <ul className="m-0 list-disc space-y-2 ps-5 text-sm leading-relaxed">
          <li>{t(lang, 'helpTs403')}</li>
          <li>{t(lang, 'helpTsOffline')}</li>
          <li>{t(lang, 'helpTsModel')}</li>
          <li>{t(lang, 'helpTsSlow')}</li>
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
