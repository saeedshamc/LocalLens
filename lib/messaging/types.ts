import type { ConnectionResult } from '../ollama/types';
import type { Settings } from '../settings/types';
import type { PickerAction } from '../picker/menu';

export type ExtensionRequest =
  | { type: 'GET_SETTINGS' }
  | { type: 'CONNECTION_TEST' }
  | { type: 'TRANSLATE_BATCH'; texts: string[]; requestId?: string }
  | {
      type: 'ELEMENT_ACTION';
      action: Exclude<PickerAction, 'ask'>;
      text: string;
    }
  | {
      type: 'ASK_ABOUT_ELEMENT';
      text: string;
      url: string;
      tabId: number;
    }
  | { type: 'TOGGLE_PICKER'; tabId: number }
  | { type: 'PING_CONTENT' };

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
  | { ok: false; error: string; kind?: string };

export type ContentRequest =
  | { type: 'TRANSLATE_PAGE' }
  | { type: 'RESTORE_PAGE' }
  | { type: 'GET_STATUS' }
  | { type: 'START_PICKER' }
  | { type: 'STOP_PICKER' }
  | { type: 'TOGGLE_PICKER' };

export type ContentResponse =
  | {
      ok: true;
      translated: boolean;
      nodeCount?: number;
      fromCache?: number;
      fromModel?: number;
      pickerActive?: boolean;
    }
  | { ok: false; error: string; kind?: 'restricted' | 'empty' | 'busy' | 'error' };

export type ContentEvent =
  | {
      type: 'PICKER_RESULT';
      action: PickerAction;
      text: string;
      url: string;
    }
  | { type: 'PICKER_CANCELLED' };
