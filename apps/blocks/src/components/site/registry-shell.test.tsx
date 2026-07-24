import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('@/components/site/site-sidebar', () => ({
  SiteSidebar: () => <aside>Docs sidebar</aside>,
}));

vi.mock('@/components/site/site-topbar', () => ({
  SiteTopbar: () => <header>Docs topbar</header>,
}));

import { usePathname } from 'next/navigation';

import { RegistryShell } from './registry-shell';

const mockUsePathname = vi.mocked(usePathname);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RegistryShell standalone previews', () => {
  it.each([
    '/blocks/billing/billing-settings-page/preview',
    '/blocks/features/data/preview',
    '/blocks/features/notifications/preview/',
  ])('omits recursive documentation chrome on %s', (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    render(
      <RegistryShell>
        <div>Live preview</div>
      </RegistryShell>,
    );

    expect(screen.getByText('Live preview')).toBeVisible();
    expect(screen.queryByText('Docs sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('Docs topbar')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('lets the Console Kit app shell own the integration main landmark', () => {
    mockUsePathname.mockReturnValue('/__integration/console-kit');
    render(
      <RegistryShell>
        <main id='main-content'>Console Kit</main>
      </RegistryShell>
    );

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('keeps the documentation chrome on a feature-pack detail route', () => {
    mockUsePathname.mockReturnValue('/blocks/features/data');
    render(
      <RegistryShell>
        <div>Data docs</div>
      </RegistryShell>,
    );

    expect(screen.getByText('Docs sidebar')).toBeVisible();
    expect(screen.getByText('Docs topbar')).toBeVisible();
    expect(screen.getByText('Data docs')).toBeVisible();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
