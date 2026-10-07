import { useEffect, useState } from 'react';
import { buttonSecondaryClassName } from '../../components/Field';
import { getSettings } from '../../lib/settings/storage';
import {
  clearPendingElementContext,
  getPendingElementContext,
  type PendingElementContext,
} from '../../lib/storage/pending-context';
import type { UiLanguage } from '../../lib/settings/types';
import { isRtlLanguage } from '../../lib/utils/rtl';

interface ElementResult {
  action: string;
  result?: string;
  error?: string;
  text: string;
  url: string;
  createdAt: number;
}

async function readPanelState(): Promise<{
  uiLanguage: UiLanguage;
  pending: PendingElementContext | null;
  lastResult: ElementResult | null;
}> {
  const settings = await getSettings();
  const pending = await getPendingElementContext();
  const stored = await chrome.storage.session.get('locallens.lastElementResult');
  const value = stored['locallens.lastElementResult'];
  const lastResult =
    value && typeof value === 'object' ? (value as ElementResult) : null;
  return { uiLanguage: settings.uiLanguage, pending, lastResult };
}

export function SidePanelApp() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [pending, setPending] = useState<PendingElementContext | null>(null);
  const [lastResult, setLastResult] = useState<ElementResult | null>(null);

  useEffect(() => {
    let alive = true;

    const apply = (state: Awaited<ReturnType<typeof readPanelState>>) => {
      if (!alive) return;
      setUiLanguage(state.uiLanguage);
      setPending(state.pending);
      setLastResult(state.lastResult);
    };

    void readPanelState().then(apply);

    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'session') return;
      if (
        'locallens.pendingElementContext' in changes ||
        'locallens.lastElementResult' in changes
      ) {
        void readPanelState().then(apply);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  const dir = isRtlLanguage(uiLanguage) ? 'rtl' : 'ltr';

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[var(--ll-bg)] p-4 text-[var(--ll-ink)]"
      style={{
        background:
          'radial-gradient(ellipse 80% 40% at 100% 0%, #efe6d4 0%, transparent 50%), var(--ll-bg)',
      }}
    >
      <header className="mb-4 border-b border-[var(--ll-border)] pb-3">
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--ll-accent)]">
          LocalLens
        </p>
        <h1 className="m-0 text-lg font-semibold">Side panel</h1>
        <p className="m-0 mt-1 text-sm text-[var(--ll-muted)]">
          Element results appear here. Full page chat streaming arrives in the next
          release.
        </p>
      </header>

      {pending ? (
        <section className="mb-4 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/90 p-3">
          <h2 className="m-0 text-sm font-semibold">Ask in chat — context ready</h2>
          <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {pending.text.slice(0, 4000)}
          </p>
          <button
            type="button"
            className={`${buttonSecondaryClassName} mt-3`}
            onClick={() => {
              void clearPendingElementContext().then(() => setPending(null));
            }}
          >
            Clear context
          </button>
        </section>
      ) : null}

      {lastResult ? (
        <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/90 p-3">
          <h2 className="m-0 text-sm font-semibold capitalize">
            {lastResult.action} result
          </h2>
          {lastResult.error ? (
            <p className="m-0 mt-2 text-sm text-[var(--ll-danger)]" role="alert">
              {lastResult.error}
            </p>
          ) : (
            <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {lastResult.result}
            </p>
          )}
          <details className="mt-3 text-xs text-[var(--ll-muted)]">
            <summary>Selected text</summary>
            <p className="whitespace-pre-wrap">{lastResult.text.slice(0, 2000)}</p>
          </details>
        </section>
      ) : (
        !pending && (
          <p className="m-0 text-sm text-[var(--ll-muted)]">
            Use the element picker (popup, right-click menu, or Alt+Shift+L) to translate,
            explain, summarize, or ask about a selection.
          </p>
        )
      )}
    </div>
  );
}
