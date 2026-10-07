import type { ChatMessage } from '../translate/prompts';
import type { ConnectionResult } from './types';
import { testOllamaConnection } from './connection';

export interface ChatOptions {
  host: string;
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  format?: unknown;
  options?: {
    temperature?: number;
    num_ctx?: number;
  };
  keep_alive?: string;
  signal?: AbortSignal;
}

export interface ChatResponseMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  message: ChatResponseMessage;
  done: boolean;
}

export class OllamaClientError extends Error {
  readonly kind: 'cors' | 'offline' | 'http' | 'parse';
  readonly status?: number;

  constructor(
    kind: OllamaClientError['kind'],
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = 'OllamaClientError';
    this.kind = kind;
    this.status = status;
  }
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\/$/, '');
}

async function classifyFailedResponse(response: Response): Promise<never> {
  if (response.status === 403) {
    throw new OllamaClientError(
      'cors',
      'Ollama rejected the request (HTTP 403). Set OLLAMA_ORIGINS for this extension and restart Ollama.',
      403,
    );
  }
  let detail = '';
  try {
    detail = (await response.text()).slice(0, 300);
  } catch {
    detail = '';
  }
  throw new OllamaClientError(
    'http',
    detail
      ? `Ollama returned HTTP ${response.status}: ${detail}`
      : `Ollama returned HTTP ${response.status}.`,
    response.status,
  );
}

export async function ollamaChat(opts: ChatOptions): Promise<ChatResponse> {
  const base = normalizeHost(opts.host);
  let response: Response;
  try {
    response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: opts.stream ?? false,
        format: opts.format,
        options: opts.options,
        keep_alive: opts.keep_alive,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new OllamaClientError(
      'offline',
      'Cannot reach Ollama. Make sure it is running and the host URL is correct.',
    );
  }

  if (!response.ok) await classifyFailedResponse(response);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new OllamaClientError('parse', 'Ollama returned invalid JSON from /api/chat.');
  }

  const message = (body as { message?: ChatResponseMessage }).message;
  if (!message || typeof message.content !== 'string') {
    throw new OllamaClientError('parse', 'Unexpected /api/chat response shape.');
  }

  return { message, done: true };
}

export async function listModels(host: string): Promise<ConnectionResult> {
  return testOllamaConnection(host);
}
