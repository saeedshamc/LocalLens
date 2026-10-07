import { describe, expect, it, vi } from 'vitest';
import { clampQueueSize, createDebouncedRunner } from '../lib/translate/queue';

describe('clampQueueSize', () => {
  it('keeps the newest items when over capacity', () => {
    expect(clampQueueSize([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });

  it('returns empty for non-positive max', () => {
    expect(clampQueueSize([1, 2], 0)).toEqual([]);
  });
});

describe('createDebouncedRunner', () => {
  it('runs only the latest scheduled callback', async () => {
    vi.useFakeTimers();
    const runner = createDebouncedRunner(100);
    const calls: number[] = [];
    runner.schedule(() => calls.push(1));
    runner.schedule(() => calls.push(2));
    await vi.advanceTimersByTimeAsync(100);
    expect(calls).toEqual([2]);
    vi.useRealTimers();
  });
});
