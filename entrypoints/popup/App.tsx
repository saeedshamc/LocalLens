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
        setError('No active tab.');
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

  const dir = isRtlLanguage(uiLanguage) ? 'rtl' : 'ltr';

  const sendToTab = async (type: 'TRANSLATE_PAGE' | 'RESTORE_PAGE') => {
    if (tabId === null) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = (await chrome.tabs.sendMessage(tabId, { type })) as ContentResponse;
      if (!res.ok) {
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
          `Translated ${res.nodeCount ?? 0} text nodes` +
            (res.fromCache !== undefined
              ? ` (cache ${res.fromCache}, model ${res.fromModel ?? 0}).`
              : '.'),
        );
      } else {
        setStatus('Original text restored.');
      }
    } catch {
      setError(
        'Could not reach the page. Reload the tab, then try again. LocalLens cannot run on restricted browser pages.',
      );
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
      setStatus(active ? 'Element picker on — click an element (Esc to cancel).' : 'Element picker off.');
      window.close();
    } catch {
      setError('Could not toggle the element picker.');
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
      setError('Could not open the side panel.');
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
    >
      <header className="mb-3">
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--ll-accent)]">
          LocalLens
        </p>
        <h1 className="m-0 text-base font-semibold">Page tools</h1>
      </header>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={buttonPrimaryClassName}
          disabled={busy || restricted}
          onClick={() => void sendToTab('TRANSLATE_PAGE')}
        >
          {busy ? 'Working…' : 'Translate page'}
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={busy || restricted || !translated}
          onClick={() => void sendToTab('RESTORE_PAGE')}
        >
          Restore original
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={busy || restricted}
          onClick={() => void togglePicker()}
        >
          {pickerActive ? 'Stop element picker' : 'Pick element'}
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={restricted || tabId === null}
          onClick={() => void openSidePanel()}
        >
          Open side panel
        </button>
        <a
          className={buttonSecondaryClassName}
          href={chrome.runtime.getURL('/options.html')}
          target="_blank"
          rel="noreferrer"
        >
          {t(uiLanguage, 'optionsTitle')}
        </a>
        <a
          className={buttonSecondaryClassName}
          href={chrome.runtime.getURL('/help.html')}
          target="_blank"
          rel="noreferrer"
        >
          {t(uiLanguage, 'openHelp')}
        </a>
      </div>

      <p className="mt-3 m-0 text-[11px] text-[var(--ll-muted)]">
        Shortcut: Alt+Shift+L · Right-click → LocalLens picker · Alt+↑ selects parent
      </p>

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
