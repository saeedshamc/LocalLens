export type ParseTranslationsResult =
  | { ok: true; translations: string[] }
  | { ok: false; reason: string };

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error('not json');
  }
}

/** Parse a model response and ensure translation count matches expectedLength. */
export function parseTranslations(
  raw: string | unknown,
  expectedLength: number,
): ParseTranslationsResult {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = extractJsonObject(raw);
    } catch {
      return { ok: false, reason: 'Response was not valid JSON.' };
    }
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, reason: 'Response was not an object.' };
  }

  const translations = (data as { translations?: unknown }).translations;
  if (!Array.isArray(translations)) {
    return { ok: false, reason: 'Missing translations array.' };
  }

  if (translations.length !== expectedLength) {
    return {
      ok: false,
      reason: `Expected ${expectedLength} translations, got ${translations.length}.`,
    };
  }

  if (!translations.every((item) => typeof item === 'string')) {
    return { ok: false, reason: 'All translations must be strings.' };
  }

  return { ok: true, translations: translations as string[] };
}
