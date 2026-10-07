import { useEffect, useRef, useState } from 'react';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  inputClassName,
} from '../../components/Field';
import { renderSafeChatText } from '../../lib/chat/safe-text';
import type {
  ChatPortClientMessage,
  ChatPortServerMessage,
} from '../../lib/messaging/types';
import { getSettings } from '../../lib/settings/storage';
import {
  clearPendingElementContext,
  getPendingElementContext,
} from '../../lib/storage/pending-context';
import type { UiLanguage } from '../../lib/settings/types';
import { isRtlLanguage } from '../../lib/utils/rtl';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface PageMeta {
  title: string;
  url: string;
  truncated: boolean;
  chars: number;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SidePanelApp() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [tabId, setTabId] = useState<number | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [elementContext, setElementContext] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const settings = await getSettings();
      if (!alive) return;
      setUiLanguage(settings.uiLanguage);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!alive) return;
      if (tab?.id) setTabId(tab.id);

      const pending = await getPendingElementContext();
      if (!alive) return;
      if (pending?.text) setElementContext(pending.text);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streaming]);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'locallens-chat' });
    portRef.current = port;
    port.onMessage.addListener((message: ChatPortServerMessage) => {
      if (message.type === 'PAGE_META') {
        setPageMeta({
          title: message.title,
          url: message.url,
          truncated: message.truncated,
          chars: message.chars,
        });
        return;
      }

      if (message.type === 'CHAT_TOKEN') {
        if (message.requestId !== requestIdRef.current) return;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last.streaming) {
            next[next.length - 1] = {
              ...last,
              content: last.content + message.token,
            };
          }
          return next;
        });
        return;
      }

      if (message.type === 'CHAT_DONE') {
        if (message.requestId !== requestIdRef.current) return;
        setStreaming(false);
        requestIdRef.current = null;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              content: message.full || last.content,
              streaming: false,
            };
          }
          return next;
        });
        return;
      }

      if (message.type === 'CHAT_ERROR') {
        if (message.requestId !== requestIdRef.current) return;
        setStreaming(false);
        requestIdRef.current = null;
        setError(message.error);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last.streaming && !last.content) {
            next.pop();
          } else if (last?.role === 'assistant' && last.streaming) {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
      }
    });

    return () => {
      port.disconnect();
      portRef.current = null;
    };
  }, []);

  const dir = isRtlLanguage(uiLanguage) ? 'rtl' : 'ltr';

  const post = (message: ChatPortClientMessage) => {
    portRef.current?.postMessage(message);
  };

  const ask = () => {
    if (!tabId || !input.trim() || streaming) return;
    const question = input.trim();
    const requestId = newId();
    requestIdRef.current = requestId;
    setInput('');
    setError(null);
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', content: question },
      { id: newId(), role: 'assistant', content: '', streaming: true },
    ]);
    post({
      type: 'CHAT_START',
      requestId,
      tabId,
      question,
      elementContext: elementContext ?? undefined,
    });
  };

  const stop = () => {
    if (!requestIdRef.current) return;
    post({ type: 'CHAT_CANCEL', requestId: requestIdRef.current });
    setStreaming(false);
  };

  const clearChat = () => {
    if (streaming && requestIdRef.current) {
      post({ type: 'CHAT_CANCEL', requestId: requestIdRef.current });
    }
    setMessages([]);
    setError(null);
    setStreaming(false);
    requestIdRef.current = null;
  };

  const refreshContext = async () => {
    setError(null);
    const pending = await getPendingElementContext();
    setElementContext(pending?.text ?? null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) setTabId(tab.id);
    setPageMeta(null);
    setError(null);
  };

  return (
    <div
      dir={dir}
      className="flex min-h-screen flex-col bg-[var(--ll-bg)] text-[var(--ll-ink)]"
      style={{
        background:
          'radial-gradient(ellipse 80% 40% at 100% 0%, #efe6d4 0%, transparent 50%), var(--ll-bg)',
      }}
    >
      <header className="border-b border-[var(--ll-border)] px-4 py-3">
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--ll-accent)]">
          LocalLens
        </p>
        <h1 className="m-0 text-lg font-semibold">Chat with page</h1>
        {pageMeta ? (
          <p className="m-0 mt-1 text-xs text-[var(--ll-muted)]">
            {pageMeta.title || pageMeta.url} · {pageMeta.chars} chars
            {pageMeta.truncated ? ' · truncated' : ''}
          </p>
        ) : (
          <p className="m-0 mt-1 text-xs text-[var(--ll-muted)]">
            Answers use the active tab’s extracted content via local Ollama.
          </p>
        )}
      </header>

      {elementContext ? (
        <div className="mx-4 mt-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-accent-soft)]/60 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between gap-2">
            <strong>Element context</strong>
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                void clearPendingElementContext().then(() => setElementContext(null));
              }}
            >
              Clear
            </button>
          </div>
          <p className="m-0 max-h-24 overflow-auto whitespace-pre-wrap">
            {elementContext.slice(0, 1200)}
          </p>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="m-0 text-sm text-[var(--ll-muted)]">
            Ask a question about this page. If the answer is not on the page, the model
            should say so.
          </p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ms-6 rounded-lg bg-[var(--ll-bg-elevated)] px-3 py-2 text-sm shadow-sm'
                : 'me-4 rounded-lg border border-[var(--ll-border)] bg-white/80 px-3 py-2 text-sm'
            }
          >
            <p className="m-0 mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ll-muted)]">
              {message.role === 'user' ? 'You' : 'LocalLens'}
              {message.streaming ? ' · …' : ''}
            </p>
            <div className="leading-relaxed">{renderSafeChatText(message.content || ' ')}</div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mx-4 mb-2 text-xs text-[var(--ll-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <footer className="border-t border-[var(--ll-border)] bg-[var(--ll-bg-elevated)]/80 p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonSecondaryClassName}
            onClick={() => void refreshContext()}
          >
            Refresh page content
          </button>
          <button type="button" className={buttonSecondaryClassName} onClick={clearChat}>
            Clear chat
          </button>
          {streaming ? (
            <button type="button" className={buttonSecondaryClassName} onClick={stop}>
              Stop
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <textarea
            className={`${inputClassName} min-h-[72px] resize-y`}
            value={input}
            placeholder="Ask about this page…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            disabled={streaming || tabId === null}
          />
          <button
            type="button"
            className={buttonPrimaryClassName}
            disabled={streaming || !input.trim() || tabId === null}
            onClick={ask}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
