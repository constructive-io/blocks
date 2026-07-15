/**
 * ui-demos smoke — every registered ui demo must mount in jsdom without
 * throwing and render real DOM. Mount-only by design: open/drag/gesture
 * interactions belong to browser QA; this catches broken imports, invalid
 * hook usage, and components that explode without a browser API.
 *
 * jsdom gaps are stubbed file-locally (matchMedia, ResizeObserver,
 * IntersectionObserver, canvas 2D context) — the components themselves
 * null-guard canvas, but the stubs keep observer-based demos quiet.
 */

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { UI_DEMOS } from '@/components/docs/showcase-ui';

beforeAll(() => {
  // cmdk scrolls the selected item into view on mount (test/setup.ts only stubs scrollTo).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
  }
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
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
  }
  if (!('IntersectionObserver' in globalThis)) {
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    (globalThis as Record<string, unknown>).IntersectionObserver = IntersectionObserverStub;
  }
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })),
    })),
  });
});

afterEach(() => {
  cleanup();
});

describe('ui demos mount cleanly', () => {
  it.each(Object.entries(UI_DEMOS))('%s', async (_slug, DemoComponent) => {
    const { container, unmount } = render(<DemoComponent />);
    await waitFor(() => expect(container.firstChild).not.toBeNull());
    unmount();
  });
});
