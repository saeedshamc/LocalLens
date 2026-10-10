import {
  applyTranslations,
  collectTranslatableTextNodes,
  restoreOriginals,
  type ApplyMode,
  type CollectableTextNode,
} from './dom';
import { createDebouncedRunner, waitAtLeast } from './queue';

export interface LazyTranslateOptions {
  root?: ParentNode;
  rtl: boolean;
  mode?: ApplyMode;
  /** Max blocks waiting for translation (oldest kept; overflow re-observed). */
  maxQueue?: number;
  /** Debounce for MutationObserver ingest. */
  mutationDebounceMs?: number;
  /** Minimum gap between Ollama batch calls. */
  minBatchIntervalMs?: number;
  /** Max text nodes sent in one translateBatch call. */
  maxNodesPerCall?: number;
  translateBatch: (texts: string[]) => Promise<string[]>;
  onProgress?: (info: { done: number; pending: number }) => void;
  onError?: (error: Error) => void;
}

export interface LazyTranslateController {
  start: () => void;
  stop: () => void;
  restore: () => void;
  readonly translatedCount: number;
  readonly pendingCount: number;
  getOriginals: () => CollectableTextNode[];
}

const BLOCK_SELECTOR =
  'p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, article, section, div';

const DEFAULT_MAX_QUEUE = 80;
const DEFAULT_MUTATION_DEBOUNCE_MS = 300;
const DEFAULT_MIN_BATCH_INTERVAL_MS = 200;
const DEFAULT_MAX_NODES_PER_CALL = 24;

function blockForNode(node: Text): Element | null {
  const parent = node.parentElement;
  if (!parent) return null;
  return parent.closest(BLOCK_SELECTOR) ?? parent;
}

function isNearViewport(el: Element, margin: number): boolean {
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    // display:contents / collapsed wrappers — fall back to text parent later.
    return false;
  }
  return rect.bottom >= -margin && rect.top <= vh + margin;
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
  const maxNodesPerCall =
    options.maxNodesPerCall ?? DEFAULT_MAX_NODES_PER_CALL;
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

  const reportProgress = () => {
    options.onProgress?.({
      done: translatedCount,
      pending: pending.size,
    });
  };

  const enqueueBlock = (el: Element) => {
    if (queuedBlocks.includes(el)) return;
    queuedBlocks.push(el);
    if (queuedBlocks.length <= maxQueue) return;
    // Keep oldest (reading order). Re-observe overflow so it is not lost.
    const overflow = queuedBlocks.slice(maxQueue);
    queuedBlocks = queuedBlocks.slice(0, maxQueue);
    for (const dropped of overflow) {
      observer?.observe(dropped);
    }
  };

  const flushQueue = async () => {
    if (!running || busy || queuedBlocks.length === 0) return;
    busy = true;
    try {
      while (queuedBlocks.length > 0 && running) {
        const block = queuedBlocks.shift();
        if (!block) break;
        let nodes = collectTranslatableTextNodes(block).filter((item) =>
          pending.has(item.node),
        );
        if (nodes.length === 0) continue;

        while (nodes.length > 0 && running) {
          const chunk = nodes.slice(0, maxNodesPerCall);
          nodes = nodes.slice(maxNodesPerCall);

          lastBatchAt = await waitAtLeast(lastBatchAt, minBatchIntervalMs);
          const texts = chunk.map((n) => n.text);
          const translations = await options.translateBatch(texts);
          lastBatchAt = Date.now();
          applyTranslations(
            chunk,
            translations,
            options.rtl,
            options.mode ?? 'replace',
          );
          for (const item of chunk) {
            pending.delete(item.node);
            originals.push(item);
            translatedCount += 1;
          }
          reportProgress();
        }
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Translation failed.');
      options.onError?.(err);
    } finally {
      busy = false;
      if (running && queuedBlocks.length > 0) void flushQueue();
    }
  };

  const observeBlock = (el: Element) => {
    observer?.observe(el);
  };

  /** Queue blocks already in (or near) the viewport — IO alone can miss some layouts. */
  const enqueueVisiblePending = () => {
    if (!running) return;
    const margin = 120;
    const seen = new Set<Element>();
    for (const node of pending) {
      const block = blockForNode(node);
      if (!block || seen.has(block)) continue;
      seen.add(block);
      const probe = node.parentElement ?? block;
      if (isNearViewport(probe, margin) || isNearViewport(block, margin)) {
        enqueueBlock(block);
      }
    }
    void flushQueue();
  };

  const ingestNodes = (nodes: CollectableTextNode[]) => {
    for (const item of nodes) {
      if (pending.has(item.node)) continue;
      if (originals.some((o) => o.node === item.node)) continue;
      pending.add(item.node);
      const block = blockForNode(item.node);
      if (block) observeBlock(block);
    }
    reportProgress();
    enqueueVisiblePending();
  };

  return {
    get translatedCount() {
      return translatedCount;
    },
    get pendingCount() {
      return pending.size;
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
            // Keep observing until translated — unobserve only when no pending
            // text remains under the block (handled after successful apply via
            // not re-queuing empty blocks). Avoid permanent loss on queue clamp.
            observer?.unobserve(entry.target);
          }
          void flushQueue();
        },
        { root: null, rootMargin: '120px 0px', threshold: 0 },
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
      window.requestAnimationFrame(() => {
        enqueueVisiblePending();
      });
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
