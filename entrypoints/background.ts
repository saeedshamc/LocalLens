import type {
  ContentEvent,
  ExtensionRequest,
  ExtensionResponse,
} from '../lib/messaging/types';
import { testOllamaConnection } from '../lib/ollama/connection';
import { OllamaClientError } from '../lib/ollama/client';
import { getSettings } from '../lib/settings/storage';
import { setPendingElementContext } from '../lib/storage/pending-context';
import { runElementAction } from '../lib/translate/element-actions';
import { translateBatch } from '../lib/translate/engine';
import {
  RESTRICTED_PAGE_MESSAGE,
  isRestrictedUrl,
} from '../lib/utils/restricted';

const CONTEXT_MENU_PICKER = 'locallens-toggle-picker';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/help.html') });
    }
    ensureContextMenu();
  });

  ensureContextMenu();

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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isContentEvent(message)) {
      void handleContentEvent(message, sender.tab).then(() => sendResponse({ ok: true }));
      return true;
    }

    void handleMessage(message as ExtensionRequest, sender.tab)
      .then(sendResponse)
      .catch((error: unknown) => {
        const response: ExtensionResponse = {
          ok: false,
          error: error instanceof Error ? error.message : 'Unexpected background error.',
        };
        sendResponse(response);
      });
    return true;
  });
});

function ensureContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_PICKER,
      title: 'LocalLens: Toggle element picker',
      contexts: ['page', 'selection', 'editable'],
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
    await chrome.storage.session.set({
      'locallens.lastElementResult': {
        action: message.action,
        result,
        text: message.text,
        url: message.url,
        tabId: tab.id,
        createdAt: Date.now(),
      },
    });
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // ignore
    }
  } catch (error) {
    await chrome.storage.session.set({
      'locallens.lastElementResult': {
        action: message.action,
        error: error instanceof Error ? error.message : 'Element action failed.',
        text: message.text,
        url: message.url,
        tabId: tab.id,
        createdAt: Date.now(),
      },
    });
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // ignore
    }
  }
}

async function togglePickerOnTab(tabId: number, url?: string): Promise<ExtensionResponse> {
  if (isRestrictedUrl(url)) {
    return { ok: false, error: RESTRICTED_PAGE_MESSAGE, kind: 'restricted' };
  }
  try {
    const res = (await chrome.tabs.sendMessage(tabId, {
      type: 'TOGGLE_PICKER',
    })) as ExtensionResponse;
    return res;
  } catch {
    return {
      ok: false,
      error:
        'Could not reach the page. Reload the tab, then try again. LocalLens cannot run on restricted browser pages.',
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
          error: error instanceof Error ? error.message : 'Translation failed.',
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
          error: error instanceof Error ? error.message : 'Element action failed.',
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
      if (!tabId) return { ok: false, error: 'No active tab.' };
      const tab = await chrome.tabs.get(tabId);
      return togglePickerOnTab(tabId, tab.url);
    }
    case 'PING_CONTENT':
      return { ok: true, pong: true };
    default:
      return { ok: false, error: 'Unknown request.' };
  }
}
