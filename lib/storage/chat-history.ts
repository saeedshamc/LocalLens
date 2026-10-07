import { STORES, idbRequest, openLocalLensDb } from './db';

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ChatThread {
  key: string;
  tabId: number;
  url: string;
  messages: ChatHistoryMessage[];
  updatedAt: number;
}

function threadKey(tabId: number, url: string): string {
  return `${tabId}::${url}`;
}

export async function getChatThread(
  tabId: number,
  url: string,
): Promise<ChatThread | null> {
  const key = threadKey(tabId, url);
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.chatHistory, 'readonly');
    const entry = await idbRequest(
      tx.objectStore(STORES.chatHistory).get(key) as IDBRequest<ChatThread | undefined>,
    );
    return entry ?? null;
  } finally {
    db.close();
  }
}

export async function saveChatThread(
  tabId: number,
  url: string,
  messages: ChatHistoryMessage[],
): Promise<ChatThread> {
  const thread: ChatThread = {
    key: threadKey(tabId, url),
    tabId,
    url,
    messages,
    updatedAt: Date.now(),
  };
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.chatHistory, 'readwrite');
    await idbRequest(tx.objectStore(STORES.chatHistory).put(thread));
    return thread;
  } finally {
    db.close();
  }
}

export async function clearChatThread(tabId: number, url: string): Promise<void> {
  const key = threadKey(tabId, url);
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.chatHistory, 'readwrite');
    await idbRequest(tx.objectStore(STORES.chatHistory).delete(key));
  } finally {
    db.close();
  }
}
