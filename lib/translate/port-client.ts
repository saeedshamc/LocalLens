import type {
  TranslatePortClientMessage,
  TranslatePortServerMessage,
} from '../messaging/types';

/**
 * Translate text batches over a long-lived background port so MV3 is less
 * likely to kill mid-page translation.
 */
export function createTranslatePortClient(): {
  translateBatch: (texts: string[]) => Promise<string[]>;
  disconnect: () => void;
} {
  const port = chrome.runtime.connect({ name: 'locallens-translate' });
  const pending = new Map<
    string,
    {
      resolve: (value: string[]) => void;
      reject: (error: Error) => void;
    }
  >();

  port.onMessage.addListener((message: TranslatePortServerMessage) => {
    const entry = pending.get(message.requestId);
    if (!entry) return;
    pending.delete(message.requestId);
    if (message.type === 'TRANSLATE_BATCH_RESULT') {
      entry.resolve(message.translations);
      return;
    }
    entry.reject(new Error(message.error));
  });

  port.onDisconnect.addListener(() => {
    for (const [, entry] of pending) {
      entry.reject(new Error('Translate port disconnected.'));
    }
    pending.clear();
  });

  return {
    translateBatch(texts) {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return new Promise<string[]>((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        const payload: TranslatePortClientMessage = {
          type: 'TRANSLATE_BATCH',
          requestId,
          texts,
        };
        try {
          port.postMessage(payload);
        } catch (error) {
          pending.delete(requestId);
          reject(error instanceof Error ? error : new Error('Failed to post translate batch.'));
        }
      });
    },
    disconnect() {
      try {
        port.disconnect();
      } catch {
        // ignore
      }
    },
  };
}
