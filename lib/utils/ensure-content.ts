import type { ContentResponse } from '../messaging/types';
import { isRestrictedUrl } from './restricted';

const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';

async function pingContent(tabId: number): Promise<boolean> {
  try {
    const res = (await chrome.tabs.sendMessage(tabId, {
      type: 'GET_STATUS',
    })) as ContentResponse;
    return Boolean(res && 'ok' in res);
  } catch {
    return false;
  }
}

/**
 * Ensure the content script is running on the tab.
 * After extension reload/update, open tabs lack the script until navigate —
 * inject programmatically when the user invokes LocalLens.
 */
export async function ensureContentScript(
  tabId: number,
  url?: string | null,
): Promise<{ ok: true } | { ok: false; kind: 'restricted' | 'inject' }> {
  if (isRestrictedUrl(url)) {
    return { ok: false, kind: 'restricted' };
  }

  if (await pingContent(tabId)) {
    return { ok: true };
  }

  if (!chrome.scripting?.executeScript) {
    return { ok: false, kind: 'inject' };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE],
    });
  } catch {
    return { ok: false, kind: 'inject' };
  }

  // Give the script a tick to register its message listener.
  await new Promise((r) => setTimeout(r, 50));

  if (await pingContent(tabId)) {
    return { ok: true };
  }
  return { ok: false, kind: 'inject' };
}
