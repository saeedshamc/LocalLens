import type { ChatMessage } from '../translate/prompts';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuildChatPromptInput {
  systemPrompt: string;
  pageTitle: string;
  pageUrl: string;
  pageText: string;
  elementContext?: string;
  question: string;
  recentMessages?: ChatTurn[];
  historyTurns?: number;
}

export function buildChatMessages(input: BuildChatPromptInput): ChatMessage[] {
  const grounding = [
    input.systemPrompt.trim(),
    '',
    'You must answer only from the provided page content (and optional selected element).',
    'If the answer is not on the page, say clearly that it is not on the page.',
    'Reply in the same language the user used for their question.',
  ].join('\n');

  const contextParts = [
    `Page title: ${input.pageTitle || '(none)'}`,
    `Page URL: ${input.pageUrl}`,
    '',
    'Page content:',
    input.pageText || '(empty)',
  ];

  if (input.elementContext?.trim()) {
    contextParts.push('', 'Selected element context:', input.elementContext.trim());
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: grounding },
    { role: 'user', content: contextParts.join('\n') },
  ];

  const turns = Math.max(0, input.historyTurns ?? 0);
  if (turns > 0 && input.recentMessages?.length) {
    const slice = input.recentMessages.slice(-turns);
    for (const turn of slice) {
      messages.push({ role: turn.role, content: turn.content });
    }
  }

  messages.push({ role: 'user', content: input.question });
  return messages;
}
