import { Suspense, act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardStackProvider,
  useCardStack,
  useStackCards,
} from '../src/components/stack/stack-context';
import type {
  CardRouteMap,
  CardSpec,
  CardStackApi,
} from '../src/components/stack/stack.types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

function TestCard() {
  return null;
}

function card(id: string, options: Partial<CardSpec> = {}): CardSpec {
  return { id, Component: TestCard, ...options };
}

function ApiProbe({ onApi }: { onApi: (api: CardStackApi) => void }) {
  const api = useCardStack();
  const cards = useStackCards();

  useEffect(() => {
    onApi(api);
  }, [api, onApi]);

  return <output data-stack-ids>{cards.map((item) => item.id).join(',')}</output>;
}

function SuspendAfterProvider({ suspend, suspension }: { suspend: boolean; suspension: Promise<never> }) {
  if (suspend) throw suspension;
  return null;
}

type StackTreeProps = {
  initial?: CardSpec[];
  onApi: (api: CardStackApi) => void;
  onChange?: (cards: CardSpec[]) => void;
  routes?: CardRouteMap;
  suspend?: boolean;
  suspension?: Promise<never>;
};

const NEVER = new Promise<never>(() => {});

function StackTree({
  initial,
  onApi,
  onChange,
  routes,
  suspend = false,
  suspension = NEVER,
}: StackTreeProps) {
  return (
    <Suspense fallback={<span>Suspended stack</span>}>
      <CardStackProvider initial={initial} onChange={onChange} routes={routes}>
        <ApiProbe onApi={onApi} />
        <SuspendAfterProvider suspend={suspend} suspension={suspension} />
      </CardStackProvider>
    </Suspense>
  );
}

function createTestRoot() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  activeRoots.add(root);
  return { container, root };
}

afterEach(async () => {
  for (const root of activeRoots) {
    await act(async () => root.unmount());
  }
  activeRoots.clear();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('CardStackProvider stable API refs', () => {
  it('preserves same-tick push, replace, pop, and dismiss semantics', async () => {
    let api: CardStackApi | undefined;
    const onApi = (nextApi: CardStackApi) => {
      api = nextApi;
    };
    const { container, root } = createTestRoot();

    await act(async () => root.render(
      <StackTree initial={[card('root')]} onApi={onApi} />,
    ));
    const initialApi = api;
    expect(initialApi).toBeDefined();

    await act(async () => {
      initialApi!.push(card('a'));
      expect(initialApi!.getAll().map((item) => item.id)).toEqual(['root', 'a']);

      initialApi!.push(card('b'));
      initialApi!.push(card('c'), { replaceFrom: 'a' });
      expect(initialApi!.getAll().map((item) => item.id)).toEqual(['root', 'a', 'c']);

      initialApi!.replaceTop(card('replacement'));
      expect(initialApi!.currentId()).toBe('replacement');

      initialApi!.pop();
      expect(initialApi!.currentId()).toBe('a');

      initialApi!.push(card('last'));
      initialApi!.dismiss('a', { cascade: false });
      expect(initialApi!.getAll().map((item) => item.id)).toEqual(['root', 'last']);
    });

    expect(container.querySelector('[data-stack-ids]')?.textContent).toBe('root,last');
    expect(api).toBe(initialApi);
  });

  it('uses replaced routes and callbacks and closes removed cards once', async () => {
    let api: CardStackApi | undefined;
    const onApi = (nextApi: CardStackApi) => {
      api = nextApi;
    };
    const initialOnChange = vi.fn();
    const latestOnChange = vi.fn();
    const onClose = vi.fn();
    const initialRoutes: CardRouteMap = {
      profile: { Component: TestCard, defaultTitle: 'Initial profile' },
    };
    const latestRoutes: CardRouteMap = {
      profile: { Component: TestCard, defaultTitle: 'Latest profile' },
    };
    const { root } = createTestRoot();

    await act(async () => root.render(
      <StackTree onApi={onApi} onChange={initialOnChange} routes={initialRoutes} />,
    ));
    const stableApi = api!;

    await act(async () => {
      stableApi.push(card('initial'));
    });
    expect(initialOnChange).toHaveBeenCalledOnce();

    await act(async () => root.render(
      <StackTree onApi={onApi} onChange={latestOnChange} routes={latestRoutes} />,
    ));
    expect(api).toBe(stableApi);

    await act(async () => {
      stableApi.pushRoute('profile', undefined, { id: 'latest-profile' });
    });
    expect(stableApi.get('latest-profile')?.title).toBe('Latest profile');

    await act(async () => {
      stableApi.push(card('closable', { onClose }));
    });
    await act(async () => {
      stableApi.pop();
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(initialOnChange).toHaveBeenCalledOnce();
    expect(latestOnChange).toHaveBeenCalledTimes(3);
  });

  it('does not expose routes from an abandoned suspended render', async () => {
    let api: CardStackApi | undefined;
    const onApi = (nextApi: CardStackApi) => {
      api = nextApi;
    };
    const committedRoutes: CardRouteMap = {
      profile: { Component: TestCard, defaultTitle: 'Committed route' },
    };
    const abandonedRoutes: CardRouteMap = {
      profile: { Component: TestCard, defaultTitle: 'Abandoned route' },
    };
    const { root } = createTestRoot();

    await act(async () => root.render(
      <StackTree onApi={onApi} routes={committedRoutes} />,
    ));
    const committedApi = api!;

    await act(async () => root.render(
      <StackTree onApi={onApi} routes={abandonedRoutes} suspend />,
    ));

    await act(async () => {
      committedApi.pushRoute('profile', undefined, { id: 'route-check' });
      expect(committedApi.top()?.title).toBe('Committed route');
    });

    expect(committedApi.top()?.title).toBe('Committed route');
  });

  it('removes the Escape listener on unmount', async () => {
    let api: CardStackApi | undefined;
    const onApi = (nextApi: CardStackApi) => {
      api = nextApi;
    };
    const { root } = createTestRoot();

    await act(async () => root.render(
      <StackTree initial={[card('root')]} onApi={onApi} />,
    ));
    expect(api?.size()).toBe(1);

    await act(async () => root.unmount());
    activeRoots.delete(root);

    const escape = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
  });
});
