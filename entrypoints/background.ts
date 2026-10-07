import { buildChatMessages } from '../lib/chat/prompts';
import type {
  ChatPortClientMessage,
  ChatPortServerMessage,
  ContentEvent,
  ContentResponse,
  ExtensionRequest,
  ExtensionResponse,
  TranslatePortClientMessage,
  TranslatePortServerMessage,
} from '../lib/messaging/types';
import { testOllamaConnection } from '../lib/ollama/connection';
import { OllamaClientError } from '../lib/ollama/client';
import { streamOllamaChat } from '../lib/ollama/stream';
import { retrievePageContext } from '../lib/retrieve/retrieve';
import { t } from '../lib/i18n';
import { getSettings, onSettingsChanged } from '../lib/settings/storage';
import {
  clearAllCaches,
  clearChatHistoryCache,
  clearEmbeddingsCache,
  clearTranslationsCache,
  estimateCacheSize,
} from '../lib/storage/cache-admin';
import {
  clearElementActionResult,
  setElementActionResult,
} from '../lib/storage/element-result';
import { setPendingElementContext } from '../lib/storage/pending-context';
import { runElementAction } from '../lib/translate/element-actions';
import { translateBatch } from '../lib/translate/engine';
import {
  isRestrictedUrl,
  restrictedPageMessage,
} from '../lib/utils/restricted';

const CONTEXT_MENU_PICKER = 'locallens-toggle-picker';

const chatAbortControllers = new Map<string, AbortController>();

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/help.html') });
    }
    ensureContextMenu();
  });

  ensureContextMenu();
  onSettingsChanged(() => {
    ensureContextMenu();
  });

  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {
    // Older Chrome builds may lack sidePanel; ignore.
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-picker') return;
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await togglePickerOnTab(tab.id, tab.url);
    })();
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_PICKER || !tab?.id) return;
    void togglePickerOnTab(tab.id, tab.url);
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'locallens-chat') {
      port.onMessage.addListener((message: ChatPortClientMessage) => {
        void handleChatPortMessage(port, message);
      });
      port.onDisconnect.addListener(() => {
        for (const [id, controller] of chatAbortControllers) {
          controller.abort();
          chatAbortControllers.delete(id);
        }
      });
      return;
    }

    if (port.name === 'locallens-translate') {
      port.onMessage.addListener((message: TranslatePortClientMessage) => {
        void handleTranslatePortMessage(port, message);
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isProgressMessage(message)) {
      updateTranslateBadge(message.done, message.pending);
      sendResponse({ ok: true });
      return true;
    }

    if (isContentEvent(message)) {
      void handleContentEvent(message, sender.tab).then(() => sendResponse({ ok: true }));
      return true;
    }

    void handleMessage(message as ExtensionRequest, sender.tab)
      .then(sendResponse)
      .catch((error: unknown) => {
        void getSettings().then((settings) => {
          const response: ExtensionResponse = {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : t(settings.uiLanguage, 'errorUnexpectedBackground'),
          };
          sendResponse(response);
        });
      });
    return true;
  });
});

function isProgressMessage(
  message: unknown,
): message is { type: 'TRANSLATE_PROGRESS'; done: number; pending: number } {
  return (
    !!message &&
    typeof message === 'object' &&
    (message as { type?: string }).type === 'TRANSLATE_PROGRESS'
  );
}

function updateTranslateBadge(done: number, pending: number): void {
  const total = done + pending;
  if (total === 0 || pending === 0) {
    void chrome.action.setBadgeText({ text: '' });
    return;
  }
  const pct = Math.min(99, Math.round((done / total) * 100));
  void chrome.action.setBadgeBackgroundColor({ color: '#0f6e56' });
  void chrome.action.setBadgeText({ text: `${pct}` });
}

function ensureContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    void getSettings().then((settings) => {
      chrome.contextMenus.create({
        id: CONTEXT_MENU_PICKER,
        title: t(settings.uiLanguage, 'contextMenuPicker'),
        contexts: ['page', 'selection', 'editable'],
      });
    });
  });
}

function isContentEvent(message: unknown): message is ContentEvent {
  if (!message || typeof message !== 'object') return false;
  const type = (message as { type?: string }).type;
  return type === 'PICKER_RESULT' || type === 'PICKER_CANCELLED';
}

