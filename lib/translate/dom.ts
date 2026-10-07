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

export function applyTranslations(
  nodes: CollectableTextNode[],
  translations: string[],
  rtl: boolean,
): void {
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

export function restoreOriginals(nodes: CollectableTextNode[]): void {
  for (const item of nodes) {
    item.node.nodeValue = item.text;
    const parent = item.node.parentElement;
    if (!parent) continue;
    delete parent.dataset.llTranslated;
    if (parent.dataset.llDirSet === '1') {
      parent.removeAttribute('dir');
      delete parent.dataset.llDirSet;
    }
  }
}
