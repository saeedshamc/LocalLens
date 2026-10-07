import { ollamaChat, OllamaClientError } from '../ollama/client';
import {
  getCachedTranslation,
  setCachedTranslation,
} from '../storage/translation-cache';
import type { Settings } from '../settings/types';
import { batchTexts } from './batch';
import { parseTranslations } from './parse';
import { protectPlaceholders } from './placeholders';
import {
  TRANSLATION_FORMAT_SCHEMA,
  buildTranslateMessages,
} from './prompts';

export interface TranslateBatchRequest {
  texts: string[];
  settings: Settings;
  signal?: AbortSignal;
}

export interface TranslateBatchResult {
  translations: string[];
  fromCache: number;
  fromModel: number;
}

async function translateItemsOnce(
  texts: string[],
  settings: Settings,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!settings.translateModel) {
    throw new OllamaClientError(
      'http',
      'No translate model selected. Open Settings and choose a model.',
    );
  }

  const protectedItems = texts.map((text) => protectPlaceholders(text));
  const messages = buildTranslateMessages({
    texts: protectedItems.map((p) => p.masked),
    targetLanguage: settings.targetLanguage,
    systemPrompt: settings.systemPromptTranslate,
  });

  const response = await ollamaChat({
    host: settings.ollamaHost,
    model: settings.translateModel,
    messages,
    stream: false,
    format: TRANSLATION_FORMAT_SCHEMA,
    options: {
      temperature: settings.temperature,
      num_ctx: settings.numCtx,
    },
    keep_alive: settings.keepAlive,
    signal,
  });

  const parsed = parseTranslations(response.message.content, texts.length);
  if (!parsed.ok) {
    throw new OllamaClientError('parse', parsed.reason);
  }

  return parsed.translations.map((t, i) => protectedItems[i]!.restore(t));
}

async function translateSingleWithRetry(
  text: string,
  settings: Settings,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const [result] = await translateItemsOnce([text], settings, signal);
    return result ?? text;
  } catch {
    const [result] = await translateItemsOnce([text], settings, signal);
    return result ?? text;
  }
}

/**
 * Translate texts with cache lookup, batched chat calls, one batch retry on
 * length mismatch, then per-item fallback.
 */
export async function translateBatch(
  request: TranslateBatchRequest,
): Promise<TranslateBatchResult> {
  const { texts, settings, signal } = request;
  const translations = new Array<string>(texts.length);
  let fromCache = 0;
  let fromModel = 0;

  const pendingIndexes: number[] = [];

  for (let index = 0; index < texts.length; index++) {
    const text = texts[index]!;
    if (!text.trim()) {
      translations[index] = text;
      continue;
    }
    const cached = await getCachedTranslation(
      text,
      settings.translateModel,
      settings.targetLanguage,
    );
    if (cached !== null) {
      translations[index] = cached;
      fromCache += 1;
      continue;
    }
    pendingIndexes.push(index);
  }

  const pendingTexts = pendingIndexes.map((i) => texts[i]!);
  const batches = batchTexts(pendingTexts);

  let cursor = 0;
  for (const batch of batches) {
    const absoluteIndexes = pendingIndexes.slice(cursor, cursor + batch.length);
    cursor += batch.length;

    let batchResult: string[] | null = null;
    try {
      batchResult = await translateItemsOnce(batch, settings, signal);
    } catch (error) {
      if (error instanceof OllamaClientError && error.kind === 'parse') {
        try {
          batchResult = await translateItemsOnce(batch, settings, signal);
        } catch {
          batchResult = null;
        }
      } else {
        throw error;
      }
    }

    if (batchResult && batchResult.length === batch.length) {
      for (let i = 0; i < batch.length; i++) {
        const abs = absoluteIndexes[i]!;
        const original = texts[abs]!;
        const translated = batchResult[i]!;
        translations[abs] = translated;
        fromModel += 1;
        await setCachedTranslation(
          original,
          translated,
          settings.translateModel,
          settings.targetLanguage,
        );
      }
      continue;
    }

    for (let i = 0; i < batch.length; i++) {
      const abs = absoluteIndexes[i]!;
      const original = texts[abs]!;
      const translated = await translateSingleWithRetry(original, settings, signal);
      translations[abs] = translated;
      fromModel += 1;
      await setCachedTranslation(
        original,
        translated,
        settings.translateModel,
        settings.targetLanguage,
      );
    }
  }

  return {
    translations: translations.map((t, i) => t ?? texts[i]!),
    fromCache,
    fromModel,
  };
}