async function handleContentEvent(
  message: ContentEvent,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (message.type === 'PICKER_CANCELLED') return;
  if (!tab?.id) return;

  if (message.action === 'ask') {
    await setPendingElementContext({
      text: message.text,
      url: message.url,
      tabId: tab.id,
      createdAt: Date.now(),
    });
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // Side panel may be unavailable; context is still stored for later.
    }
    return;
  }

  const settings = await getSettings();
  try {
    const result = await runElementAction(message.action, message.text, settings);
    await setElementActionResult({
      action: message.action,
      result,
      text: message.text,
      url: message.url,
      tabId: tab.id,
      createdAt: Date.now(),
    });
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // ignore
    }
  } catch (error) {
    const settings = await getSettings();
    await setElementActionResult({
      action: message.action,
      error:
        error instanceof Error
          ? error.message
          : t(settings.uiLanguage, 'errorElementAction'),
      text: message.text,
      url: message.url,
      tabId: tab.id,
      createdAt: Date.now(),
    });
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // ignore
    }
  }
}

async function togglePickerOnTab(tabId: number, url?: string): Promise<ExtensionResponse> {
  const settings = await getSettings();
  if (isRestrictedUrl(url)) {
    return {
      ok: false,
      error: restrictedPageMessage(settings.uiLanguage),
      kind: 'restricted',
    };
  }
  try {
    const res = (await chrome.tabs.sendMessage(tabId, {
      type: 'TOGGLE_PICKER',
    })) as ExtensionResponse;
    return res;
  } catch {
    return {
      ok: false,
      error: t(settings.uiLanguage, 'reachPageError'),
    };
  }
}

async function handleMessage(
  message: ExtensionRequest,
  senderTab: chrome.tabs.Tab | undefined,
): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { ok: true, settings };
    }
    case 'CONNECTION_TEST': {
      const settings = await getSettings();
      const connection = await testOllamaConnection(settings.ollamaHost);
      return { ok: true, connection };
    }
    case 'TRANSLATE_BATCH': {
      const settings = await getSettings();
      try {
        const result = await translateBatch({ texts: message.texts, settings });
        return {
          ok: true,
          translations: result.translations,
          fromCache: result.fromCache,
          fromModel: result.fromModel,
        };
      } catch (error) {
        if (error instanceof OllamaClientError) {
          return { ok: false, error: error.message, kind: error.kind };
        }
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : t(settings.uiLanguage, 'errorTranslationFailed'),
        };
      }
    }
    case 'ELEMENT_ACTION': {
      const settings = await getSettings();
      try {
        const result = await runElementAction(message.action, message.text, settings);
        return { ok: true, result };
      } catch (error) {
        if (error instanceof OllamaClientError) {
          return { ok: false, error: error.message, kind: error.kind };
        }
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : t(settings.uiLanguage, 'errorElementAction'),
        };
      }
    }
    case 'ASK_ABOUT_ELEMENT': {
      await setPendingElementContext({
        text: message.text,
        url: message.url,
        tabId: message.tabId,
        createdAt: Date.now(),
      });
      try {
        await chrome.sidePanel.open({ tabId: message.tabId });
      } catch {
        // ignore
      }
      return { ok: true, pong: true };
    }
    case 'TOGGLE_PICKER': {
      const tabId = message.tabId || senderTab?.id;
      if (!tabId) {
        const settings = await getSettings();
        return { ok: false, error: t(settings.uiLanguage, 'noActiveTab') };
      }
      const tab = await chrome.tabs.get(tabId);
      return togglePickerOnTab(tabId, tab.url);
    }
    case 'TRANSLATE_PROGRESS': {
      updateTranslateBadge(message.done, message.pending);
      return { ok: true, pong: true };
    }
    case 'GET_CACHE_STATS': {
      const cache = await estimateCacheSize();
      return { ok: true, cache };
    }
    case 'CLEAR_CACHE': {
      if (message.scope === 'translations') await clearTranslationsCache();
      else if (message.scope === 'embeddings') await clearEmbeddingsCache();
      else if (message.scope === 'chat') await clearChatHistoryCache();
      else await clearAllCaches();
      return { ok: true, cleared: true };
    }
    case 'APPLY_ELEMENT_TRANSLATION': {
      try {
        const res = (await chrome.tabs.sendMessage(message.tabId, {
          type: 'APPLY_ELEMENT_TRANSLATION',
          originalText: message.originalText,
          translation: message.translation,
        })) as ContentResponse;
        if (!res.ok) {
          return { ok: false, error: res.error };
        }
        await clearElementActionResult();
        return { ok: true, applied: true };
      } catch {
        const settings = await getSettings();
        return {
          ok: false,
          error: t(settings.uiLanguage, 'errorApplyReload'),
        };
      }
    }
    case 'DISCARD_ELEMENT_RESULT': {
      await clearElementActionResult();
      return { ok: true, cleared: true };
    }
    case 'PING_CONTENT':
      return { ok: true, pong: true };
    default: {
      const settings = await getSettings();
      return {
        ok: false,
        error: t(settings.uiLanguage, 'errorUnknownExtensionRequest'),
      };
    }
  }
}

