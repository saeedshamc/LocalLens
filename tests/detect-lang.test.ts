import { describe, expect, it } from 'vitest';
import {
  detectPrimaryScript,
  looksLikeTargetLanguage,
} from '../lib/utils/detect-lang';

describe('detectPrimaryScript', () => {
  it('detects Persian/Arabic script', () => {
    expect(
      detectPrimaryScript(
        'این یک متن فارسی نسبتاً بلند برای آزمایش تشخیص زبان است و باید فارسی تشخیص داده شود.',
      ),
    ).toBe('fa');
  });

  it('detects Latin script', () => {
    expect(
      detectPrimaryScript(
        'This is a reasonably long English sample used to exercise language detection heuristics.',
      ),
    ).toBe('en');
  });
});

describe('looksLikeTargetLanguage', () => {
  it('matches fa target with Persian text', () => {
    expect(
      looksLikeTargetLanguage(
        'سلام دنیا این صفحه از قبل فارسی است و نیازی به ترجمه ندارد برای تست.',
        'fa',
      ),
    ).toBe(true);
  });

  it('does not match en target with Persian text', () => {
    expect(
      looksLikeTargetLanguage(
        'سلام دنیا این صفحه از قبل فارسی است و نیازی به ترجمه ندارد برای تست.',
        'en',
      ),
    ).toBe(false);
  });
});
