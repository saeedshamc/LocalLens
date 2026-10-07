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

  it('appends recent turns before the new question', () => {
    const messages = buildChatMessages({
      systemPrompt: 'BASE',
      pageTitle: 'Title',
      pageUrl: 'https://example.com',
      pageText: 'Body',
      question: 'Follow-up?',
      historyTurns: 4,
      recentMessages: [
        { role: 'user', content: 'First?' },
        { role: 'assistant', content: 'Answer' },
      ],
    });
    expect(messages.map((m) => m.content)).toEqual([
      expect.stringContaining('BASE'),
      expect.stringContaining('Body'),
      'First?',
      'Answer',
      'Follow-up?',
    ]);
  });
});
