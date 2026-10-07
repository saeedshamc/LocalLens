import type { Settings } from './types';

export const DEFAULT_SYSTEM_PROMPT_TRANSLATE = `You are a professional translator. Translate each item by meaning into the target language — natural and fluent, not word-for-word.

Rules:
- Preserve numbers, code, URLs, email addresses, and proper names unless a well-known localized form exists.
- Keep the same number of items in the same order.
- Do not add explanations or commentary.
- Return only the structured translations as requested.`;

export const DEFAULT_SYSTEM_PROMPT_CHAT = `You answer questions about the provided page content only.

Rules:
- Base every answer strictly on the page content given to you.
- If the answer is not on the page, say so clearly.
- Reply in the same language the user used for their question.
- Be concise and accurate. Do not invent facts.`;

export const DEFAULT_SETTINGS: Settings = {
  ollamaHost: 'http://localhost:11434',
  translateModel: '',
  chatModel: '',
  embeddingModel: 'bge-m3',
  explainModel: '',
  targetLanguage: 'fa',
  temperature: 0.2,
  numCtx: 4096,
  keepAlive: '5m',
  systemPromptTranslate: DEFAULT_SYSTEM_PROMPT_TRANSLATE,
  systemPromptChat: DEFAULT_SYSTEM_PROMPT_CHAT,
  uiLanguage: 'en',
  chatHistoryTurns: 6,
  translationMode: 'replace',
  ttsEnabled: true,
  ttsRate: 1,
  autoSpeakReplies: false,
  sttLang: '',
};
