import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const dynamicHarness = vi.hoisted(() => ({
  registrations: 0,
  loads: [] as number[],
}));

vi.mock('next/dynamic', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: (load: () => Promise<React.ComponentType>) => {
      const registration = dynamicHarness.registrations++;
      const LazyDemo = React.lazy(async () => {
        dynamicHarness.loads.push(registration);
        return { default: await load() };
      });

      return function TestDynamicDemo(props: Record<string, unknown>) {
        return React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(LazyDemo, props),
        );
      };
    },
  };
});

vi.mock('../preview-frame', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    PreviewFrame: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'preview-frame' }, children),
  };
});

import { BlockShowcase, DEMOS } from '@/components/docs/showcase';
import registry from '@/lib/docs/registry-data';

afterEach(() => {
  cleanup();
  dynamicHarness.loads.length = 0;
});

describe('live demo registry contract', () => {
  it('registers every demo without eagerly executing a module loader', () => {
    expect(dynamicHarness.registrations).toBe(Object.keys(DEMOS).length);
    expect(dynamicHarness.loads).toEqual([]);
  });

  it('resolves every showcase slug emitted by the generated docs manifest', () => {
    const manifestSlugs = new Set<string>();

    for (const page of registry.pages) {
      if (page.showcaseSlug) manifestSlugs.add(page.showcaseSlug);
      for (const section of page.sections) {
        if (section.showcaseSlug) manifestSlugs.add(section.showcaseSlug);
      }
    }

    expect([...manifestSlugs].sort()).toEqual(Object.keys(DEMOS).sort());
  });

  it('uses one literal, existing demo module for every registered slug', () => {
    const sourcePaths = [
      resolve(process.cwd(), 'src/components/docs/showcase.tsx'),
      resolve(process.cwd(), 'src/components/docs/showcase-ui.tsx'),
    ];
    const entries: Array<{ slug: string; specifier: string; sourcePath: string }> = [];
    const entryPattern = /(?:'([^']+)'|([a-z][a-z0-9-]*))\s*:\s*demo\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)\s*\)/g;

    for (const sourcePath of sourcePaths) {
      const source = readFileSync(sourcePath, 'utf8');
      const importArguments = [...source.matchAll(/\bimport\(\s*([^)]+?)\s*\)/g)].map((match) => match[1]);

      expect(source).not.toContain('import { BlockDemo');
      expect(importArguments.length).toBeGreaterThan(0);
      for (const argument of importArguments) {
        expect(argument).toMatch(/^'\.\/demos\/[a-z0-9-]+\.demo'$/);
      }

      for (const match of source.matchAll(entryPattern)) {
        const slug = match[1] ?? match[2];
        const specifier = match[3];
        entries.push({ slug, specifier, sourcePath });
      }
    }

    expect(entries.map(({ slug }) => slug).sort()).toEqual(Object.keys(DEMOS).sort());
    expect(new Set(entries.map(({ specifier }) => specifier)).size).toBe(entries.length);

    for (const { specifier, sourcePath } of entries) {
      expect(existsSync(`${resolve(dirname(sourcePath), specifier)}.tsx`), specifier).toBe(true);
    }
  });

  it('loads exactly the one requested demo module', async () => {
    render(<BlockShowcase slug="ui-button" />);

    expect(await screen.findByRole('button', { name: 'Create database' })).toBeVisible();
    expect(dynamicHarness.loads).toHaveLength(1);
  });

  it('keeps an unknown slug calm without requesting a demo module', async () => {
    render(<BlockShowcase slug="not-a-real-demo" />);

    expect(screen.getByText(/No live preview is registered for/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Browse the block registry/ })).toHaveAttribute('href', '/blocks');
    await waitFor(() => expect(dynamicHarness.loads).toEqual([]));
  });
});
