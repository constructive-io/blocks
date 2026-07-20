import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/docs/showcase-ui', () => ({
  getUiDemo: (name: string) =>
    function StaticDemo() {
      return <span data-showcase-demo={name} />;
    },
}));

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

import {
  HOME_SHOWCASE_DEMOS,
  HOME_SHOWCASE_ORDER,
} from './primitive-showcase-config';
import { PrimitiveShowcase } from './primitive-showcase';

afterEach(cleanup);

describe('PrimitiveShowcase', () => {
  it('covers the base primitive catalog exactly once', () => {
    const expected = BASE_PRIMITIVES.map(({ name }) => name).toSorted();

    expect(HOME_SHOWCASE_ORDER).toHaveLength(BASE_PRIMITIVES.length);
    expect([...HOME_SHOWCASE_ORDER].toSorted()).toEqual(expected);
    expect(Object.keys(HOME_SHOWCASE_DEMOS).toSorted()).toEqual(expected);
  });

  it('links every live specimen to its complete reference', async () => {
    const { container } = render(<PrimitiveShowcase />);

    await waitFor(() => {
      expect(container.querySelectorAll('[data-primitive]')).toHaveLength(BASE_PRIMITIVES.length);
    });

    for (const primitive of BASE_PRIMITIVES) {
      expect(screen.getByRole('link', { name: `${primitive.title} documentation` })).toHaveAttribute(
        'href',
        `/blocks/ui/${primitive.name}`,
      );
    }
  });
});
