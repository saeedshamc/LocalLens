import { describe, expect, it } from 'vitest';
import { parseTranslations } from '../lib/translate/parse';

describe('parseTranslations', () => {
  it('accepts matching JSON', () => {
    const result = parseTranslations(
      JSON.stringify({ translations: ['one', 'two'] }),
      2,
    );
    expect(result).toEqual({ ok: true, translations: ['one', 'two'] });
  });

  it('rejects length mismatches', () => {
    const result = parseTranslations(JSON.stringify({ translations: ['only'] }), 2);
    expect(result.ok).toBe(false);
  });

  it('extracts JSON embedded in prose', () => {
    const result = parseTranslations('Sure: {"translations":["a"]}', 1);
    expect(result).toEqual({ ok: true, translations: ['a'] });
  });
});
