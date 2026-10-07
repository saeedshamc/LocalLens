const KEY = 'locallens.lastElementResult';

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

export async function setElementActionResult(
  value: ElementActionResult,
): Promise<void> {
  await chrome.storage.session.set({ [KEY]: value });
}

export async function getElementActionResult(): Promise<ElementActionResult | null> {
  const stored = await chrome.storage.session.get(KEY);
  const value = stored[KEY];
  if (!value || typeof value !== 'object') return null;
  return value as ElementActionResult;
}

export async function clearElementActionResult(): Promise<void> {
  await chrome.storage.session.remove(KEY);
}

export { KEY as ELEMENT_RESULT_KEY };
