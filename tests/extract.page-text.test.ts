import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractPageText } from '../lib/extract/page-text';

describe('extractPageText', () => {
  it('falls back to body text and truncates when needed', () => {
    const dom = new JSDOM(`<!doctype html><html><head><title>T</title></head>
      <body><p>${'hello '.repeat(20)}</p></body></html>`);
    const result = extractPageText(dom.window.document, 40);
    expect(result.title).toBe('T');
    expect(result.truncated).toBe(true);
    expect(result.text).toContain('truncated');
  });

  it('returns empty-safe result for blank documents', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const result = extractPageText(dom.window.document);
    expect(result.text).toBe('');
    expect(result.truncated).toBe(false);
  });
});
