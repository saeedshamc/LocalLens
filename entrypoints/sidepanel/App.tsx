import { useEffect, useRef, useState } from 'react';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  inputClassName,
} from '../../components/Field';
import { renderSafeChatText } from '../../lib/chat/safe-text';
import { pickerActionLabel, t } from '../../lib/i18n';
import type {
  ChatPortClientMessage,
  ChatPortServerMessage,
  ExtensionResponse,
} from '../../lib/messaging/types';
import { getSettings } from '../../lib/settings/storage';
import type { Settings, UiLanguage } from '../../lib/settings/types';
import {
  clearChatThread,
  getChatThread,
  saveChatThread,
  type ChatHistoryMessage,
} from '../../lib/storage/chat-history';
import {
  getElementActionResult,
  isElementResultStorageKey,
  type ElementActionResult,
} from '../../lib/storage/element-result';
import {
  clearPendingElementContext,
  getPendingElementContext,
  isPendingContextStorageKey,
} from '../../lib/storage/pending-context';
import { isRtlLanguage } from '../../lib/utils/rtl';
import { toSpeechLocale } from '../../lib/voice/lang';
import { isSpeechRecognitionAvailable, listenOnce } from '../../lib/voice/stt';

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [elementContext, setElementContext] = useState<string | null>(null);
  const [elementResult, setElementResult] = useState<ElementActionResult | null>(null);
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const persistRef = useRef<{ tabId: number; url: string } | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  const sttAvailable = isSpeechRecognitionAvailable();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const loaded = await getSettings();
      if (!alive) return;
      setSettings(loaded);
      settingsRef.current = loaded;
      setUiLanguage(loaded.uiLanguage);

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

      const pending = await getPendingElementContext(tab.id);
      if (!alive) return;
      if (pending?.text) setElementContext(pending.text);
      setElementResult(await getElementActionResult(tab.id));
    })();

    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'session') return;
      const id = persistRef.current?.tabId;
      if (id == null) return;
      if (Object.keys(changes).some((key) => isElementResultStorageKey(key, id))) {
        void getElementActionResult(id).then(setElementResult);
      }
      if (Object.keys(changes).some((key) => isPendingContextStorageKey(key, id))) {
        void getPendingElementContext(id).then((pending) => {
          setElementContext(pending?.text ?? null);
        });
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
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
        const full = message.full;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              content: full || last.content,
              streaming: false,
            };
          }
          return next;
        });
        const s = settingsRef.current;
        if (s?.ttsEnabled && s.autoSpeakReplies && full.trim()) {
          void chrome.runtime.sendMessage({
            type: 'SPEAK_TEXT',
            text: full,
            lang: toSpeechLocale(s.sttLang || s.uiLanguage),
          });
        }
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

  const askWithText = (raw: string) => {
    if (!tabId || !raw.trim() || streaming) return;
    const question = raw.trim();
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
    const recent = messages
      .filter((m) => !m.streaming && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    post({
      type: 'CHAT_START',
      requestId,
      tabId,
      question,
      elementContext: elementContext ?? undefined,
      recentMessages: recent,
    });
  };

  const ask = () => askWithText(input);

  const speak = (text: string, preferTarget = false) => {
    const s = settingsRef.current;
    if (!s?.ttsEnabled || !text.trim()) return;
    void chrome.runtime.sendMessage({
      type: 'SPEAK_TEXT',
      text,
      lang: toSpeechLocale(
        preferTarget ? s.targetLanguage : s.sttLang || s.uiLanguage,
      ),
    });
  };

  const stopSpeak = () => {
    void chrome.runtime.sendMessage({ type: 'STOP_SPEAK' });
  };

  const startVoiceInput = async () => {
    if (!sttAvailable || listening || streaming || tabId === null) return;
    setError(null);
    setListening(true);
    try {
      const s = settingsRef.current ?? (await getSettings());
      const lang = toSpeechLocale(s.sttLang || s.uiLanguage);
      const { transcript } = await listenOnce({ lang });
      askWithText(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(uiLanguage, 'voiceNotSupported'));
    } finally {
      setListening(false);
    }
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      setTabId(tab.id);
      const url = tab.url ?? '';
      setPageUrl(url);
      persistRef.current = { tabId: tab.id, url };
      const pending = await getPendingElementContext(tab.id);
      setElementContext(pending?.text ?? null);
      setElementResult(await getElementActionResult(tab.id));
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
        <p className="m-0 mt-1 text-[11px] text-[var(--ll-muted)]">
          {t(uiLanguage, 'openChatHint')}
        </p>
      </header>

      {elementContext ? (
        <div className="mx-4 mt-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-accent-soft)]/60 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between gap-2">
            <strong>{t(uiLanguage, 'elementContext')}</strong>
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                if (tabId == null) return;
                void clearPendingElementContext(tabId).then(() =>
                  setElementContext(null),
                );
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

      {elementResult ? (
        <div className="mx-4 mt-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)] px-3 py-2 text-sm">
          <h2 className="m-0 text-sm font-semibold">
            {t(uiLanguage, 'elementPreview')} —{' '}
            {pickerActionLabel(uiLanguage, elementResult.action)}
          </h2>
          {elementResult.error ? (
            <p className="m-0 mt-2 text-[var(--ll-danger)]" role="alert">
              {elementResult.error}
            </p>
          ) : elementResult.result ? (
            <div className="mt-2 max-h-40 overflow-auto leading-relaxed">
              {renderSafeChatText(elementResult.result)}
            </div>
          ) : (
            <p className="m-0 mt-2 text-[var(--ll-muted)]" role="status">
              {t(uiLanguage, 'working')}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {(elementResult.action === 'translate' ||
              elementResult.action === 'translateRead') &&
            elementResult.result ? (
              <button
                type="button"
                className={buttonPrimaryClassName}
                onClick={() => {
                  if (!elementResult.tabId || !elementResult.result) return;
                  void (async () => {
                    const res = (await chrome.runtime.sendMessage({
                      type: 'APPLY_ELEMENT_TRANSLATION',
                      tabId: elementResult.tabId,
                      originalText: elementResult.text,
                      translation: elementResult.result,
                    })) as ExtensionResponse;
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    setPreviewStatus(t(uiLanguage, 'applySuccess'));
                    setElementResult(null);
                  })();
                }}
              >
                {t(uiLanguage, 'applyToPage')}
              </button>
            ) : null}
            {elementResult.result && settings?.ttsEnabled ? (
              <button
                type="button"
                className={buttonSecondaryClassName}
                onClick={() =>
                  speak(
                    elementResult.result ?? '',
                    elementResult.action === 'translate' ||
                      elementResult.action === 'translateRead',
                  )
                }
              >
                {t(uiLanguage, 'speak')}
              </button>
            ) : null}
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                stopSpeak();
                if (tabId == null) return;
                void chrome.runtime
                  .sendMessage({ type: 'DISCARD_ELEMENT_RESULT', tabId })
                  .then(() => {
                    setElementResult(null);
                    setPreviewStatus(null);
                  });
              }}
            >
              {t(uiLanguage, 'discard')}
            </button>
          </div>
          {elementResult.spoken ? (
            <p className="m-0 mt-2 text-xs text-[var(--ll-accent)]" role="status">
              {t(uiLanguage, 'spokeAloud')}
            </p>
          ) : null}
          {previewStatus ? (
            <p className="m-0 mt-2 text-xs text-[var(--ll-accent)]" role="status">
              {previewStatus}
            </p>
          ) : null}
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
            {message.role === 'assistant' &&
            !message.streaming &&
            message.content.trim() &&
            settings?.ttsEnabled ? (
              <button
                type="button"
                className={`${buttonSecondaryClassName} mt-2 py-1 text-xs`}
                onClick={() => speak(message.content)}
              >
                {t(uiLanguage, 'speak')}
              </button>
            ) : null}
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
          {settings?.ttsEnabled ? (
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={stopSpeak}
            >
              {t(uiLanguage, 'stopSpeak')}
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
          <div className="flex flex-col gap-2">
            {sttAvailable ? (
              <button
                type="button"
                className={buttonSecondaryClassName}
                disabled={streaming || listening || tabId === null}
                aria-pressed={listening}
                aria-busy={listening}
                onClick={() => void startVoiceInput()}
              >
                {listening ? t(uiLanguage, 'listening') : t(uiLanguage, 'voiceInput')}
              </button>
            ) : null}
            <button
              type="button"
              className={buttonPrimaryClassName}
              disabled={streaming || !input.trim() || tabId === null}
              onClick={ask}
            >
              {t(uiLanguage, 'send')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
