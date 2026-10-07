/** Keep at most `max` items, dropping the oldest. */
export function clampQueueSize<T>(items: T[], max: number): T[] {
  if (max <= 0) return [];
  if (items.length <= max) return items;
  return items.slice(items.length - max);
}

export function createDebouncedRunner(delayMs: number): {
  schedule: (fn: () => void) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule(fn) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export async function waitAtLeast(
  lastAt: number,
  minIntervalMs: number,
): Promise<number> {
  const elapsed = Date.now() - lastAt;
  if (elapsed < minIntervalMs) {
    await new Promise((r) => setTimeout(r, minIntervalMs - elapsed));
  }
  return Date.now();
}
