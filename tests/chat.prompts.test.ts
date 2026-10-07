import { describe, expect, it } from 'vitest';
import { buildChatMessages } from '../lib/chat/prompts';

describe('buildChatMessages', () => {
  it('includes grounding rules, page content, and question', () => {
    const messages = buildChatMessages({
      systemPrompt: 'BASE',
      pageTitle: 'Title',
      pageUrl: 'https://example.com',
      pageText: 'Body text',
      elementContext: 'Selected bit',
      question: 'What is this?',
    });

    expect(messages).toHaveLength(3);
    expect(messages[0]?.content).toContain('BASE');
    expect(messages[0]?.content).toContain('not on the page');
    expect(messages[1]?.content).toContain('Body text');
    expect(messages[1]?.content).toContain('Selected bit');
    expect(messages[2]?.content).toBe('What is this?');
  });
});
