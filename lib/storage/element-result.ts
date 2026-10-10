const KEY_PREFIX = 'locallens.elementResult.';
/** @deprecated legacy single-slot key; migrated on read */
const LEGACY_KEY = 'locallens.lastElementResult';

export interface ElementActionResult {
  action: 'translate' | 'explain' | 'summarize' | 'read' | 'translateRead';
  result?: string;
  error?: string;
  text: string;
  url: string;
  tabId: number;
  createdAt: number;
  /** True when TTS was started for this result. */
  spoken?: boolean;
}

function keyForTab(tabId: number): string {
  return `${KEY_PREFIX}${tabId}`;
}

export async function setElementActionResult(
  value: ElementActionResult,
): Promise<void> {
  await chrome.storage.session.set({ [keyForTab(value.tabId)]: value });
  await chrome.storage.session.remove(LEGACY_KEY);
}

export async function getElementActionResult(
  tabId: number,
): Promise<ElementActionResult | null> {
  const stored = await chrome.storage.session.get([keyForTab(tabId), LEGACY_KEY]);
  const scoped = stored[keyForTab(tabId)];
  if (scoped && typeof scoped === 'object') {
    const record = scoped as ElementActionResult;
    if (record.tabId === tabId) return record;
  }
  const legacy = stored[LEGACY_KEY];
  if (legacy && typeof legacy === 'object') {
    const record = legacy as ElementActionResult;
    if (record.tabId === tabId) return record;
  }
  return null;
}

export async function clearElementActionResult(tabId: number): Promise<void> {
  await chrome.storage.session.remove([keyForTab(tabId), LEGACY_KEY]);
}

export function isElementResultStorageKey(key: string, tabId: number): boolean {
  return key === keyForTab(tabId) || key === LEGACY_KEY;
}

export { KEY_PREFIX as ELEMENT_RESULT_KEY_PREFIX, LEGACY_KEY as ELEMENT_RESULT_KEY };
