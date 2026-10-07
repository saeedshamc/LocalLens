import { describe, expect, it } from 'vitest';
import { resolveTargetElement } from '../lib/picker/overlay';
import { extractElementText } from '../lib/picker/menu';

describe('resolveTargetElement', () => {
  it('returns null when path has no elements', () => {
    const event = {
      composedPath: () => [],
      target: null,
    } as unknown as Event;
    expect(resolveTargetElement(event)).toBeNull();
  });

  it('returns null for non-element path entries', () => {
    const event = {
      composedPath: () => ['x', 1, null],
      target: null,
    } as unknown as Event;
    expect(resolveTargetElement(event)).toBeNull();
  });
});

describe('extractElementText', () => {
  it('collapses whitespace', () => {
    const el = {
      textContent: '  hello   \n world  ',
    } as unknown as Element;
    expect(extractElementText(el)).toBe('hello world');
  });
});
