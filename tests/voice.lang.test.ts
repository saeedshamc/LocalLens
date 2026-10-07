import { describe, expect, it } from 'vitest';
import { speechLocaleForRead, toSpeechLocale } from '../lib/voice/lang';

describe('toSpeechLocale', () => {
  it('maps common language codes', () => {
    expect(toSpeechLocale('fa')).toBe('fa-IR');
    expect(toSpeechLocale('en')).toBe('en-US');
    expect(toSpeechLocale('zh')).toBe('zh-CN');
  });

  it('handles region tags', () => {
    expect(toSpeechLocale('fa-IR')).toBe('fa-IR');
  });
});

describe('speechLocaleForRead', () => {
  it('prefers target language when reading translations', () => {
    expect(
      speechLocaleForRead({
        preferTarget: true,
        targetLanguage: 'fa',
        uiLanguage: 'en',
      }),
    ).toBe('fa-IR');
  });

  it('uses UI language for original-text read', () => {
    expect(
      speechLocaleForRead({
        preferTarget: false,
        targetLanguage: 'fa',
        uiLanguage: 'en',
      }),
    ).toBe('en-US');
  });
});
