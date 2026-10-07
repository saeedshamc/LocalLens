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

export const RESTRICTED_PAGE_MESSAGE =
  'LocalLens cannot run on this page (browser internal pages and the Chrome Web Store are blocked). Open a normal http(s) page instead.';
