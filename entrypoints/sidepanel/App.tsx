import { useEffect, useRef, useState } from 'react';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  inputClassName,
} from '../../components/Field';
import { renderSafeChatText } from '../../lib/chat/safe-text';
import { t } from '../../lib/i18n';
import type {
  ChatPortClientMessage,
  ChatPortServerMessage,
} from '../../lib/messaging/types';
import { getSettings } from '../../lib/settings/storage';
import {
  clearChatThread,
  getChatThread,
  saveChatThread,
  type ChatHistoryMessage,
} from '../../lib/storage/chat-history';
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
  createdAt: number;
}

interface PageMeta {
  title: string;
  url: string;
  truncated: boolean;
  chars: number;
  usedRetrieval?: boolean;
  selectedChunks?: number;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toHistory(messages: ChatMessage[]): ChatHistoryMessage[] {
  return messages
    .filter((m) => !m.streaming)
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
}

export function SidePanelApp() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [tabId, setTabId] = useState<number | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [elementContext, setElementContext] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const persistRef = useRef<{ tabId: number; url: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const settings = await getSettings();
      if (!alive) return;
      setUiLanguage(settings.uiLanguage);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!alive || !tab?.id) return;
      setTabId(tab.id);
      const url = tab.url ?? '';
      setPageUrl(url);
      persistRef.current = { tabId: tab.id, url };

      const thread = await getChatThread(tab.id, url);
      if (!alive) return;
      if (thread?.messages.length) {
        setMessages(
          thread.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        );
      }

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
    if (!persistRef.current || streaming) return;
    const { tabId: id, url } = persistRef.current;
    void saveChatThread(id, url, toHistory(messages));
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
          usedRetrieval: message.usedRetrieval,
          selectedChunks: message.selectedChunks,
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
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', content: question, createdAt: now },
      {
        id: newId(),
        role: 'assistant',
        content: '',
        streaming: true,
        createdAt: now + 1,
      },
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
    if (persistRef.current) {
      void clearChatThread(persistRef.current.tabId, persistRef.current.url);
    }
  };

  const refreshContext = async () => {
    setError(null);
    const pending = await getPendingElementContext();
    setElementContext(pending?.text ?? null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      setTabId(tab.id);
      const url = tab.url ?? '';
      setPageUrl(url);
      persistRef.current = { tabId: tab.id, url };
      const thread = await getChatThread(tab.id, url);
      setMessages(
        (thread?.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      );
    }
    setPageMeta(null);
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
          {t(uiLanguage, 'appName')}
        </p>
        <h1 className="m-0 text-lg font-semibold">{t(uiLanguage, 'chatTitle')}</h1>
        {pageMeta ? (
          <p className="m-0 mt-1 text-xs text-[var(--ll-muted)]">
            {pageMeta.title || pageMeta.url} · {pageMeta.chars} chars
            {pageMeta.usedRetrieval
              ? ` · retrieved ${pageMeta.selectedChunks ?? 0} passages`
              : pageMeta.truncated
                ? ' · truncated'
                : ''}
          </p>
        ) : (
          <p className="m-0 mt-1 text-xs text-[var(--ll-muted)]">
            {pageUrl ? t(uiLanguage, 'chatHistoryHint') : t(uiLanguage, 'chatIntro')}
          </p>
        )}
      </header>

      {elementContext ? (
        <div className="mx-4 mt-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-accent-soft)]/60 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between gap-2">
            <strong>{t(uiLanguage, 'elementContext')}</strong>
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                void clearPendingElementContext().then(() => setElementContext(null));
              }}
            >
              {t(uiLanguage, 'clear')}
            </button>
          </div>
          <p className="m-0 max-h-24 overflow-auto whitespace-pre-wrap">
            {elementContext.slice(0, 1200)}
          </p>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="m-0 text-sm text-[var(--ll-muted)]">{t(uiLanguage, 'chatIntro')}</p>
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
              {message.role === 'user' ? t(uiLanguage, 'you') : t(uiLanguage, 'appName')}
              {message.streaming ? ' · …' : ''}
            </p>
            <div className="leading-relaxed">
              {renderSafeChatText(message.content || ' ')}
            </div>
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
            {t(uiLanguage, 'refreshPageContent')}
          </button>
          <button type="button" className={buttonSecondaryClassName} onClick={clearChat}>
            {t(uiLanguage, 'clearChat')}
          </button>
          {streaming ? (
            <button type="button" className={buttonSecondaryClassName} onClick={stop}>
              {t(uiLanguage, 'stop')}
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <textarea
            className={`${inputClassName} min-h-[72px] resize-y`}
            value={input}
            placeholder={t(uiLanguage, 'chatPlaceholder')}
            aria-label={t(uiLanguage, 'chatPlaceholder')}
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
            {t(uiLanguage, 'send')}
          </button>
        </div>
      </footer>
    </div>
  );
}
