import type { MessageKey } from '../i18n';

export interface TargetLanguageOption {
  value: string;
  labelKey: MessageKey;
}

/** Supported translation target languages (shared by popup + options). */
export const TARGET_LANGUAGE_OPTIONS: readonly TargetLanguageOption[] = [
  { value: 'fa', labelKey: 'targetLangFa' },
  { value: 'en', labelKey: 'targetLangEn' },
  { value: 'ar', labelKey: 'targetLangAr' },
  { value: 'de', labelKey: 'targetLangDe' },
  { value: 'es', labelKey: 'targetLangEs' },
  { value: 'fr', labelKey: 'targetLangFr' },
  { value: 'tr', labelKey: 'targetLangTr' },
  { value: 'zh', labelKey: 'targetLangZh' },
] as const;

export function isKnownTargetLanguage(code: string): boolean {
  return TARGET_LANGUAGE_OPTIONS.some((opt) => opt.value === code);
}
