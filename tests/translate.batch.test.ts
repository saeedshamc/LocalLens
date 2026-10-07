import { describe, expect, it } from 'vitest';
import { batchTexts } from '../lib/translate/batch';

describe('batchTexts', () => {
  it('keeps small lists in one batch', () => {
    expect(batchTexts(['a', 'b', 'c'], { maxChars: 100, maxItems: 10 })).toEqual([
      ['a', 'b', 'c'],
    ]);
  });

  it('splits by maxItems', () => {
    expect(batchTexts(['a', 'b', 'c', 'd'], { maxChars: 1000, maxItems: 2 })).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('splits by maxChars', () => {
    expect(batchTexts(['abcd', 'ef', 'ghij'], { maxChars: 5, maxItems: 10 })).toEqual([
      ['abcd'],
      ['ef'],
      ['ghij'],
    ]);
  });

  it('places oversized items alone', () => {
    const long = 'x'.repeat(20);
    expect(batchTexts([long, 'a'], { maxChars: 10, maxItems: 10 })).toEqual([
      [long],
      ['a'],
    ]);
  });
});
