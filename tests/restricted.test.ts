import { describe, expect, it } from 'vitest';
import { isRestrictedUrl } from '../lib/utils/restricted';

describe('isRestrictedUrl', () => {
  it('flags browser pages and the web store', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('chrome-extension://abc/options.html')).toBe(true);
    expect(isRestrictedUrl('https://chrome.google.com/webstore/detail/x')).toBe(true);
    expect(isRestrictedUrl('https://chromewebstore.google.com/detail/x')).toBe(true);
  });

  it('allows normal https pages', () => {
    expect(isRestrictedUrl('https://example.com/article')).toBe(false);
    expect(isRestrictedUrl('http://localhost:3000')).toBe(false);
  });
});
