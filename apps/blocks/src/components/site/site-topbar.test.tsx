import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('@/components/site/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

import { usePathname } from 'next/navigation';

import { SiteTopbar } from './site-topbar';

const mockUsePathname = vi.mocked(usePathname);
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockUsePathname.mockReturnValue('/');
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiteTopbar install command', () => {
  it('copies the exact registry item for the current component reference', async () => {
    mockUsePathname.mockReturnValue('/blocks/ui/breadcrumb');
    render(<SiteTopbar />);

    const copyButton = screen.getByRole('button', { name: 'Copy Breadcrumb install command' });
    expect(copyButton).toHaveTextContent('shadcn add @constructive/breadcrumb');

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('pnpm dlx shadcn@4.13.1 add @constructive/breadcrumb');
      expect(copyButton).toHaveAccessibleName('Breadcrumb install command copied');
    });
  });

  it('normalizes trailing slashes before resolving the registry item', () => {
    mockUsePathname.mockReturnValue('/blocks/ui/dialog/');
    render(<SiteTopbar />);

    expect(screen.getByRole('button', { name: 'Copy Dialog install command' })).toHaveTextContent(
      'shadcn add @constructive/dialog',
    );
  });

  it('copies the exact feature-pack registry root and exposes its breadcrumb', async () => {
    mockUsePathname.mockReturnValue('/blocks/features/organizations/');
    render(<SiteTopbar />);

    expect(screen.getByText('Organizations feature pack')).toBeVisible();
    const copyButton = screen.getByRole('button', {
      name: 'Copy Organizations feature pack install command',
    });
    expect(copyButton).toHaveTextContent('shadcn add @constructive/feature-pack-organizations');

    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('pnpm dlx shadcn@4.13.1 add @constructive/feature-pack-organizations');
    });
  });

  it('offers install actions for billing leaves and Console Kit', () => {
    mockUsePathname.mockReturnValue('/blocks/billing/billing-usage-overview');
    const { unmount } = render(<SiteTopbar />);
    expect(
      screen.getByRole('button', {
        name: 'Copy Usage overview install command',
      }),
    ).toHaveTextContent('shadcn add @constructive/billing-usage-overview');

    unmount();
    mockUsePathname.mockReturnValue('/blocks/console-kit');
    render(<SiteTopbar />);
    expect(screen.getByRole('button', { name: 'Copy Console Kit install command' })).toHaveTextContent(
      'shadcn add @constructive/console-kit-nextjs',
    );
  });

  it.each([
    '/',
    '/blocks',
    '/blocks/styling',
    '/blocks/features',
    '/blocks/features/not-a-pack',
    '/blocks/features/data/preview',
    '/blocks/ui/not-a-registry-item',
  ])('hides the install command on %s', (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    render(<SiteTopbar />);

    expect(screen.queryByRole('button', { name: /install command/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/shadcn add @constructive\//)).not.toBeInTheDocument();
  });
});
