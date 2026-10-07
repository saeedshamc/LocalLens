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

export type { MessageKey };
export { en, fa };
