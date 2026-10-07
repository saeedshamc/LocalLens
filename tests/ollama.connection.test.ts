import { describe, expect, it, vi } from 'vitest';
import {
  buildOllamaOriginsCommand,
  testOllamaConnection,
} from '../lib/ollama/connection';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('testOllamaConnection', () => {
  it('returns ok with sorted model names', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        models: [{ name: 'llama3.2' }, { name: 'bge-m3' }],
      }),
    );
    const result = await testOllamaConnection('http://localhost:11434', fetchImpl);
    expect(result).toEqual({ ok: true, models: ['bge-m3', 'llama3.2'] });
  });

  it('classifies 403 as cors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }));
    const result = await testOllamaConnection('http://localhost:11434', fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('cors');
  });

  it('classifies network failure as offline', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await testOllamaConnection('http://localhost:11434', fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('offline');
  });

  it('classifies other HTTP errors as http', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await testOllamaConnection('http://localhost:11434', fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('http');
      if (result.kind === 'http') expect(result.status).toBe(500);
    }
  });
});

describe('buildOllamaOriginsCommand', () => {
  it('builds a Windows setx command', () => {
    expect(buildOllamaOriginsCommand('abcdef', 'windows')).toContain(
      'chrome-extension://abcdef',
    );
  });

  it('builds a Linux systemd override', () => {
    const cmd = buildOllamaOriginsCommand('abcdef', 'linux');
    expect(cmd).toContain('systemd');
    expect(cmd).toContain('OLLAMA_ORIGINS=chrome-extension://abcdef');
  });

  it('builds a macOS launchctl command', () => {
    expect(buildOllamaOriginsCommand('abcdef', 'macos')).toContain(
      'launchctl setenv OLLAMA_ORIGINS',
    );
  });
});
