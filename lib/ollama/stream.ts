import type { ChatMessage } from '../translate/prompts';
import { OllamaClientError } from './client';

export interface StreamChatOptions {
  host: string;
  model: string;
  messages: ChatMessage[];
  options?: {
    temperature?: number;
    num_ctx?: number;
  };
  keep_alive?: string;
  signal?: AbortSignal;
  onToken: (token: string) => void;
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\/$/, '');
}

/**
 * Stream NDJSON tokens from Ollama POST /api/chat (stream: true).
 */
export async function streamOllamaChat(opts: StreamChatOptions): Promise<string> {
  const base = normalizeHost(opts.host);
  let response: Response;
  try {
    response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
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

  if (response.status === 403) {
    throw new OllamaClientError(
      'cors',
      'Ollama rejected the request (HTTP 403). Set OLLAMA_ORIGINS for this extension and restart Ollama.',
      403,
    );
  }

  if (!response.ok) {
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

  if (!response.body) {
    throw new OllamaClientError('parse', 'Ollama response had no body to stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed) as unknown;
      } catch {
        continue;
      }
      const content = (parsed as { message?: { content?: string } }).message?.content;
      if (typeof content === 'string' && content.length > 0) {
        full += content;
        opts.onToken(content);
      }
    }
  }

  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim()) as { message?: { content?: string } };
      const content = parsed.message?.content;
      if (typeof content === 'string' && content.length > 0) {
        full += content;
        opts.onToken(content);
      }
    } catch {
      // ignore trailing partial
    }
  }

  return full;
}
