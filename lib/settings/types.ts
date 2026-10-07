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
}

export type SettingsPatch = Partial<Settings>;
