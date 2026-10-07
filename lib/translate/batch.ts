export interface BatchOptions {
  /** Soft character budget per batch (sum of item lengths). */
  maxChars?: number;
  /** Soft item count budget per batch. */
  maxItems?: number;
}

const DEFAULT_MAX_CHARS = 1800;
const DEFAULT_MAX_ITEMS = 24;

/**
 * Split texts into batches under character and item budgets.
 * Oversized single items become their own batch.
 */
export function batchTexts(
  texts: string[],
  options: BatchOptions = {},
): string[][] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;

  const flush = () => {
    if (current.length === 0) return;
    batches.push(current);
    current = [];
    chars = 0;
  };

  for (const text of texts) {
    const len = text.length;
    const wouldExceed =
      current.length > 0 &&
      (current.length >= maxItems || chars + len > maxChars);

    if (wouldExceed) flush();

    current.push(text);
    chars += len;

    if (len >= maxChars) flush();
  }

  flush();
  return batches;
}
