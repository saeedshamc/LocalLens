import type { ConnectionResult } from '../ollama/types';
import type { Settings } from '../settings/types';

export type ExtensionRequest =
  | { type: 'GET_SETTINGS' }
  | { type: 'CONNECTION_TEST' }
  | { type: 'TRANSLATE_BATCH'; texts: string[]; requestId?: string }
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
  | { ok: true; pong: true }
  | { ok: false; error: string; kind?: string };

export type ContentRequest =
  | { type: 'TRANSLATE_PAGE' }
  | { type: 'RESTORE_PAGE' }
  | { type: 'GET_STATUS' };

export type ContentResponse =
  | {
      ok: true;
      translated: boolean;
      nodeCount?: number;
      fromCache?: number;
      fromModel?: number;
    }
  | { ok: false; error: string; kind?: 'restricted' | 'empty' | 'busy' | 'error' };
