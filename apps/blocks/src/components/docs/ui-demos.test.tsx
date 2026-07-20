import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

import { UI_DEMOS } from './showcase-ui';

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function scrollIntoView() {};
  if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }
  if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): ResizeObserverEntry[] {
        return [];
      }
    };
  }
});

afterEach(cleanup);

describe('base primitive previews', () => {
  it('matches the typed catalog exactly', () => {
    expect(Object.keys(UI_DEMOS)).toEqual(BASE_PRIMITIVES.map(({ name }) => name));
  });

  it.each(BASE_PRIMITIVES)('mounts the $name package preview', async ({ name }) => {
    const Demo = UI_DEMOS[name];
    const { container, unmount } = render(<Demo />);
    await waitFor(() => expect(container.firstChild).not.toBeNull());
    unmount();
  });
});
