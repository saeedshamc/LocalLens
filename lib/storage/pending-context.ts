const KEY_PREFIX = 'locallens.pendingElement.';
/** @deprecated legacy single-slot key; migrated on read */
const LEGACY_KEY = 'locallens.pendingElementContext';

export interface PendingElementContext {
  text: string;
  url: string;
  tabId: number;
  createdAt: number;
}

function keyForTab(tabId: number): string {
  return `${KEY_PREFIX}${tabId}`;
}

export async function setPendingElementContext(
  value: PendingElementContext,
): Promise<void> {
  await chrome.storage.session.set({ [keyForTab(value.tabId)]: value });
  await chrome.storage.session.remove(LEGACY_KEY);
}

export async function getPendingElementContext(
  tabId: number,
): Promise<PendingElementContext | null> {
  const result = await chrome.storage.session.get([
    keyForTab(tabId),
    LEGACY_KEY,
  ]);
  const scoped = result[keyForTab(tabId)];
  if (scoped && typeof scoped === 'object') {
    const record = scoped as PendingElementContext;
    if (typeof record.text === 'string' && record.tabId === tabId) return record;
  }
  const legacy = result[LEGACY_KEY];
  if (legacy && typeof legacy === 'object') {
    const record = legacy as PendingElementContext;
    if (typeof record.text === 'string' && record.tabId === tabId) return record;
  }
  return null;
}

export async function clearPendingElementContext(tabId: number): Promise<void> {
  await chrome.storage.session.remove([keyForTab(tabId), LEGACY_KEY]);
}

export function isPendingContextStorageKey(key: string, tabId: number): boolean {
  return key === keyForTab(tabId) || key === LEGACY_KEY;
}

export {
  KEY_PREFIX as PENDING_ELEMENT_CONTEXT_KEY_PREFIX,
  LEGACY_KEY as PENDING_ELEMENT_CONTEXT_KEY,
};
