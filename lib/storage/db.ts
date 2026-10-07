const DB_NAME = 'locallens';
const DB_VERSION = 3;

export const STORES = {
  translations: 'translations',
  embeddings: 'embeddings',
  chatHistory: 'chatHistory',
} as const;

export function openLocalLensDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.translations)) {
        db.createObjectStore(STORES.translations, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.embeddings)) {
        db.createObjectStore(STORES.embeddings, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.chatHistory)) {
        db.createObjectStore(STORES.chatHistory, { keyPath: 'key' });
      }
    };
  });
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
}
