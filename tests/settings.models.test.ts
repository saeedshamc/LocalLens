import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../lib/settings/defaults';
import { resolveChatModel, resolveTranslateModel } from '../lib/settings/models';

describe('resolveTranslateModel', () => {
  it('uses translate model when set', () => {
    expect(
      resolveTranslateModel({
        ...DEFAULT_SETTINGS,
        translateModel: 'llama-t',
        chatModel: 'llama-c',
      }),
    ).toBe('llama-t');
  });

  it('falls back to chat then explain', () => {
    expect(
      resolveTranslateModel({
        ...DEFAULT_SETTINGS,
        translateModel: '',
        chatModel: 'llama-c',
      }),
    ).toBe('llama-c');
    expect(
      resolveTranslateModel({
        ...DEFAULT_SETTINGS,
        translateModel: '',
        chatModel: '',
        explainModel: 'llama-e',
      }),
    ).toBe('llama-e');
  });
});

describe('resolveChatModel', () => {
  it('falls back to translate model', () => {
    expect(
      resolveChatModel({
        ...DEFAULT_SETTINGS,
        chatModel: '',
        translateModel: 'llama-t',
      }),
    ).toBe('llama-t');
  });
});
