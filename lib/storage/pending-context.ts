const KEY = 'locallens.pendingElementContext';

export interface PendingElementContext {
  text: string;
  url: string;
  tabId: number;
  createdAt: number;
}

export async function setPendingElementContext(
  value: PendingElementContext,
): Promise<void> {
  await chrome.storage.session.set({ [KEY]: value });
}

export async function getPendingElementContext(): Promise<PendingElementContext | null> {
  const result = await chrome.storage.session.get(KEY);
  const value = result[KEY];
  if (!value || typeof value !== 'object') return null;
  const record = value as PendingElementContext;
  if (typeof record.text !== 'string') return null;
  return record;
}

export async function clearPendingElementContext(): Promise<void> {
  await chrome.storage.session.remove(KEY);
}

export { KEY as PENDING_ELEMENT_CONTEXT_KEY };
