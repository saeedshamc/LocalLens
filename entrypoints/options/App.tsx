import { useEffect, useState } from 'react';
import {
  Field,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  inputClassName,
} from '../../components/Field';
import { ConnectionBanner } from '../../components/ConnectionBanner';
import { PageShell } from '../../components/PageShell';
import { t } from '../../lib/i18n';
import type { ExtensionResponse } from '../../lib/messaging/types';
import { testOllamaConnection } from '../../lib/ollama/connection';
import type { ConnectionResult } from '../../lib/ollama/types';
import {
  DEFAULT_SYSTEM_PROMPT_CHAT,
  DEFAULT_SYSTEM_PROMPT_TRANSLATE,
} from '../../lib/settings/defaults';
import { getSettings, saveSettings } from '../../lib/settings/storage';
import type { Settings, UiLanguage } from '../../lib/settings/types';
import {
  formatBytes,
  type CacheSizes,
} from '../../lib/storage/cache-admin';

const TARGET_LANGUAGE_OPTIONS = [
  { value: 'fa', label: 'Persian (fa)' },
  { value: 'en', label: 'English (en)' },
  { value: 'ar', label: 'Arabic (ar)' },
  { value: 'de', label: 'German (de)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'fr', label: 'French (fr)' },
  { value: 'tr', label: 'Turkish (tr)' },
  { value: 'zh', label: 'Chinese (zh)' },
];

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [connection, setConnection] = useState<ConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [cache, setCache] = useState<CacheSizes | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const refreshCache = async () => {
    const res = (await chrome.runtime.sendMessage({
      type: 'GET_CACHE_STATS',
    })) as ExtensionResponse;
    if (res.ok && 'cache' in res) setCache(res.cache);
  };

  useEffect(() => {
    let alive = true;
    void getSettings().then((s) => {
      if (alive) setSettings(s);
    });
    void chrome.runtime
      .sendMessage({ type: 'GET_CACHE_STATS' })
      .then((res: ExtensionResponse) => {
        if (alive && res.ok && 'cache' in res) setCache(res.cache);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!settings) {
    return (
      <div className="p-8 text-sm text-[var(--ll-muted)]" role="status">
        Loading…
      </div>
    );
  }

  const lang = settings.uiLanguage;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaveMessage(null);
  };

  const runTest = async () => {
    setTesting(true);
    setConnection(null);
    const result = await testOllamaConnection(settings.ollamaHost);
    setConnection(result);
    if (result.ok) setModels(result.models);
    setTesting(false);
  };

  const onSave = async () => {
    setSaving(true);
    const next = await saveSettings(settings);
    setSettings(next);
    setSaveMessage(t(lang, 'saved'));
    setSaving(false);
  };

  return (
    <PageShell
      uiLanguage={lang}
      title={t(lang, 'optionsTitle')}
      actions={
        <div className="flex flex-wrap gap-2">
          <a
            className={buttonSecondaryClassName}
            href={chrome.runtime.getURL('/help.html')}
            target="_blank"
            rel="noreferrer"
          >
            {t(lang, 'openHelp')}
          </a>
          <button
            type="button"
            className={buttonPrimaryClassName}
            disabled={saving}
            onClick={() => void onSave()}
          >
            {t(lang, 'save')}
          </button>
        </div>
      }
    >
      {saveMessage ? (
        <p className="m-0 text-sm text-[var(--ll-accent)]" role="status">
          {saveMessage}
        </p>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
        <h2 className="m-0 text-base font-semibold">{t(lang, 'sectionConnection')}</h2>
        <Field label={t(lang, 'ollamaHost')} htmlFor="ollamaHost">
          <input
            id="ollamaHost"
            className={inputClassName}
            value={settings.ollamaHost}
            onChange={(e) => update('ollamaHost', e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonSecondaryClassName}
            disabled={testing}
            onClick={() => void runTest()}
          >
            {t(lang, 'testConnection')}
          </button>
        </div>
        <ConnectionBanner result={connection} uiLanguage={lang} busy={testing} />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
        <h2 className="m-0 text-base font-semibold">{t(lang, 'sectionModels')}</h2>
        {models.length === 0 ? (
          <p className="m-0 text-sm text-[var(--ll-muted)]">{t(lang, 'noModels')}</p>
        ) : null}
        <ModelSelect
          id="translateModel"
          label={t(lang, 'translateModel')}
          value={settings.translateModel}
          models={models}
          placeholder={t(lang, 'selectModel')}
          onChange={(v) => update('translateModel', v)}
        />
        <ModelSelect
          id="chatModel"
          label={t(lang, 'chatModel')}
          value={settings.chatModel}
          models={models}
          placeholder={t(lang, 'selectModel')}
          onChange={(v) => update('chatModel', v)}
        />
        <ModelSelect
          id="embeddingModel"
          label={t(lang, 'embeddingModel')}
          value={settings.embeddingModel}
          models={models}
          placeholder={t(lang, 'selectModel')}
          onChange={(v) => update('embeddingModel', v)}
          allowCustom
        />
        <ModelSelect
          id="explainModel"
          label={t(lang, 'explainModel')}
          value={settings.explainModel}
          models={models}
          placeholder={t(lang, 'selectModel')}
          onChange={(v) => update('explainModel', v)}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
        <h2 className="m-0 text-base font-semibold">{t(lang, 'sectionTranslation')}</h2>
        <Field label={t(lang, 'targetLanguage')} htmlFor="targetLanguage">
          <select
            id="targetLanguage"
            className={inputClassName}
            value={settings.targetLanguage}
            onChange={(e) => update('targetLanguage', e.target.value)}
          >
            {TARGET_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t(lang, 'temperature')} htmlFor="temperature">
          <input
            id="temperature"
            className={inputClassName}
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) => update('temperature', Number(e.target.value))}
          />
        </Field>
        <Field label={t(lang, 'numCtx')} htmlFor="numCtx">
          <input
            id="numCtx"
            className={inputClassName}
            type="number"
            min={256}
            step={256}
            value={settings.numCtx}
            onChange={(e) => update('numCtx', Number(e.target.value))}
          />
        </Field>
        <Field label={t(lang, 'keepAlive')} htmlFor="keepAlive">
          <input
            id="keepAlive"
            className={inputClassName}
            value={settings.keepAlive}
            onChange={(e) => update('keepAlive', e.target.value)}
            placeholder="5m"
          />
        </Field>
        <Field label={t(lang, 'chatHistoryTurns')} htmlFor="chatHistoryTurns">
          <input
            id="chatHistoryTurns"
            className={inputClassName}
            type="number"
            min={0}
            max={20}
            value={settings.chatHistoryTurns}
            onChange={(e) => update('chatHistoryTurns', Number(e.target.value))}
          />
        </Field>
        <Field label={t(lang, 'translationMode')} htmlFor="translationMode">
          <select
            id="translationMode"
            className={inputClassName}
            value={settings.translationMode}
            onChange={(e) =>
              update(
                'translationMode',
                e.target.value === 'overlay' ? 'overlay' : 'replace',
              )
            }
          >
            <option value="replace">{t(lang, 'modeReplace')}</option>
            <option value="overlay">{t(lang, 'modeOverlay')}</option>
          </select>
        </Field>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
        <h2 className="m-0 text-base font-semibold">{t(lang, 'sectionPrompts')}</h2>
        <Field label={t(lang, 'systemPromptTranslate')} htmlFor="systemPromptTranslate">
          <textarea
            id="systemPromptTranslate"
            className={`${inputClassName} min-h-32 font-mono text-xs`}
            value={settings.systemPromptTranslate}
            onChange={(e) => update('systemPromptTranslate', e.target.value)}
          />
        </Field>
        <button
          type="button"
          className={buttonSecondaryClassName}
          onClick={() => update('systemPromptTranslate', DEFAULT_SYSTEM_PROMPT_TRANSLATE)}
        >
          {t(lang, 'reset')}
        </button>
        <Field label={t(lang, 'systemPromptChat')} htmlFor="systemPromptChat">
          <textarea
            id="systemPromptChat"
            className={`${inputClassName} min-h-32 font-mono text-xs`}
            value={settings.systemPromptChat}
            onChange={(e) => update('systemPromptChat', e.target.value)}
          />
        </Field>
        <button
          type="button"
          className={buttonSecondaryClassName}
          onClick={() => update('systemPromptChat', DEFAULT_SYSTEM_PROMPT_CHAT)}
        >
          {t(lang, 'reset')}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
        <h2 className="m-0 text-base font-semibold">{t(lang, 'sectionCache')}</h2>
        {cache ? (
          <div className="space-y-1 text-sm text-[var(--ll-muted)]">
            <p className="m-0">
              {t(lang, 'cacheTotal', { size: formatBytes(cache.totalBytes) })}
            </p>
            <p className="m-0">
              {t(lang, 'cacheTranslations', { count: cache.translationsCount })} —{' '}
              {formatBytes(cache.translationsBytes)}
            </p>
            <p className="m-0">
              {t(lang, 'cacheEmbeddings', { count: cache.embeddingsCount })} —{' '}
              {formatBytes(cache.embeddingsBytes)}
            </p>
            <p className="m-0">
              {t(lang, 'cacheChat', { count: cache.chatHistoryCount })} —{' '}
              {formatBytes(cache.chatHistoryBytes)}
            </p>
          </div>
        ) : (
          <p className="m-0 text-sm text-[var(--ll-muted)]">{t(lang, 'loading')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['translations', 'clearTranslations'],
              ['embeddings', 'clearEmbeddings'],
              ['chat', 'clearChatCache'],
              ['all', 'clearAllCaches'],
            ] as const
          ).map(([scope, labelKey]) => (
            <button
              key={scope}
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                if (!window.confirm(t(lang, 'confirmClear'))) return;
                void (async () => {
                  await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE', scope });
                  setCacheMessage(t(lang, 'cacheCleared'));
                  await refreshCache();
                })();
              }}
            >
              {t(lang, labelKey)}
            </button>
          ))}
        </div>
        {cacheMessage ? (
          <p className="m-0 text-sm text-[var(--ll-accent)]" role="status">
            {cacheMessage}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-4">
        <h2 className="m-0 text-base font-semibold">{t(lang, 'sectionUi')}</h2>
        <Field label={t(lang, 'uiLanguage')} htmlFor="uiLanguage">
          <select
            id="uiLanguage"
            className={inputClassName}
            value={settings.uiLanguage}
            onChange={(e) => update('uiLanguage', e.target.value as UiLanguage)}
          >
            <option value="en">English</option>
            <option value="fa">فارسی</option>
          </select>
        </Field>
        <p className="m-0 text-sm text-[var(--ll-muted)]">{t(lang, 'shortcutInfo')}</p>
        <p className="m-0 text-sm text-[var(--ll-muted)]">{t(lang, 'privacyNote')}</p>
      </section>
    </PageShell>
  );
}

function ModelSelect({
  id,
  label,
  value,
  models,
  placeholder,
  onChange,
  allowCustom,
}: {
  id: string;
  label: string;
  value: string;
  models: string[];
  placeholder: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
}) {
  const options = [...models];
  if (value && !options.includes(value)) options.unshift(value);

  return (
    <Field label={label} htmlFor={id}>
      {models.length > 0 || value ? (
        <select
          id={id}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowCustom ? 'bge-m3' : placeholder}
        />
      )}
    </Field>
  );
}
