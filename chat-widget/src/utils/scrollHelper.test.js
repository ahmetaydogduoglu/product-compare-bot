import { describe, it, expect, vi } from 'vitest';
import { scrollToBottom } from './scrollHelper.js';

describe('scrollToBottom', () => {
  it('should set scrollTop to scrollHeight after rAF', () => {
    const container = { scrollTop: 0, scrollHeight: 500 };

    vi.stubGlobal('requestAnimationFrame', (cb) => cb());

    scrollToBottom(container);

    expect(container.scrollTop).toBe(500);

    vi.unstubAllGlobals();
  });

  it('should not throw when container is null', () => {
    expect(() => scrollToBottom(null)).not.toThrow();
  });

  it('should not throw when container is undefined', () => {
    expect(() => scrollToBottom(undefined)).not.toThrow();
  });
});
