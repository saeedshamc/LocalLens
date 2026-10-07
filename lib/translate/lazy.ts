import {
  applyTranslations,
  collectTranslatableTextNodes,
  type CollectableTextNode,
} from './dom';

export interface LazyTranslateOptions {
  root?: ParentNode;
  rtl: boolean;
  translateBatch: (texts: string[]) => Promise<string[]>;
  onProgress?: (info: { done: number; pending: number }) => void;
}

export interface LazyTranslateController {
  start: () => void;
  stop: () => void;
  restore: () => void;
  readonly translatedCount: number;
  getOriginals: () => CollectableTextNode[];
}

const BLOCK_SELECTOR =
  'p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, article, section, div';

function blockForNode(node: Text): Element | null {
  const parent = node.parentElement;
  if (!parent) return null;
  return parent.closest(BLOCK_SELECTOR) ?? parent;
}

/**
 * Translate visible text blocks first (IntersectionObserver) and watch the DOM
 * for newly inserted content (MutationObserver).
 */
export function createLazyTranslator(
  options: LazyTranslateOptions,
): LazyTranslateController {
  const root = options.root ?? document.body;
  const originals: CollectableTextNode[] = [];
  const pending = new Set<Text>();
  const queuedBlocks = new Set<Element>();
  let observer: IntersectionObserver | null = null;
  let mutation: MutationObserver | null = null;
  let running = false;
  let busy = false;
  let translatedCount = 0;

  const flushQueue = async () => {
    if (!running || busy || queuedBlocks.size === 0) return;
    busy = true;
    try {
      while (queuedBlocks.size > 0 && running) {
        const block = queuedBlocks.values().next().value as Element;
        queuedBlocks.delete(block);
        const nodes = collectTranslatableTextNodes(block).filter((item) =>
          pending.has(item.node),
        );
        if (nodes.length === 0) continue;

        const texts = nodes.map((n) => n.text);
        const translations = await options.translateBatch(texts);
        applyTranslations(nodes, translations, options.rtl);
        for (const item of nodes) {
          pending.delete(item.node);
          originals.push(item);
          translatedCount += 1;
        }
        options.onProgress?.({
          done: translatedCount,
          pending: pending.size,
        });
      }
    } finally {
      busy = false;
      if (queuedBlocks.size > 0) void flushQueue();
    }
  };

  const observeBlock = (el: Element) => {
    observer?.observe(el);
  };

  const ingestNodes = (nodes: CollectableTextNode[]) => {
    for (const item of nodes) {
      if (pending.has(item.node)) continue;
      if (originals.some((o) => o.node === item.node)) continue;
      pending.add(item.node);
      const block = blockForNode(item.node);
      if (block) observeBlock(block);
    }
    options.onProgress?.({ done: translatedCount, pending: pending.size });
  };

  return {
    get translatedCount() {
      return translatedCount;
    },
    getOriginals: () => originals.slice(),
    start() {
      if (running) return;
      running = true;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (!(entry.target instanceof Element)) continue;
            queuedBlocks.add(entry.target);
            observer?.unobserve(entry.target);
          }
          void flushQueue();
        },
        { root: null, rootMargin: '120px 0px', threshold: 0.01 },
      );

      mutation = new MutationObserver((records) => {
        const fresh: CollectableTextNode[] = [];
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const textNode = node as Text;
              const value = textNode.nodeValue ?? '';
              if (value.trim()) fresh.push({ node: textNode, text: value });
            } else if (node instanceof Element) {
              fresh.push(...collectTranslatableTextNodes(node));
            }
          }
        }
        if (fresh.length) ingestNodes(fresh);
      });

      mutation.observe(root, { childList: true, subtree: true });
      ingestNodes(collectTranslatableTextNodes(root));
    },
    stop() {
      running = false;
      observer?.disconnect();
      mutation?.disconnect();
      observer = null;
      mutation = null;
      queuedBlocks.clear();
    },
    restore() {
      for (const item of originals) {
        item.node.nodeValue = item.text;
        const parent = item.node.parentElement;
        if (!parent) continue;
        delete parent.dataset.llTranslated;
        if (parent.dataset.llDirSet === '1') {
          parent.removeAttribute('dir');
          delete parent.dataset.llDirSet;
        }
      }
      originals.length = 0;
      pending.clear();
      translatedCount = 0;
    },
  };
}
