/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

/** Mirrors the hit-test used so menu clicks are not swallowed by the picker. */
function hitLocallensMenu(path: EventTarget[]): boolean {
  return path.some(
    (node) => node instanceof Element && node.id === 'locallens-action-menu',
  );
}

describe('picker menu hit test', () => {
  it('detects the action menu host in composedPath', () => {
    const host = document.createElement('div');
    host.id = 'locallens-action-menu';
    const button = document.createElement('button');
    expect(hitLocallensMenu([button, host, document])).toBe(true);
  });

  it('ignores unrelated page elements', () => {
    const div = document.createElement('div');
    expect(hitLocallensMenu([div, document])).toBe(false);
  });
});
