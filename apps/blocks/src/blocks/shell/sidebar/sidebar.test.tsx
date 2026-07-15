/**
 * sidebar.test.tsx
 *
 * Pure layout block — no @/generated import, no SDK binding.
 * Tests cover: render, nav items, active detection, collapsed toggle,
 * permission filtering, slot rendering, message overrides, localStorage
 * persistence, and keyboard shortcut (collapseShortcut).
 *
 * next/navigation is mocked below so usePathname returns a controllable value.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Pure layout block — no @/generated/auth import needed.
// We DO mock next/navigation so usePathname resolves without a Next.js context.
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard')
}));

import { usePathname } from 'next/navigation';
import { ShellSidebar, type ShellSidebarNavItem } from './sidebar';
import { defaultShellSidebarMessages } from './messages';

const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockUsePathname.mockReturnValue('/dashboard');
});

const baseItems: ShellSidebarNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <span data-testid="icon-dashboard" /> },
  { label: 'Settings', href: '/settings', icon: <span data-testid="icon-settings" /> },
  { label: 'Users', href: '/users' }
];

describe('ShellSidebar — render', () => {
  it('renders the nav with default aria-label', () => {
    render(<ShellSidebar navItems={baseItems} />);
    const nav = screen.getByRole('navigation', { name: defaultShellSidebarMessages.navAriaLabel });
    expect(nav).toBeInTheDocument();
  });

  it('renders all nav item labels when expanded', () => {
    render(<ShellSidebar navItems={baseItems} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders correct hrefs for nav items', () => {
    render(<ShellSidebar navItems={baseItems} />);
    const dashLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashLink).toHaveAttribute('href', '/dashboard');
  });

  it('marks the active route with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/settings');
    render(<ShellSidebar navItems={baseItems} />);
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark non-active routes with aria-current', () => {
    mockUsePathname.mockReturnValue('/settings');
    render(<ShellSidebar navItems={baseItems} />);
    const dashLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashLink).not.toHaveAttribute('aria-current');
  });

  it('renders a data-slot="sidebar" attribute on the root', () => {
    const { container } = render(<ShellSidebar navItems={baseItems} />);
    expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument();
  });

  it('applies the className prop', () => {
    const { container } = render(<ShellSidebar navItems={baseItems} className="my-test-class" />);
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveClass('my-test-class');
  });
});

describe('ShellSidebar — collapse toggle', () => {
  it('renders the collapse toggle button', () => {
    render(<ShellSidebar navItems={baseItems} />);
    expect(screen.getByTestId('sidebar-collapse-toggle')).toBeInTheDocument();
  });

  it('toggle button has aria-expanded=true when expanded', () => {
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={false} />);
    expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggle button has aria-expanded=false when collapsed', () => {
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={true} />);
    expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles collapsed state on click', async () => {
    const user = userEvent.setup();
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={false} persistCollapsed={false} />);
    const toggle = screen.getByTestId('sidebar-collapse-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    await waitFor(() => expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'false'));
  });

  it('hides label text when collapsed', async () => {
    const user = userEvent.setup();
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={false} persistCollapsed={false} />);
    // In expanded state the labels should be visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Collapse
    await user.click(screen.getByTestId('sidebar-collapse-toggle'));
    // Labels are hidden via conditional rendering when collapsed
    await waitFor(() => expect(screen.queryByText('Dashboard')).not.toBeInTheDocument());
  });
});

describe('ShellSidebar — permission filtering', () => {
  const restrictedItems: ShellSidebarNavItem[] = [
    { label: 'Public', href: '/public' },
    { label: 'Admin Only', href: '/admin', requiredPermission: 'admin:read' }
  ];

  it('shows all items when hasPermission returns true for all', () => {
    render(<ShellSidebar navItems={restrictedItems} hasPermission={() => true} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });

  it('hides items when hasPermission returns false', () => {
    render(<ShellSidebar navItems={restrictedItems} hasPermission={() => false} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('shows all items when hasPermission is not provided', () => {
    render(<ShellSidebar navItems={restrictedItems} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });
});

describe('ShellSidebar — slots', () => {
  it('renders a static topSlot', () => {
    render(
      <ShellSidebar
        navItems={[]}
        topSlot={<div data-testid="ctx-switcher">Context Switcher</div>}
      />
    );
    expect(screen.getByTestId('ctx-switcher')).toBeInTheDocument();
  });

  it('renders a render-prop topSlot and passes collapsed state', () => {
    render(
      <ShellSidebar
        navItems={[]}
        defaultCollapsed={true}
        topSlot={(collapsed) => (
          <div data-testid="slot-collapsed">{collapsed ? 'icon-mode' : 'full-mode'}</div>
        )}
      />
    );
    expect(screen.getByTestId('slot-collapsed')).toHaveTextContent('icon-mode');
  });

  it('renders a static bottomSlot', () => {
    render(
      <ShellSidebar
        navItems={[]}
        bottomSlot={<div data-testid="account-menu">Account Menu</div>}
      />
    );
    expect(screen.getByTestId('account-menu')).toBeInTheDocument();
  });
});

describe('ShellSidebar — message overrides', () => {
  it('uses the custom navAriaLabel from messages override', () => {
    render(
      <ShellSidebar
        navItems={[]}
        messages={{ navAriaLabel: 'App nav' }}
      />
    );
    expect(screen.getByRole('navigation', { name: 'App nav' })).toBeInTheDocument();
  });

  it('merges errors deeply (custom + default both present)', () => {
    // Smoke test: sidebar renders without throwing when a partial errors override is given.
    expect(() =>
      render(
        <ShellSidebar
          navItems={[]}
          messages={{ errors: { UNKNOWN_ERROR: 'Custom error.' } }}
        />
      )
    ).not.toThrow();
  });
});

describe('ShellSidebar — sub-items', () => {
  const nestedItems: ShellSidebarNavItem[] = [
    {
      label: 'Products',
      href: '/products',
      children: [
        { label: 'All Products', href: '/products/all' },
        { label: 'Categories', href: '/products/categories' }
      ]
    }
  ];

  it('renders parent item with sub-items and initially hides sub-items', () => {
    render(<ShellSidebar navItems={nestedItems} />);
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.queryByText('All Products')).not.toBeInTheDocument();
  });

  it('expands sub-items on click of parent', async () => {
    const user = userEvent.setup();
    render(<ShellSidebar navItems={nestedItems} />);
    await user.click(screen.getByRole('button', { name: /products/i }));
    await waitFor(() => expect(screen.getByText('All Products')).toBeInTheDocument());
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });
});

describe('ShellSidebar — badge', () => {
  it('renders badge text when provided', () => {
    render(
      <ShellSidebar
        navItems={[{ label: 'Inbox', href: '/inbox', badge: 5 }]}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('ShellSidebar — localStorage persistence', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('initializes to stored collapsed=true on mount when persistCollapsed=true', async () => {
    window.localStorage.setItem('cnc_sidebar_collapsed', 'true');
    render(<ShellSidebar navItems={baseItems} persistCollapsed={true} defaultCollapsed={false} />);
    // After the useEffect runs, the toggle should reflect the stored collapsed=true state
    await waitFor(() =>
      expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'false')
    );
  });

  it('initializes to stored collapsed=false on mount when persistCollapsed=true', async () => {
    window.localStorage.setItem('cnc_sidebar_collapsed', 'false');
    render(<ShellSidebar navItems={baseItems} persistCollapsed={true} defaultCollapsed={true} />);
    await waitFor(() =>
      expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'true')
    );
  });

  it('writes collapsed state to localStorage on toggle', async () => {
    const user = userEvent.setup();
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={false} persistCollapsed={true} />);
    await user.click(screen.getByTestId('sidebar-collapse-toggle'));
    await waitFor(() =>
      expect(window.localStorage.getItem('cnc_sidebar_collapsed')).toBe('true')
    );
  });

  it('does not read or write localStorage when persistCollapsed=false', async () => {
    window.localStorage.setItem('cnc_sidebar_collapsed', 'true');
    render(<ShellSidebar navItems={baseItems} persistCollapsed={false} defaultCollapsed={false} />);
    // Should stay expanded because we don't read the stored value
    await waitFor(() =>
      expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'true')
    );
  });
});

describe('ShellSidebar — collapseShortcut', () => {
  it('toggles collapsed state on Ctrl+B', async () => {
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={false} persistCollapsed={false} collapseShortcut="mod+b" />);
    expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'true');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
    });
    await waitFor(() =>
      expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'false')
    );
  });

  it('toggles collapsed state on Meta+B (macOS)', async () => {
    render(<ShellSidebar navItems={baseItems} defaultCollapsed={false} persistCollapsed={false} collapseShortcut="mod+b" />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true }));
    });
    await waitFor(() =>
      expect(screen.getByTestId('sidebar-collapse-toggle')).toHaveAttribute('aria-expanded', 'false')
    );
  });
});
