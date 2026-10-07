import { t } from '../i18n';
import type { UiLanguage } from '../settings/types';

/** Pages where content scripts cannot run or should not translate. */
export function isRestrictedUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'chrome:' || parsed.protocol === 'chrome-extension:') {
      return true;
    }
    if (parsed.protocol === 'edge:' || parsed.protocol === 'about:') return true;
    if (parsed.protocol === 'devtools:') return true;
    if (
      parsed.hostname === 'chrome.google.com' &&
      parsed.pathname.startsWith('/webstore')
    ) {
      return true;
    }
    if (parsed.hostname === 'chromewebstore.google.com') return true;
    return false;
  } catch {
    return true;
  }
}

export function restrictedPageMessage(lang: UiLanguage = 'en'): string {
  return t(lang, 'restrictedPage');
}

/** @deprecated Prefer restrictedPageMessage(lang) for localized UI. */
export const RESTRICTED_PAGE_MESSAGE = restrictedPageMessage('en');
