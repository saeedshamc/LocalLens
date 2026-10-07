const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'CODE',
  'PRE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'SVG',
  'MATH',
  'KBD',
  'SAMP',
]);

function isSkippedElement(el: Element | null): boolean {
  let current: Element | null = el;
  while (current) {
    if (SKIP_TAGS.has(current.tagName)) return true;
    if (current instanceof HTMLElement && current.isContentEditable) return true;
    current = current.parentElement;
  }
  return false;
}

export interface CollectableTextNode {
  node: Text;
  text: string;
}

/** Collect non-empty text nodes suitable for page translation. */
export function collectTranslatableTextNodes(
  root: ParentNode = document.body,
): CollectableTextNode[] {
  if (!root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (!parent || isSkippedElement(parent)) return NodeFilter.FILTER_REJECT;
      const value = textNode.nodeValue ?? '';
      if (!value.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const results: CollectableTextNode[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    results.push({ node: textNode, text: textNode.nodeValue ?? '' });
    current = walker.nextNode();
  }
  return results;
}

export type ApplyMode = 'replace' | 'overlay';

export function applyTranslations(
  nodes: CollectableTextNode[],
  translations: string[],
  rtl: boolean,
  mode: ApplyMode = 'replace',
): void {
  if (mode === 'overlay') {
    applyOverlayTranslations(nodes, translations, rtl);
    return;
  }
  for (let i = 0; i < nodes.length; i++) {
    const item = nodes[i];
    const translated = translations[i];
    if (!item || translated === undefined) continue;
    item.node.nodeValue = translated;
    const parent = item.node.parentElement;
    if (parent) {
      parent.dataset.llTranslated = '1';
      if (rtl) parent.setAttribute('dir', 'rtl');
      else if (parent.getAttribute('dir') === 'rtl' && parent.dataset.llDirSet === '1') {
        parent.removeAttribute('dir');
      }
      if (rtl) parent.dataset.llDirSet = '1';
    }
  }
}

function applyOverlayTranslations(
  nodes: CollectableTextNode[],
  translations: string[],
  rtl: boolean,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const item = nodes[i];
    const translated = translations[i];
    if (!item || translated === undefined) continue;
    const parent = item.node.parentElement;
    if (!parent || parent.dataset.llOverlay === '1') continue;

    const host = document.createElement('span');
    host.className = 'locallens-overlay-host';
    host.dataset.llOverlay = '1';
    host.style.cssText =
      'display:block;margin-top:0.25em;padding:0.2em 0.35em;border-inline-start:3px solid #0f6e56;background:rgba(216,239,230,0.55);border-radius:4px;font:inherit;';
    if (rtl) host.setAttribute('dir', 'rtl');
    const shadow = host.attachShadow({ mode: 'open' });
    const body = document.createElement('span');
    body.textContent = translated;
    body.style.cssText = 'font: inherit; color: #1a1f2b; line-height: 1.45;';
    shadow.appendChild(body);
    parent.appendChild(host);
    parent.dataset.llTranslated = '1';
  }
}

export function restoreOriginals(nodes: CollectableTextNode[]): void {
  for (const item of nodes) {
    item.node.nodeValue = item.text;
    const parent = item.node.parentElement;
    if (!parent) continue;
    parent.querySelectorAll('.locallens-overlay-host').forEach((el) => el.remove());
    delete parent.dataset.llTranslated;
    delete parent.dataset.llOverlay;
    if (parent.dataset.llDirSet === '1') {
      parent.removeAttribute('dir');
      delete parent.dataset.llDirSet;
    }
  }
  document.querySelectorAll('.locallens-overlay-host').forEach((el) => el.remove());
}
