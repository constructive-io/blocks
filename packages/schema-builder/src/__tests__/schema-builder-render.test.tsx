import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { createNoopSchemaBuilderAdapter } from '../testing';
import { DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '../types';

vi.mock('@constructive-io/ui/stack', () => ({
  CardStackProvider: ({ children }: { children: ReactNode }) => children,
  CardStackViewport: () => null
}));

vi.mock('../schema/schema-builder/components/client-only', () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children
}));

vi.mock('../schema/schema-builder-core/lib/gql/hooks/schema-builder', () => ({
  SchemaBuilderDataProvider: ({ children }: { children: ReactNode }) => children
}));

vi.mock('../schema/schema-builder/components/schemas/schemas-route', async () => {
  const { useReducedMotionConfig } = await vi.importActual<typeof import('motion/react')>('motion/react');

  return {
    SchemasRoute: ({ emptyState }: { emptyState?: ReactNode }) => {
      const shouldReduceMotion = useReducedMotionConfig();

      return (
        <section
          data-testid='schemas-route-boundary'
          data-reduced-motion={String(shouldReduceMotion)}
        >
          {emptyState}
        </section>
      );
    }
  };
});

import { SchemaBuilder } from '../components/schema-builder';

afterEach(cleanup);

let prefersReducedMotion = false;
const reducedMotionListeners = new Set<EventListenerOrEventListenerObject>();
const reducedMotionQuery = {
  get matches() {
    return prefersReducedMotion;
  },
  media: '(prefers-reduced-motion)',
  onchange: null,
  addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
    reducedMotionListeners.add(listener);
  },
  removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
    reducedMotionListeners.delete(listener);
  },
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => true)
} as MediaQueryList;

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn(() => reducedMotionQuery)
});

function setReducedMotionPreference(matches: boolean) {
  prefersReducedMotion = matches;
  const event = { matches, media: reducedMotionQuery.media } as MediaQueryListEvent;
  reducedMotionListeners.forEach((listener) => {
    if (typeof listener === 'function') listener(event);
    else listener.handleEvent(event);
  });
}

function renderSchemaBuilder() {
  return render(
    <SchemaBuilder
      adapter={createNoopSchemaBuilderAdapter()}
      scope={{ orgId: 'org-1', databaseId: 'db-1', userId: 'user-1' }}
      colorMode='dark'
      preferences={{ ...DEFAULT_SCHEMA_BUILDER_PREFERENCES }}
      onPreferencesChange={vi.fn()}
      activeTab='editor'
      onActiveTabChange={vi.fn()}
      emptyState={<p>No database selected by this host</p>}
    />
  );
}

describe('SchemaBuilder host boundary', () => {
  it('forwards the host empty state to the schemas route', () => {
    renderSchemaBuilder();

    expect(screen.getByTestId('schemas-route-boundary')).toBeTruthy();
    expect(screen.getByText('No database selected by this host')).toBeTruthy();
  });

  it('passes the user motion preference to package descendants', () => {
    setReducedMotionPreference(false);
    const firstRender = renderSchemaBuilder();
    expect(screen.getByTestId('schemas-route-boundary').getAttribute('data-reduced-motion')).toBe('false');

    firstRender.unmount();
    act(() => setReducedMotionPreference(true));
    renderSchemaBuilder();

    expect(screen.getByTestId('schemas-route-boundary').getAttribute('data-reduced-motion')).toBe('true');
  });
});
