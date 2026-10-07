export interface TextChunk {
  index: number;
  text: string;
  start: number;
  end: number;
}

export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
}

const DEFAULT_MAX = 900;
const DEFAULT_OVERLAP = 120;

/**
 * Split text into overlapping character windows on paragraph/sentence boundaries
 * when possible.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX;
  const overlap = Math.min(options.overlap ?? DEFAULT_OVERLAP, Math.floor(maxChars / 2));
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) {
    return [{ index: 0, text: normalized, start: 0, end: normalized.length }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf('。'),
      );
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt + 1;
      }
    }

    const slice = normalized.slice(start, end).trim();
    if (slice) {
      chunks.push({ index, text: slice, start, end });
      index += 1;
    }

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
