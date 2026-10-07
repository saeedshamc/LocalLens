import { translationCacheKey } from '../utils/hash';

const DB_NAME = 'locallens';
const DB_VERSION = 1;
const STORE = 'translations';

export interface TranslationCacheEntry {
  key: string;
  text: string;
  translation: string;
  model: string;
  targetLang: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function getCachedTranslation(
  text: string,
  model: string,
  targetLang: string,
): Promise<string | null> {
  const key = translationCacheKey(text, model, targetLang);
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const entry = await idbRequest(store.get(key) as IDBRequest<TranslationCacheEntry | undefined>);
    return entry?.translation ?? null;
  } finally {
    db.close();
  }
}

export async function setCachedTranslation(
  text: string,
  translation: string,
  model: string,
  targetLang: string,
): Promise<void> {
  const entry: TranslationCacheEntry = {
    key: translationCacheKey(text, model, targetLang),
    text,
    translation,
    model,
    targetLang,
    createdAt: Date.now(),
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    await idbRequest(store.put(entry));
  } finally {
    db.close();
  }
}

export async function getCachedTranslations(
  texts: string[],
  model: string,
  targetLang: string,
): Promise<(string | null)[]> {
  return Promise.all(texts.map((text) => getCachedTranslation(text, model, targetLang)));
}
