import { translationCacheKey } from '../utils/hash';
import { STORES, idbRequest, openLocalLensDb } from './db';

export interface TranslationCacheEntry {
  key: string;
  text: string;
  translation: string;
  model: string;
  targetLang: string;
  createdAt: number;
}

export async function getCachedTranslation(
  text: string,
  model: string,
  targetLang: string,
): Promise<string | null> {
  const key = translationCacheKey(text, model, targetLang);
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.translations, 'readonly');
    const store = tx.objectStore(STORES.translations);
    const entry = await idbRequest(
      store.get(key) as IDBRequest<TranslationCacheEntry | undefined>,
    );
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
  const db = await openLocalLensDb();
  try {
    const tx = db.transaction(STORES.translations, 'readwrite');
    const store = tx.objectStore(STORES.translations);
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
