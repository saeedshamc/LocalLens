import { OllamaClientError } from './client';

export interface EmbedOptions {
  host: string;
  model: string;
  input: string | string[];
  signal?: AbortSignal;
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\/$/, '');
}

export async function ollamaEmbed(opts: EmbedOptions): Promise<number[][]> {
  const base = normalizeHost(opts.host);
  let response: Response;
  try {
    response = await fetch(`${base}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.model,
        input: opts.input,
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

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new OllamaClientError('parse', 'Ollama returned invalid JSON from /api/embed.');
  }

  const embeddings = (body as { embeddings?: unknown }).embeddings;
  if (
    !Array.isArray(embeddings) ||
    !embeddings.every(
      (row) => Array.isArray(row) && row.every((n) => typeof n === 'number'),
    )
  ) {
    throw new OllamaClientError('parse', 'Unexpected /api/embed response shape.');
  }

  return embeddings as number[][];
}
