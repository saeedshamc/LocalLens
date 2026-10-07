import { STORES, idbRequest, openLocalLensDb } from './db';

export interface CacheSizes {
  translationsBytes: number;
  embeddingsBytes: number;
  chatHistoryBytes: number;
  totalBytes: number;
  translationsCount: number;
  embeddingsCount: number;
  chatHistoryCount: number;
}

function byteLengthOf(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

async function measureStore(storeName: string): Promise<{ bytes: number; count: number }> {
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const all = await idbRequest(store.getAll());
    let bytes = 0;
    for (const item of all) bytes += byteLengthOf(item);
    return { bytes, count: all.length };
  } finally {
    db.close();
  }
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    await idbRequest(tx.objectStore(storeName).clear());
  } finally {
    db.close();
  }
}

export async function estimateCacheSize(): Promise<CacheSizes> {
  const [translations, embeddings, chatHistory] = await Promise.all([
    measureStore(STORES.translations),
    measureStore(STORES.embeddings),
    measureStore(STORES.chatHistory),
  ]);
  return {
    translationsBytes: translations.bytes,
    embeddingsBytes: embeddings.bytes,
    chatHistoryBytes: chatHistory.bytes,
    totalBytes:
      translations.bytes + embeddings.bytes + chatHistory.bytes,
    translationsCount: translations.count,
    embeddingsCount: embeddings.count,
    chatHistoryCount: chatHistory.count,
  };
}

export async function clearTranslationsCache(): Promise<void> {
  await clearStore(STORES.translations);
}

export async function clearEmbeddingsCache(): Promise<void> {
  await clearStore(STORES.embeddings);
}

export async function clearChatHistoryCache(): Promise<void> {
  await clearStore(STORES.chatHistory);
}

export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    clearTranslationsCache(),
    clearEmbeddingsCache(),
    clearChatHistoryCache(),
  ]);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
