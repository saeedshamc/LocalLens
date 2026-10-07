import { Readability } from '@mozilla/readability';

export interface PageTextResult {
  title: string;
  text: string;
  excerpt: string;
  byline: string;
  truncated: boolean;
  source: 'readability' | 'body';
}

const DEFAULT_MAX_CHARS = 14_000;

/**
 * Extract main article text with Readability; fall back to body innerText.
 * Clones the document so the live page is not mutated.
 */
export function extractPageText(
  doc: Document = document,
  maxChars: number = DEFAULT_MAX_CHARS,
): PageTextResult {
  const clone = doc.cloneNode(true) as Document;
  let title = doc.title || '';
  let text = '';
  let excerpt = '';
  let byline = '';
  let source: PageTextResult['source'] = 'body';

  try {
    const article = new Readability(clone).parse();
    if (article?.textContent?.trim()) {
      text = article.textContent.trim();
      title = article.title || title;
      excerpt = article.excerpt || '';
      byline = article.byline || '';
      source = 'readability';
    }
  } catch {
    // Fall through to body text.
  }

  if (!text.trim()) {
    text = (doc.body?.innerText || doc.documentElement?.innerText || '').trim();
    source = 'body';
  }

  const truncated = text.length > maxChars;
  if (truncated) {
    text = `${text.slice(0, maxChars)}\n\n[Page content truncated for context size.]`;
  }

  return { title, text, excerpt, byline, truncated, source };
}
