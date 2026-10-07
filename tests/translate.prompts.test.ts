import { describe, expect, it } from 'vitest';
import { buildTranslateMessages } from '../lib/translate/prompts';

describe('buildTranslateMessages', () => {
  it('includes system prompt and numbered items', () => {
    const messages = buildTranslateMessages({
      texts: ['Hello', 'World'],
      targetLanguage: 'fa',
      systemPrompt: 'SYS',
    });
    expect(messages[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(messages[1]?.content).toContain('Target language: fa');
    expect(messages[1]?.content).toContain('1. Hello');
    expect(messages[1]?.content).toContain('2. World');
    expect(messages[1]?.content).toContain('exactly 2 translation');
  });
});
