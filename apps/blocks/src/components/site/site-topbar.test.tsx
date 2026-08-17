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
    expect(copyButton).toHaveTextContent('pnpm dlx shadcn@latest add @constructive/breadcrumb');

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('pnpm dlx shadcn@latest add @constructive/breadcrumb');
      expect(copyButton).toHaveAccessibleName('Breadcrumb install command copied');
    });
  });

  it('copies the exact feature-pack registry root and exposes its breadcrumb', async () => {
    mockUsePathname.mockReturnValue('/blocks/features/organizations/');
    render(<SiteTopbar />);

    expect(screen.getByText('Organizations feature pack')).toBeVisible();
    const copyButton = screen.getByRole('button', {
      name: 'Copy Organizations feature pack install command',
    });
    expect(copyButton).toHaveTextContent('pnpm dlx shadcn@latest add @constructive/feature-pack-organizations');

    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('pnpm dlx shadcn@latest add @constructive/feature-pack-organizations');
    });
  });

  it('hides install commands for catalogs, previews, and unknown items', () => {
    for (const pathname of [
      '/blocks',
      '/blocks/features',
      '/blocks/features/data/preview',
      '/blocks/ui/not-a-registry-item',
    ]) {
      mockUsePathname.mockReturnValue(pathname);
      const view = render(<SiteTopbar />);
      expect(screen.queryByRole('button', { name: /install command/i }), pathname).not.toBeInTheDocument();
      view.unmount();
    }
  });
});
