export interface TranslatePromptInput {
  texts: string[];
  targetLanguage: string;
  systemPrompt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildTranslateMessages(input: TranslatePromptInput): ChatMessage[] {
  const list = input.texts.map((text, i) => `${i + 1}. ${text}`).join('\n');
  const user = [
    `Target language: ${input.targetLanguage}`,
    `Translate the following ${input.texts.length} item(s). Return exactly ${input.texts.length} translation(s) in the same order.`,
    '',
    list,
  ].join('\n');

  return [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: user },
  ];
}

export const TRANSLATION_FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['translations'],
} as const;
