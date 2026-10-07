export type UiLanguage = 'en' | 'fa';

export type TranslationMode = 'replace' | 'overlay';

export interface Settings {
  ollamaHost: string;
  translateModel: string;
  chatModel: string;
  embeddingModel: string;
  explainModel: string;
  targetLanguage: string;
  temperature: number;
  numCtx: number;
  keepAlive: string;
  systemPromptTranslate: string;
  systemPromptChat: string;
  uiLanguage: UiLanguage;
  chatHistoryTurns: number;
  translationMode: TranslationMode;
  /** Use system TTS (chrome.tts) for read-aloud. */
  ttsEnabled: boolean;
  /** Speech rate 0.5–2. */
  ttsRate: number;
  /** Auto-speak assistant chat replies when streaming finishes. */
  autoSpeakReplies: boolean;
  /** BCP-47 or short code for STT; empty = derive from UI language. */
  sttLang: string;
}

export type SettingsPatch = Partial<Settings>;
