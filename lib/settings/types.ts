export type UiLanguage = 'en' | 'fa';

export interface Settings {
  ollamaHost: string;
  translateModel: string;
  chatModel: string;
  embeddingModel: string;
  targetLanguage: string;
  temperature: number;
  numCtx: number;
  keepAlive: string;
  systemPromptTranslate: string;
  systemPromptChat: string;
  uiLanguage: UiLanguage;
}

export type SettingsPatch = Partial<Settings>;
