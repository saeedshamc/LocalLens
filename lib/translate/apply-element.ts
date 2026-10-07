/**
 * Replace the first text occurrence matching originalText inside el's text nodes.
 * Falls back to setting textContent on the element when no exact text-node match.
 */
export function applyElementTranslation(
  root: ParentNode,
  originalText: string,
  translation: string,
): boolean {
  const needle = originalText.replace(/\s+/g, ' ').trim();
  if (!needle) return false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const value = (textNode.nodeValue ?? '').replace(/\s+/g, ' ');
    const index = value.indexOf(needle);
    if (index >= 0 && textNode.nodeValue) {
      const raw = textNode.nodeValue;
      // Best-effort: if collapsed match equals full trimmed content, replace whole node.
      if (raw.replace(/\s+/g, ' ').trim() === needle) {
        textNode.nodeValue = translation;
        return true;
      }
    }
    node = walker.nextNode();
  }

  if (root instanceof Element) {
    const current = (root.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (current === needle || current.includes(needle)) {
      root.textContent = translation;
      return true;
    }
  }
  return false;
}
