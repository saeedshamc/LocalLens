import { describe, expect, it } from 'vitest';
import { chunkText } from '../lib/retrieve/chunk';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkText('hello world', { maxChars: 100 })).toEqual([
      { index: 0, text: 'hello world', start: 0, end: 11 },
    ]);
  });

  it('splits long text with overlap', () => {
    const text = 'AAAA\n\n' + 'B'.repeat(40) + '\n\n' + 'C'.repeat(40);
    const chunks = chunkText(text, { maxChars: 50, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.text.length).toBeLessThanOrEqual(50);
  });

  it('returns empty for blank input', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});
