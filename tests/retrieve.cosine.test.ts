import { describe, expect, it } from 'vitest';
import { cosineSimilarity, rankByCosine } from '../lib/retrieve/cosine';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });
});

describe('rankByCosine', () => {
  it('returns top-k by score', () => {
    const ranked = rankByCosine(
      [1, 0],
      [
        { id: 'a', embedding: [0.9, 0.1] },
        { id: 'b', embedding: [0, 1] },
        { id: 'c', embedding: [1, 0] },
      ],
      2,
    );
    expect(ranked.map((r) => r.item.id)).toEqual(['c', 'a']);
  });
});
