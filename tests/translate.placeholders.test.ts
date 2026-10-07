import { describe, expect, it } from 'vitest';
import { protectPlaceholders } from '../lib/translate/placeholders';

describe('protectPlaceholders', () => {
  it('masks and restores URLs and numbers', () => {
    const original = 'See https://example.com and version 1.2.3 now';
    const { masked, restore } = protectPlaceholders(original);
    expect(masked).not.toContain('https://example.com');
    expect(masked).toContain('⟦PH');
    expect(restore(masked)).toBe(original);
  });

  it('restores tokens after a fake translation wrapper', () => {
    const { masked, restore } = protectPlaceholders('email me at a@b.co');
    expect(restore(`(${masked})`)).toContain('a@b.co');
  });
});
