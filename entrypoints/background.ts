import type { ExtensionRequest, ExtensionResponse } from '../lib/messaging/types';
import { testOllamaConnection } from '../lib/ollama/connection';
import { OllamaClientError } from '../lib/ollama/client';
import { getSettings } from '../lib/settings/storage';
import { translateBatch } from '../lib/translate/engine';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'install') return;
    const helpUrl = chrome.runtime.getURL('/help.html');
    void chrome.tabs.create({ url: helpUrl });
  });

  chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse) => {
    void handleMessage(message)
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

async function handleMessage(message: ExtensionRequest): Promise<ExtensionResponse> {
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
    case 'PING_CONTENT':
      return { ok: true, pong: true };
    default:
      return { ok: false, error: 'Unknown request.' };
  }
}