function postChat(
  port: chrome.runtime.Port,
  message: ChatPortServerMessage,
): void {
  try {
    port.postMessage(message);
  } catch {
    // Port disconnected.
  }
}

function postTranslate(
  port: chrome.runtime.Port,
  message: TranslatePortServerMessage,
): void {
  try {
    port.postMessage(message);
  } catch {
    // Port disconnected.
  }
}

async function handleTranslatePortMessage(
  port: chrome.runtime.Port,
  message: TranslatePortClientMessage,
): Promise<void> {
  if (message.type !== 'TRANSLATE_BATCH') return;
  const settings = await getSettings();
  try {
    const result = await translateBatch({ texts: message.texts, settings });
    postTranslate(port, {
      type: 'TRANSLATE_BATCH_RESULT',
      requestId: message.requestId,
      translations: result.translations,
      fromCache: result.fromCache,
      fromModel: result.fromModel,
    });
  } catch (error) {
    postTranslate(port, {
      type: 'TRANSLATE_BATCH_ERROR',
      requestId: message.requestId,
      error:
        error instanceof OllamaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : t(settings.uiLanguage, 'errorTranslationFailed'),
    });
  }
}

async function handleChatPortMessage(
  port: chrome.runtime.Port,
  message: ChatPortClientMessage,
): Promise<void> {
  if (message.type === 'CHAT_CANCEL') {
    chatAbortControllers.get(message.requestId)?.abort();
    chatAbortControllers.delete(message.requestId);
    return;
  }

  if (message.type !== 'CHAT_START') return;

  const existing = chatAbortControllers.get(message.requestId);
  existing?.abort();

  const controller = new AbortController();
  chatAbortControllers.set(message.requestId, controller);

  try {
    const settings = await getSettings();
    const tab = await chrome.tabs.get(message.tabId);
    if (isRestrictedUrl(tab.url)) {
      postChat(port, {
        type: 'CHAT_ERROR',
        requestId: message.requestId,
        error: restrictedPageMessage(settings.uiLanguage),
      });
      return;
    }

    const extracted = (await chrome.tabs.sendMessage(message.tabId, {
      type: 'EXTRACT_PAGE_TEXT',
    })) as ContentResponse;

    if (!extracted.ok || extracted.kind !== 'pageText') {
      postChat(port, {
        type: 'CHAT_ERROR',
        requestId: message.requestId,
        error: !extracted.ok
          ? extracted.error
          : t(settings.uiLanguage, 'errorExtractPageText'),
      });
      return;
    }

    const page = extracted.pageText;
    const model = settings.chatModel || settings.translateModel;
    if (!model) {
      postChat(port, {
        type: 'CHAT_ERROR',
        requestId: message.requestId,
        error: t(settings.uiLanguage, 'errorNoChatModel'),
      });
      return;
    }

    const retrieved = await retrievePageContext({
      url: page.url,
      text: page.text,
      question: message.question,
      settings,
      signal: controller.signal,
    });

    postChat(port, {
      type: 'PAGE_META',
      title: page.title,
      url: page.url,
      truncated: page.truncated || retrieved.usedRetrieval,
      chars: page.text.length,
      usedRetrieval: retrieved.usedRetrieval,
      selectedChunks: retrieved.selectedCount,
    });

    const messages = buildChatMessages({
      systemPrompt: settings.systemPromptChat,
      pageTitle: page.title,
      pageUrl: page.url,
      pageText: retrieved.contextText,
      elementContext: message.elementContext,
      question: message.question,
      recentMessages: message.recentMessages,
      historyTurns: settings.chatHistoryTurns,
    });

    const full = await streamOllamaChat({
      host: settings.ollamaHost,
      model,
      messages,
      options: {
        temperature: Math.max(settings.temperature, 0.2),
        num_ctx: settings.numCtx,
      },
      keep_alive: settings.keepAlive,
      signal: controller.signal,
      onToken: (token) => {
        postChat(port, {
          type: 'CHAT_TOKEN',
          requestId: message.requestId,
          token,
        });
      },
    });

    postChat(port, {
      type: 'CHAT_DONE',
      requestId: message.requestId,
      full,
    });
  } catch (error) {
    const lang = (await getSettings()).uiLanguage;
    if (error instanceof DOMException && error.name === 'AbortError') {
      postChat(port, {
        type: 'CHAT_ERROR',
        requestId: message.requestId,
        error: t(lang, 'errorGenerationStopped'),
      });
      return;
    }
    const msg =
      error instanceof OllamaClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : t(lang, 'errorChatFailed');
    postChat(port, {
      type: 'CHAT_ERROR',
      requestId: message.requestId,
      error: msg,
    });
  } finally {
    chatAbortControllers.delete(message.requestId);
  }
}

