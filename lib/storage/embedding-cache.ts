import { hashString } from '../utils/hash';
import { STORES, idbRequest, openLocalLensDb } from './db';

export interface EmbeddingChunkRecord {
  text: string;
  embedding: number[];
}

export interface EmbeddingCacheEntry {
  key: string;
  url: string;
  contentHash: string;
  model: string;
  chunks: EmbeddingChunkRecord[];
  createdAt: number;
}

export function embeddingCacheKey(
  url: string,
  contentHash: string,
  model: string,
): string {
  return hashString(`${url}\0${contentHash}\0${model}`);
}

export function contentHashForText(text: string): string {
  return hashString(text);
}

export async function getEmbeddingCache(
  url: string,
  contentHash: string,
  model: string,
): Promise<EmbeddingCacheEntry | null> {
  const key = embeddingCacheKey(url, contentHash, model);
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.embeddings, 'readonly');
    const entry = await idbRequest(
      tx.objectStore(STORES.embeddings).get(key) as IDBRequest<
        EmbeddingCacheEntry | undefined
      >,
    );
    return entry ?? null;
  } finally {
    db.close();
  }
}

export async function setEmbeddingCache(
  entry: Omit<EmbeddingCacheEntry, 'key' | 'createdAt'>,
): Promise<void> {
  const record: EmbeddingCacheEntry = {
    ...entry,
    key: embeddingCacheKey(entry.url, entry.contentHash, entry.model),
    createdAt: Date.now(),
  };
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.embeddings, 'readwrite');
    await idbRequest(tx.objectStore(STORES.embeddings).put(record));
  } finally {
    db.close();
  }
}
