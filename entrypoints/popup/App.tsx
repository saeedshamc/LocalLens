import { useEffect, useState } from 'react';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '../../components/Field';
import { t } from '../../lib/i18n';
import type { ContentResponse, ExtensionResponse } from '../../lib/messaging/types';
import { getSettings } from '../../lib/settings/storage';
import type { UiLanguage } from '../../lib/settings/types';
import {
  RESTRICTED_PAGE_MESSAGE,
  isRestrictedUrl,
} from '../../lib/utils/restricted';
import { isRtlLanguage } from '../../lib/utils/rtl';

export function PopupApp() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [pickerActive, setPickerActive] = useState(false);
  const [tabId, setTabId] = useState<number | null>(null);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    void (async () => {
      const settings = await getSettings();
      setUiLanguage(settings.uiLanguage);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setError(t(settings.uiLanguage, 'noActiveTab'));
        return;
      }
      setTabId(tab.id);
      if (isRestrictedUrl(tab.url)) {
        setRestricted(true);
        setError(RESTRICTED_PAGE_MESSAGE);
        return;
      }
      try {
        const res = (await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_STATUS',
        })) as ContentResponse;
        if (res.ok && res.kind === 'status') {
          setTranslated(res.translated);
          setPickerActive(Boolean(res.pickerActive));
        }
      } catch {
        // Content script may not be injected yet on this navigation.
      }
    })();
  }, []);

  const lang = uiLanguage;
  const dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';

  const sendToTab = async (
    type: 'TRANSLATE_PAGE' | 'RESTORE_PAGE',
    force = false,
  ) => {
    if (tabId === null) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
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
        }
        setError(res.error);
        return;
      }
      if (res.kind !== 'status') {
        setError('Unexpected response from the page.');
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
      setError(t(lang, 'reachPageError'));
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
        setError('error' in res ? res.error : 'Picker failed.');
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

      <div className="flex flex-col gap-2" role="group" aria-label={t(lang, 'popupTitle')}>
        <button
          type="button"
          className={buttonPrimaryClassName}
          disabled={busy || restricted}
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
