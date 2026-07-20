import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DemoSourceBlock } from './component-example';
import { InstallToggle } from './install-toggle';

afterEach(() => {
  localStorage.clear();
});

function expectDisplayedSource(mode: 'npm' | 'registry', source: string) {
  const block = screen.getByText(`${mode} source`).closest('[data-slot="code-block"]');
  expect(block?.querySelector('[data-slot="code-block-code"]')).toHaveTextContent(source);
}

describe('primitive install mode', () => {
  it('switches installation commands and displayed source together', async () => {
    render(
      <>
        <InstallToggle
          npm={[{ code: 'pnpm add @constructive-io/ui' }]}
          registry={[{ code: 'pnpm dlx shadcn@4.13.1 add @constructive/select' }]}
        />
        <DemoSourceBlock source={{ npm: 'npm example source', registry: 'registry example source' }} />
      </>,
    );

    expect(screen.getByText('pnpm add @constructive-io/ui')).toBeVisible();
    expectDisplayedSource('npm', 'npm example source');

    fireEvent.click(screen.getByRole('tab', { name: 'registry' }));

    await waitFor(() => {
      expect(screen.getByText('pnpm dlx shadcn@4.13.1 add @constructive/select')).toBeVisible();
      expectDisplayedSource('registry', 'registry example source');
    });
    expect(localStorage.getItem('constructive:install-mode')).toBe('registry');
  });

  it('restores the persisted source mode after remounting', async () => {
    localStorage.setItem('constructive:install-mode', 'registry');

    render(<DemoSourceBlock source={{ npm: 'npm example source', registry: 'registry example source' }} />);

    await waitFor(() => expectDisplayedSource('registry', 'registry example source'));
    expect(screen.queryByText('npm source')).not.toBeInTheDocument();
  });

  it('supports arrow-key navigation across installation tabs', async () => {
    render(
      <InstallToggle
        npm={[{ code: 'npm command' }]}
        registry={[{ code: 'registry command' }]}
      />,
    );

    const npmTab = screen.getByRole('tab', { name: 'npm' });
    npmTab.focus();
    fireEvent.keyDown(npmTab, { key: 'ArrowRight' });

    const registryTab = screen.getByRole('tab', { name: 'registry' });
    await waitFor(() => expect(registryTab).toHaveAttribute('aria-selected', 'true'));
    expect(registryTab).toHaveFocus();
  });
});
