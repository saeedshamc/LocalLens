import type { PickerAction } from '../picker/menu';
import type { UiLanguage } from '../settings/types';
import { en, type MessageKey } from './en';
import { fa } from './fa';

const catalogs: Record<UiLanguage, Record<MessageKey, string>> = {
  en,
  fa,
};

export function t(
  lang: UiLanguage,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = catalogs[lang][key] ?? en[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

const ACTION_KEYS: Record<PickerAction, MessageKey> = {
  translate: 'actionTranslate',
  explain: 'actionExplain',
  summarize: 'actionSummarize',
  ask: 'actionAsk',
};

export function pickerActionLabel(lang: UiLanguage, action: PickerAction): string {
  return t(lang, ACTION_KEYS[action]);
}

export function pickerActionLabels(
  lang: UiLanguage,
): Record<PickerAction, string> {
  return {
    translate: t(lang, 'actionTranslate'),
    explain: t(lang, 'actionExplain'),
    summarize: t(lang, 'actionSummarize'),
    ask: t(lang, 'actionAsk'),
  };
}

export type { MessageKey };
export { en, fa };
