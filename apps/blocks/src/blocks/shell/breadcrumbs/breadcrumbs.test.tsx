import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ShellBreadcrumbs is a PURE LAYOUT primitive — no data hook, no @/generated
// import. We still mock next/navigation so usePathname() is controllable
// without a real Next.js app context.
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/')
}));

import { usePathname } from 'next/navigation';
import { ShellBreadcrumbs } from './breadcrumbs';
import { defaultShellBreadcrumbsMessages } from './messages';

const mockPathname = usePathname as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPathname.mockReturnValue('/');
});

describe('ShellBreadcrumbs', () => {
  it('renders with a home crumb on root path', () => {
    render(<ShellBreadcrumbs />);
    // nav landmark present with default aria-label
    expect(screen.getByRole('navigation', { name: defaultShellBreadcrumbsMessages.navAriaLabel })).toBeInTheDocument();
    // Home link is present (screen reader text)
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders explicit segments instead of parsing pathname', () => {
    const segments = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/dashboard/settings' },
      { label: 'Profile' }
    ];
    render(<ShellBreadcrumbs segments={segments} showHome={false} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('parses a multi-segment pathname and capitalizes labels', () => {
    mockPathname.mockReturnValue('/settings/security');
    render(<ShellBreadcrumbs showHome={false} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders last crumb as non-link (BreadcrumbPage)', () => {
    const segments = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Current Page' }
    ];
    render(<ShellBreadcrumbs segments={segments} showHome={false} />);
    // The last crumb should NOT be a link
    const currentPage = screen.getByText('Current Page');
    expect(currentPage.tagName).not.toBe('A');
    expect(currentPage.closest('a')).toBeNull();
  });

  it('renders intermediate crumbs as links', () => {
    const segments = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/dashboard/settings' },
      { label: 'Profile' }
    ];
    render(<ShellBreadcrumbs segments={segments} showHome={false} />);

    const dashLink = screen.getByText('Dashboard').closest('a');
    expect(dashLink).toHaveAttribute('href', '/dashboard');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/dashboard/settings');
  });

  it('collapses middle crumbs with ellipsis when exceeding maxVisible', () => {
    const segments = [
      { label: 'A', href: '/a' },
      { label: 'B', href: '/a/b' },
      { label: 'C', href: '/a/b/c' },
      { label: 'D', href: '/a/b/c/d' },
      { label: 'E' }
    ];
    render(<ShellBreadcrumbs segments={segments} showHome={false} maxVisible={3} />);

    // First and last should be visible
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();

    // Middle items B, C, D should be hidden
    expect(screen.queryByText('B')).not.toBeVisible || expect(screen.queryByText('B')).toBeNull();

    // Ellipsis button should be present
    const ellipsisBtn = screen.getByRole('button', { name: defaultShellBreadcrumbsMessages.ellipsisAriaLabel });
    expect(ellipsisBtn).toBeInTheDocument();
  });

  it('expands all crumbs when ellipsis is clicked', async () => {
    const user = userEvent.setup();
    const segments = [
      { label: 'A', href: '/a' },
      { label: 'B', href: '/a/b' },
      { label: 'C', href: '/a/b/c' },
      { label: 'D', href: '/a/b/c/d' },
      { label: 'E' }
    ];
    render(<ShellBreadcrumbs segments={segments} showHome={false} maxVisible={3} />);

    const ellipsisBtn = screen.getByRole('button', { name: defaultShellBreadcrumbsMessages.ellipsisAriaLabel });
    await user.click(ellipsisBtn);

    await waitFor(() => {
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });

  it('does NOT show home crumb when showHome=false', () => {
    render(<ShellBreadcrumbs showHome={false} />);
    expect(screen.queryByText('Home')).toBeNull();
  });

  it('respects custom homeHref when there are additional segments', () => {
    // On root path alone, home is the only crumb so it renders as BreadcrumbPage (no link).
    // Provide an explicit segment to ensure home is not the last crumb.
    render(
      <ShellBreadcrumbs
        homeHref="/app"
        segments={[{ label: 'Dashboard', href: '/app/dashboard' }, { label: 'Profile' }]}
      />
    );
    const homeLink = screen.getByRole('link', { name: defaultShellBreadcrumbsMessages.homeAriaLabel });
    expect(homeLink).toHaveAttribute('href', '/app');
  });

  it('applies async resolveLabel and updates labels when promise resolves', async () => {
    mockPathname.mockReturnValue('/orgs/abc-123');
    const resolveLabel = vi.fn(async (segment: string) => {
      if (segment === 'abc-123') return 'My Org';
      return null;
    });

    render(<ShellBreadcrumbs resolveLabel={resolveLabel} showHome={false} />);

    // Initially shows placeholder (capitalized raw segment)
    // After async resolution, shows resolved label
    await waitFor(() => {
      expect(screen.getByText('My Org')).toBeInTheDocument();
    });
    expect(resolveLabel).toHaveBeenCalledWith('abc-123', '/orgs/abc-123');
  });

  it('calls onError and falls back to capitalized segment when resolveLabel throws', async () => {
    mockPathname.mockReturnValue('/items/bad-id');
    const onError = vi.fn();
    const resolveLabel = vi.fn(async () => {
      throw new Error('fetch failed');
    });

    render(<ShellBreadcrumbs resolveLabel={resolveLabel} showHome={false} onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(2); // both segments fail
    });

    // Fallback: capitalized raw segments
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Bad-id')).toBeInTheDocument();
  });

  it('accepts messages overrides for navAriaLabel', () => {
    render(
      <ShellBreadcrumbs
        messages={{ navAriaLabel: 'Custom Nav' }}
      />
    );
    expect(screen.getByRole('navigation', { name: 'Custom Nav' })).toBeInTheDocument();
  });

  it('applies className to the root element', () => {
    const { container } = render(<ShellBreadcrumbs className="custom-class" />);
    const nav = container.querySelector('[data-slot="breadcrumbs"]');
    expect(nav).toHaveClass('custom-class');
  });

  it('has data-slot="breadcrumbs" on the root element', () => {
    const { container } = render(<ShellBreadcrumbs />);
    expect(container.querySelector('[data-slot="breadcrumbs"]')).toBeInTheDocument();
  });
});
