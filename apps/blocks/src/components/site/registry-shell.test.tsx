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
        <main>Live preview</main>
      </RegistryShell>,
    );

    expect(screen.getByText('Live preview')).toBeVisible();
    expect(screen.queryByText('Docs sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('Docs topbar')).not.toBeInTheDocument();
  });

  it('keeps the documentation chrome on a feature-pack detail route', () => {
    mockUsePathname.mockReturnValue('/blocks/features/data');
    render(
      <RegistryShell>
        <main>Data docs</main>
      </RegistryShell>,
    );

    expect(screen.getByText('Docs sidebar')).toBeVisible();
    expect(screen.getByText('Docs topbar')).toBeVisible();
    expect(screen.getByText('Data docs')).toBeVisible();
  });
});
