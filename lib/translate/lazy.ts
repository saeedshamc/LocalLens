import {
  applyTranslations,
  collectTranslatableTextNodes,
  restoreOriginals,
  type ApplyMode,
  type CollectableTextNode,
} from './dom';
import { clampQueueSize, createDebouncedRunner, waitAtLeast } from './queue';

export interface LazyTranslateOptions {
  root?: ParentNode;
  rtl: boolean;
  mode?: ApplyMode;
  /** Max blocks waiting for translation (newest kept). */
  maxQueue?: number;
  /** Debounce for MutationObserver ingest. */
  mutationDebounceMs?: number;
  /** Minimum gap between Ollama batch calls. */
  minBatchIntervalMs?: number;
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

const DEFAULT_MAX_QUEUE = 40;
const DEFAULT_MUTATION_DEBOUNCE_MS = 300;
const DEFAULT_MIN_BATCH_INTERVAL_MS = 200;

function blockForNode(node: Text): Element | null {
  const parent = node.parentElement;
  if (!parent) return null;
  return parent.closest(BLOCK_SELECTOR) ?? parent;
}

/**
 * Translate visible text blocks first (IntersectionObserver) and watch the DOM
 * for newly inserted content (MutationObserver), with queue and rate limits.
 */
export function createLazyTranslator(
  options: LazyTranslateOptions,
): LazyTranslateController {
  const root = options.root ?? document.body;
  const maxQueue = options.maxQueue ?? DEFAULT_MAX_QUEUE;
  const minBatchIntervalMs =
    options.minBatchIntervalMs ?? DEFAULT_MIN_BATCH_INTERVAL_MS;
  const originals: CollectableTextNode[] = [];
  const pending = new Set<Text>();
  let queuedBlocks: Element[] = [];
  let observer: IntersectionObserver | null = null;
  let mutation: MutationObserver | null = null;
  let running = false;
  let busy = false;
  let translatedCount = 0;
  let lastBatchAt = 0;
  const mutationDebounce = createDebouncedRunner(
    options.mutationDebounceMs ?? DEFAULT_MUTATION_DEBOUNCE_MS,
  );
  let pendingMutationNodes: CollectableTextNode[] = [];

  const enqueueBlock = (el: Element) => {
    if (queuedBlocks.includes(el)) return;
    queuedBlocks.push(el);
    queuedBlocks = clampQueueSize(queuedBlocks, maxQueue);
  };

  const flushQueue = async () => {
    if (!running || busy || queuedBlocks.length === 0) return;
    busy = true;
    try {
      while (queuedBlocks.length > 0 && running) {
        const block = queuedBlocks.shift();
        if (!block) break;
        const nodes = collectTranslatableTextNodes(block).filter((item) =>
          pending.has(item.node),
        );
        if (nodes.length === 0) continue;

        lastBatchAt = await waitAtLeast(lastBatchAt, minBatchIntervalMs);
        const texts = nodes.map((n) => n.text);
        const translations = await options.translateBatch(texts);
        lastBatchAt = Date.now();
        applyTranslations(nodes, translations, options.rtl, options.mode ?? 'replace');
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
      if (queuedBlocks.length > 0) void flushQueue();
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
            enqueueBlock(entry.target);
            observer?.unobserve(entry.target);
          }
          void flushQueue();
        },
        { root: null, rootMargin: '120px 0px', threshold: 0.01 },
      );

      mutation = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const textNode = node as Text;
              const value = textNode.nodeValue ?? '';
              if (value.trim()) {
                pendingMutationNodes.push({ node: textNode, text: value });
              }
            } else if (node instanceof Element) {
              pendingMutationNodes.push(...collectTranslatableTextNodes(node));
            }
          }
        }
        mutationDebounce.schedule(() => {
          const batch = pendingMutationNodes;
          pendingMutationNodes = [];
          if (batch.length) ingestNodes(batch);
        });
      });

      mutation.observe(root, { childList: true, subtree: true });
      ingestNodes(collectTranslatableTextNodes(root));
    },
    stop() {
      running = false;
      mutationDebounce.cancel();
      observer?.disconnect();
      mutation?.disconnect();
      observer = null;
      mutation = null;
      queuedBlocks = [];
      pendingMutationNodes = [];
    },
    restore() {
      restoreOriginals(originals);
      originals.length = 0;
      pending.clear();
      translatedCount = 0;
    },
  };
}
