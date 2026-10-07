import { describe, expect, it } from 'vitest';
import { hashString, translationCacheKey } from '../lib/utils/hash';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
  });

  it('differs for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('translationCacheKey', () => {
  it('includes model and language in the key space', () => {
    expect(translationCacheKey('hi', 'm1', 'fa')).not.toBe(
      translationCacheKey('hi', 'm1', 'en'),
    );
    expect(translationCacheKey('hi', 'm1', 'fa')).not.toBe(
      translationCacheKey('hi', 'm2', 'fa'),
    );
  });
});
