import type { ConnectionResult } from '../ollama/types';
import type { Settings } from '../settings/types';
import type { PickerAction } from '../picker/menu';

export type ExtensionRequest =
  | { type: 'GET_SETTINGS' }
  | { type: 'CONNECTION_TEST' }
  | { type: 'TRANSLATE_BATCH'; texts: string[]; requestId?: string }
  | {
      type: 'ELEMENT_ACTION';
      action: Exclude<PickerAction, 'ask' | 'read' | 'translateRead'>;
      text: string;
    }
  | { type: 'SPEAK_TEXT'; text: string; lang?: string }
  | { type: 'STOP_SPEAK' }
  | {
      type: 'ASK_ABOUT_ELEMENT';
      text: string;
      url: string;
      tabId: number;
    }
  | { type: 'TOGGLE_PICKER'; tabId: number }
  | { type: 'PING_CONTENT' }
  | { type: 'TRANSLATE_PROGRESS'; done: number; pending: number; tabId?: number }
  | { type: 'GET_CACHE_STATS' }
  | { type: 'CLEAR_CACHE'; scope: 'translations' | 'embeddings' | 'chat' | 'all' }
  | {
      type: 'APPLY_ELEMENT_TRANSLATION';
      tabId: number;
      originalText: string;
      translation: string;
    }
  | { type: 'DISCARD_ELEMENT_RESULT'; tabId: number };

export type ExtensionResponse =
  | { ok: true; settings: Settings }
  | { ok: true; connection: ConnectionResult }
  | {
      ok: true;
      translations: string[];
      fromCache: number;
      fromModel: number;
    }
  | { ok: true; result: string }
  | { ok: true; pong: true }
  | { ok: true; pickerActive?: boolean }
  | {
      ok: true;
      cache: {
        translationsBytes: number;
        embeddingsBytes: number;
        chatHistoryBytes: number;
        totalBytes: number;
        translationsCount: number;
        embeddingsCount: number;
        chatHistoryCount: number;
      };
    }
  | { ok: true; cleared: true }
  | { ok: true; applied: true }
  | { ok: false; error: string; kind?: string };

export type ContentRequest =
  | { type: 'TRANSLATE_PAGE'; force?: boolean }
  | { type: 'RESTORE_PAGE' }
  | { type: 'GET_STATUS' }
  | { type: 'START_PICKER' }
  | { type: 'STOP_PICKER' }
  | { type: 'TOGGLE_PICKER' }
  | { type: 'EXTRACT_PAGE_TEXT' }
  | {
      type: 'APPLY_ELEMENT_TRANSLATION';
      originalText: string;
      translation: string;
    }
  | { type: 'SHOW_TOAST'; message: string; tone?: 'info' | 'error' };

export type ContentResponse =
  | {
      ok: true;
      kind: 'status';
      translated: boolean;
      nodeCount?: number;
      fromCache?: number;
      fromModel?: number;
      pickerActive?: boolean;
    }
  | {
      ok: true;
      kind: 'pageText';
      pageText: {
        title: string;
        text: string;
        truncated: boolean;
        source: 'readability' | 'body';
        url: string;
      };
    }
  | {
      ok: false;
      error: string;
      kind?: 'restricted' | 'empty' | 'busy' | 'error' | 'sameLanguage';
    };

export type ChatPortClientMessage =
  | {
      type: 'CHAT_START';
      requestId: string;
      tabId: number;
      question: string;
      elementContext?: string;
      recentMessages?: { role: 'user' | 'assistant'; content: string }[];
    }
  | { type: 'CHAT_CANCEL'; requestId: string };

export type TranslatePortClientMessage = {
  type: 'TRANSLATE_BATCH';
  requestId: string;
  texts: string[];
};

export type TranslatePortServerMessage =
  | {
      type: 'TRANSLATE_BATCH_RESULT';
      requestId: string;
      translations: string[];
      fromCache: number;
      fromModel: number;
    }
  | { type: 'TRANSLATE_BATCH_ERROR'; requestId: string; error: string };

export type ChatPortServerMessage =
  | { type: 'CHAT_TOKEN'; requestId: string; token: string }
  | { type: 'CHAT_DONE'; requestId: string; full: string }
  | { type: 'CHAT_ERROR'; requestId: string; error: string }
  | {
      type: 'PAGE_META';
      title: string;
      url: string;
      truncated: boolean;
      chars: number;
      usedRetrieval?: boolean;
      selectedChunks?: number;
    };

export type ContentEvent =
  | {
      type: 'PICKER_RESULT';
      action: PickerAction;
      text: string;
      url: string;
    }
  | { type: 'PICKER_CANCELLED' };
