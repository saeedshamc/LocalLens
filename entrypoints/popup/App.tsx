import { useEffect, useState } from 'react';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '../../components/Field';
import { ModelSelect } from '../../components/ModelSelect';
import { t } from '../../lib/i18n';
import type { ContentResponse, ExtensionResponse } from '../../lib/messaging/types';
import { getSettings, saveSettings } from '../../lib/settings/storage';
import type { Settings, UiLanguage } from '../../lib/settings/types';
import { ensureContentScript } from '../../lib/utils/ensure-content';
import {
  isRestrictedUrl,
  restrictedPageMessage,
} from '../../lib/utils/restricted';
import { isRtlLanguage } from '../../lib/utils/rtl';

export function PopupApp() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [translateModel, setTranslateModel] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [modelsBusy, setModelsBusy] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [pickerActive, setPickerActive] = useState(false);
  const [tabId, setTabId] = useState<number | null>(null);
  const [tabUrl, setTabUrl] = useState<string | undefined>(undefined);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    void (async () => {
      const settings = await getSettings();
      setUiLanguage(settings.uiLanguage);
      setTranslateModel(settings.translateModel);
      setChatModel(settings.chatModel);

      setModelsBusy(true);
      try {
        const conn = (await chrome.runtime.sendMessage({
          type: 'CONNECTION_TEST',
        })) as ExtensionResponse;
        if (conn.ok && 'connection' in conn && conn.connection.ok) {
          setModels(conn.connection.models);
        } else if (!settings.translateModel && !settings.chatModel) {
          setError(t(settings.uiLanguage, 'modelsLoadError'));
        }
      } catch {
        if (!settings.translateModel && !settings.chatModel) {
          setError(t(settings.uiLanguage, 'modelsLoadError'));
        }
      } finally {
        setModelsBusy(false);
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setError(t(settings.uiLanguage, 'noActiveTab'));
        return;
      }
      setTabId(tab.id);
      setTabUrl(tab.url);
      if (isRestrictedUrl(tab.url)) {
        setRestricted(true);
        setError(restrictedPageMessage(settings.uiLanguage));
        return;
      }
      const ready = await ensureContentScript(tab.id, tab.url);
      if (!ready.ok) return;
      try {
        const res = (await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_STATUS',
        })) as ContentResponse;
        if (res.ok && res.kind === 'status') {
          setTranslated(res.translated);
          setPickerActive(Boolean(res.pickerActive));
        }
      } catch {
        // Content script may still be starting.
      }
    })();
  }, []);

  const lang = uiLanguage;
  const dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';

  const persistModel = async (
    key: 'translateModel' | 'chatModel',
    value: string,
  ) => {
    if (key === 'translateModel') setTranslateModel(value);
    else setChatModel(value);
    setError(null);
    try {
      const current = await getSettings();
      const patch: Partial<Settings> = { [key]: value };
      // If the sibling slot is empty, fill it so Translate / Chat both work.
      if (key === 'translateModel' && !current.chatModel.trim() && value.trim()) {
        patch.chatModel = value;
      }
      if (key === 'chatModel' && !current.translateModel.trim() && value.trim()) {
        patch.translateModel = value;
      }
      const next: Settings = await saveSettings(patch);
      setTranslateModel(next.translateModel);
      setChatModel(next.chatModel);
      setStatus(t(lang, 'modelSaved'));
    } catch {
      setError(t(lang, 'modelsLoadError'));
    }
  };

  const sendToTab = async (
    type: 'TRANSLATE_PAGE' | 'RESTORE_PAGE',
    force = false,
  ) => {
    if (tabId === null) return;
    if (type === 'TRANSLATE_PAGE' && !translateModel.trim() && !chatModel.trim()) {
      setError(t(lang, 'selectModel'));
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const ready = await ensureContentScript(tabId, tabUrl);
      if (!ready.ok) {
        setError(
          t(
            lang,
            ready.kind === 'restricted' ? 'restrictedPage' : 'injectContentError',
          ),
        );
        return;
      }
      const res = (await chrome.tabs.sendMessage(tabId, {
        type,
        ...(type === 'TRANSLATE_PAGE' ? { force } : {}),
      })) as ContentResponse;
      if (!res.ok) {
        if (res.kind === 'sameLanguage' && type === 'TRANSLATE_PAGE' && !force) {
          const ok = window.confirm(t(lang, 'sameLanguageWarn'));
          if (ok) {
            setBusy(false);
            await sendToTab('TRANSLATE_PAGE', true);
            return;
          }
          // User cancelled — not an error.
          return;
        }
        setError(res.error);
        return;
      }
      if (res.kind !== 'status') {
        setError(t(lang, 'unexpectedPageResponse'));
        return;
      }
      setTranslated(res.translated);
      if (type === 'TRANSLATE_PAGE') {
        setStatus(
          t(lang, 'translateProgress', {
            done: res.nodeCount ?? 0,
            pending: '…',
          }),
        );
      } else {
        setStatus(t(lang, 'restoreOriginal'));
      }
    } catch {
      setError(t(lang, 'injectContentError'));
    } finally {
      setBusy(false);
    }
  };

  const togglePicker = async () => {
    if (tabId === null) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'TOGGLE_PICKER',
        tabId,
      })) as ExtensionResponse | ContentResponse;
      if (!res.ok) {
        setError('error' in res ? res.error : t(lang, 'pickerFailed'));
        return;
      }
      const active =
        res.ok && 'pickerActive' in res ? Boolean(res.pickerActive) : false;
      setPickerActive(active);
      setStatus(active ? t(lang, 'pickerOn') : t(lang, 'pickerOff'));
      window.close();
    } catch {
      setError(t(lang, 'reachPageError'));
    } finally {
      setBusy(false);
    }
  };

  const openSidePanel = async () => {
    if (tabId === null) return;
    try {
      await chrome.sidePanel.open({ tabId });
      window.close();
    } catch {
      setError(t(lang, 'reachPageError'));
    }
  };

  const noTranslateModel = !translateModel.trim() && !chatModel.trim();

  return (
    <div
      dir={dir}
      className="w-80 bg-[var(--ll-bg)] p-4 text-[var(--ll-ink)]"
      style={{
        background:
          'radial-gradient(ellipse 90% 60% at 0% 0%, #d8efe6 0%, transparent 55%), var(--ll-bg)',
      }}
      role="dialog"
      aria-label={t(lang, 'appName')}
    >
      <header className="mb-3">
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--ll-accent)]">
          {t(lang, 'appName')}
        </p>
        <h1 className="m-0 text-base font-semibold">{t(lang, 'popupTitle')}</h1>
      </header>

      <section
        className="mb-3 flex flex-col gap-2 rounded-md border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/70 p-2.5"
        aria-label={t(lang, 'popupModels')}
      >
        <p className="m-0 text-[11px] font-semibold text-[var(--ll-muted)]">
          {t(lang, 'popupModels')}
        </p>
        <ModelSelect
          id="popup-translate-model"
          label={t(lang, 'translateModel')}
          value={translateModel}
          models={models}
          placeholder={
            modelsBusy ? t(lang, 'loading') : t(lang, 'selectModel')
          }
          disabled={modelsBusy || busy}
          compact
          onChange={(v) => void persistModel('translateModel', v)}
        />
        <ModelSelect
          id="popup-chat-model"
          label={t(lang, 'chatModel')}
          value={chatModel}
          models={models}
          placeholder={
            modelsBusy ? t(lang, 'loading') : t(lang, 'selectModel')
          }
          disabled={modelsBusy || busy}
          compact
          onChange={(v) => void persistModel('chatModel', v)}
        />
      </section>

      <div className="flex flex-col gap-2" role="group" aria-label={t(lang, 'popupTitle')}>
        <button
          type="button"
          className={buttonPrimaryClassName}
          disabled={busy || restricted || noTranslateModel}
          aria-busy={busy}
          onClick={() => void sendToTab('TRANSLATE_PAGE')}
        >
          {busy ? t(lang, 'working') : t(lang, 'translatePage')}
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={busy || restricted || !translated}
          onClick={() => void sendToTab('RESTORE_PAGE')}
        >
          {t(lang, 'restoreOriginal')}
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={busy || restricted}
          aria-pressed={pickerActive}
          onClick={() => void togglePicker()}
        >
          {pickerActive ? t(lang, 'stopPicker') : t(lang, 'pickElement')}
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={restricted || tabId === null}
          onClick={() => void openSidePanel()}
        >
          {t(lang, 'openSidePanel')}
        </button>
        <p className="m-0 text-[11px] text-[var(--ll-muted)]">{t(lang, 'openChatHint')}</p>
        <a
          className={buttonSecondaryClassName}
          href={chrome.runtime.getURL('/options.html')}
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, 'optionsTitle')}
        </a>
        <a
          className={buttonSecondaryClassName}
          href={chrome.runtime.getURL('/help.html')}
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, 'openHelp')}
        </a>
      </div>

      <p className="mt-3 m-0 text-[11px] text-[var(--ll-muted)]">{t(lang, 'shortcutHint')}</p>

      {status ? (
        <p className="mt-2 m-0 text-xs text-[var(--ll-accent)]" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 m-0 text-xs text-[var(--ll-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
