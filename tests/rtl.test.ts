import { describe, expect, it } from 'vitest';
import { isRtlLanguage } from '../lib/utils/rtl';

describe('isRtlLanguage', () => {
  it('detects RTL primary tags', () => {
    expect(isRtlLanguage('fa')).toBe(true);
    expect(isRtlLanguage('fa-IR')).toBe(true);
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('he-IL')).toBe(true);
  });

  it('rejects LTR languages', () => {
    expect(isRtlLanguage('en')).toBe(false);
    expect(isRtlLanguage('en-US')).toBe(false);
    expect(isRtlLanguage('de')).toBe(false);
  });
});
