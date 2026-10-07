import type { ConnectionResult, OllamaTagsResponse } from './types';

const CORS_MESSAGE =
  'Ollama rejected the request (HTTP 403). Set OLLAMA_ORIGINS to allow this extension, then restart Ollama. See the Help page for the exact command.';

const OFFLINE_MESSAGE =
  'Cannot reach Ollama. Make sure Ollama is running and the host URL is correct (default: http://localhost:11434).';

function normalizeHost(host: string): string {
  return host.trim().replace(/\/$/, '');
}

function isTagsResponse(value: unknown): value is OllamaTagsResponse {
  if (typeof value !== 'object' || value === null) return false;
  const models = (value as { models?: unknown }).models;
  return Array.isArray(models);
}

/**
 * Probe Ollama via GET /api/tags and classify failures for actionable UI.
 * 403 → CORS / OLLAMA_ORIGINS; network error → offline; other HTTP → http.
 */
export async function testOllamaConnection(
  host: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ConnectionResult> {
  const base = normalizeHost(host);
  if (!base) {
    return { ok: false, kind: 'offline', message: OFFLINE_MESSAGE };
  }

  let response: Response;
  try {
    response = await fetchImpl(`${base}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    return { ok: false, kind: 'offline', message: OFFLINE_MESSAGE };
  }

  if (response.status === 403) {
    return { ok: false, kind: 'cors', message: CORS_MESSAGE };
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 200);
    } catch {
      detail = '';
    }
    return {
      ok: false,
      kind: 'http',
      status: response.status,
      message: detail
        ? `Ollama returned HTTP ${response.status}: ${detail}`
        : `Ollama returned HTTP ${response.status}.`,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      kind: 'http',
      status: response.status,
      message: 'Ollama returned an invalid JSON response from /api/tags.',
    };
  }

  if (!isTagsResponse(body)) {
    return {
      ok: false,
      kind: 'http',
      status: response.status,
      message: 'Unexpected /api/tags payload from Ollama.',
    };
  }

  const models = body.models
    .map((m) => m.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .sort((a, b) => a.localeCompare(b));

  return { ok: true, models };
}

export function buildOllamaOriginsCommand(
  extensionId: string,
  os: 'windows' | 'linux' | 'macos',
): string {
  const origin = `chrome-extension://${extensionId}`;
  switch (os) {
    case 'windows':
      return `setx OLLAMA_ORIGINS "${origin}"`;
    case 'linux':
      return [
        'sudo mkdir -p /etc/systemd/system/ollama.service.d',
        `echo -e '[Service]\\nEnvironment="OLLAMA_ORIGINS=${origin}"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf`,
        'sudo systemctl daemon-reload',
        'sudo systemctl restart ollama',
      ].join('\n');
    case 'macos':
      return [
        `launchctl setenv OLLAMA_ORIGINS "${origin}"`,
        '# Then fully quit and reopen the Ollama app (or restart the machine).',
      ].join('\n');
  }
}
