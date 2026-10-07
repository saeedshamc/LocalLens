import { ollamaEmbed } from '../ollama/embed';
import type { Settings } from '../settings/types';
import {
  contentHashForText,
  getEmbeddingCache,
  setEmbeddingCache,
} from '../storage/embedding-cache';
import { chunkText } from './chunk';
import { rankByCosine } from './cosine';

export interface RetrieveOptions {
  url: string;
  text: string;
  question: string;
  settings: Settings;
  topK?: number;
  longPageChars?: number;
  signal?: AbortSignal;
}

export interface RetrieveResult {
  contextText: string;
  usedRetrieval: boolean;
  chunkCount: number;
  selectedCount: number;
}

const DEFAULT_LONG_PAGE = 6000;
const DEFAULT_TOP_K = 6;
const EMBED_BATCH = 16;

async function embedAll(
  host: string,
  model: string,
  texts: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const vectors = await ollamaEmbed({ host, model, input: batch, signal });
    if (vectors.length !== batch.length) {
      throw new Error('Embedding count mismatch from Ollama.');
    }
    out.push(...vectors);
  }
  return out;
}

/**
 * For short pages return full text. For long pages, embed chunks, rank by
 * cosine similarity to the question, and return the top-k chunks.
 */
export async function retrievePageContext(
  options: RetrieveOptions,
): Promise<RetrieveResult> {
  const longPageChars = options.longPageChars ?? DEFAULT_LONG_PAGE;
  const topK = options.topK ?? DEFAULT_TOP_K;
  const text = options.text.trim();

  if (!text) {
    return { contextText: '', usedRetrieval: false, chunkCount: 0, selectedCount: 0 };
  }

  if (text.length <= longPageChars) {
    return {
      contextText: text,
      usedRetrieval: false,
      chunkCount: 1,
      selectedCount: 1,
    };
  }

  const model = options.settings.embeddingModel || 'bge-m3';
  const contentHash = contentHashForText(text);
  let cached = await getEmbeddingCache(options.url, contentHash, model);

  if (!cached) {
    const chunks = chunkText(text);
    const embeddings = await embedAll(
      options.settings.ollamaHost,
      model,
      chunks.map((c) => c.text),
      options.signal,
    );
    cached = {
      key: '',
      url: options.url,
      contentHash,
      model,
      chunks: chunks.map((c, i) => ({
        text: c.text,
        embedding: embeddings[i]!,
      })),
      createdAt: Date.now(),
    };
    await setEmbeddingCache({
      url: cached.url,
      contentHash: cached.contentHash,
      model: cached.model,
      chunks: cached.chunks,
    });
  }

  const [queryEmbedding] = await ollamaEmbed({
    host: options.settings.ollamaHost,
    model,
    input: options.question,
    signal: options.signal,
  });

  const ranked = rankByCosine(queryEmbedding ?? [], cached.chunks, topK);
  const selected = ranked
    .map((r) => r.item.text)
    .filter((t) => t.trim().length > 0);

  const contextText = [
    '[Retrieved the most relevant sections of a long page.]',
    '',
    ...selected.map((t, i) => `### Passage ${i + 1}\n${t}`),
  ].join('\n\n');

  return {
    contextText,
    usedRetrieval: true,
    chunkCount: cached.chunks.length,
    selectedCount: selected.length,
  };
}
