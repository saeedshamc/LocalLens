import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../lib/settings/defaults';
import { normalizeSettings } from '../lib/settings/storage';

describe('normalizeSettings', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('strips trailing slash from host', () => {
    const settings = normalizeSettings({ ollamaHost: 'http://127.0.0.1:11434/' });
    expect(settings.ollamaHost).toBe('http://127.0.0.1:11434');
  });

  it('clamps numCtx to at least 256', () => {
    expect(normalizeSettings({ numCtx: 10 }).numCtx).toBe(256);
  });

  it('accepts fa as ui language and falls back otherwise', () => {
    expect(normalizeSettings({ uiLanguage: 'fa' }).uiLanguage).toBe('fa');
    expect(normalizeSettings({ uiLanguage: 'de' }).uiLanguage).toBe('en');
  });
});
