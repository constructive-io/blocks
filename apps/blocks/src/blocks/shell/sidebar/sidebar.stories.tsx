'use client';

/**
 * sidebar.stories.tsx
 *
 * Storybook stories for ShellSidebar.
 * Six variants per spec implementation notes:
 *   1. Expanded (default)
 *   2. Collapsed (icon-only)
 *   3. With badge
 *   4. With sub-items
 *   5. Mobile drawer open (visual mock)
 *   6. Loading context (skeleton top slot)
 *
 * NOTE: next/navigation must be mocked at the Storybook level for usePathname
 * to resolve. A preview decorator handles this; stories pass pathname manually
 * as a static render hint via the topSlot prop where needed.
 */

// @storybook/react is not installed in apps/blocks — define minimal types inline
// so this file is valid TypeScript until Storybook is wired up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Meta<T> = { title: string; component: T; parameters?: any; decorators?: any[]; args?: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoryObj<_T> = { args?: any; decorators?: any[] };

import { ShellSidebar } from './sidebar';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const DashIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const baseNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashIcon /> },
  { label: 'Users', href: '/users', icon: <UsersIcon /> },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
];

const ContextSwitcherPlaceholder = ({ collapsed }: { collapsed: boolean }) => (
  <div className="flex items-center gap-2 w-full min-w-0">
    <div className="h-7 w-7 flex-shrink-0 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
      A
    </div>
    {!collapsed && (
      <span className="truncate text-sm font-medium text-foreground">Acme Corp</span>
    )}
  </div>
);

const AccountMenuPlaceholder = ({ collapsed }: { collapsed: boolean }) => (
  <div className="flex items-center gap-2 w-full min-w-0">
    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
      U
    </div>
    {!collapsed && (
      <span className="truncate text-sm text-muted-foreground">user@example.com</span>
    )}
  </div>
);

// Skeleton for loading context story
const SkeletonContextSwitcher = ({ collapsed }: { collapsed: boolean }) => (
  <div className="flex items-center gap-2 w-full min-w-0 animate-pulse">
    <div className="h-7 w-7 flex-shrink-0 rounded bg-muted" />
    {!collapsed && <div className="h-3 rounded bg-muted flex-1" />}
  </div>
);

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof ShellSidebar> = {
  title: 'Shell/ShellSidebar',
  component: ShellSidebar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Story: any) => (
      <div className="h-screen flex">
        <Story />
        <div className="flex-1 p-6 bg-background">
          <p className="text-muted-foreground text-sm">Main content area</p>
        </div>
      </div>
    ),
  ],
  args: {
    navItems: baseNavItems,
    topSlot: (collapsed: boolean) => <ContextSwitcherPlaceholder collapsed={collapsed} />,
    bottomSlot: (collapsed: boolean) => <AccountMenuPlaceholder collapsed={collapsed} />,
    persistCollapsed: false,
  },
};

export default meta;
type Story = StoryObj<typeof ShellSidebar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default expanded state — full-width with labels. */
export const Expanded: Story = {
  args: {
    defaultCollapsed: false,
  },
};

/** Icon-only collapsed state — 64 px rail. */
export const Collapsed: Story = {
  args: {
    defaultCollapsed: true,
  },
};

/** Nav item with a numeric badge (e.g. unread count). */
export const WithBadge: Story = {
  args: {
    navItems: [
      { label: 'Dashboard', href: '/dashboard', icon: <DashIcon /> },
      { label: 'Inbox', href: '/inbox', icon: <UsersIcon />, badge: 12 },
      { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
    ],
  },
};

/** Nav item with nested sub-items — expandable on click. */
export const WithSubItems: Story = {
  args: {
    navItems: [
      { label: 'Dashboard', href: '/dashboard', icon: <DashIcon /> },
      {
        label: 'Products',
        href: '/products',
        icon: <ProductsIcon />,
        children: [
          { label: 'All Products', href: '/products/all' },
          { label: 'Categories', href: '/products/categories' },
          { label: 'Inventory', href: '/products/inventory', badge: 3 },
        ],
      },
      { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
    ],
  },
};

/**
 * Mobile drawer open — sidebar rendered at full width in a fixed overlay.
 * In production, this would be driven by a `role="dialog"` + focus trap.
 * This story is a visual mock showing the sidebar in open drawer layout.
 */
export const MobileDrawerOpen: Story = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Story: any) => (
      <div className="relative h-screen bg-background">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 z-10" />
        {/* Drawer panel */}
        <div className="fixed inset-y-0 left-0 z-20 flex">
          <Story />
        </div>
        <div className="p-6">
          <p className="text-muted-foreground text-sm">Page content (behind drawer)</p>
        </div>
      </div>
    ),
  ],
  args: {
    defaultCollapsed: false,
  },
};

/**
 * Loading context — top slot shows a skeleton while user data loads.
 * Demonstrates the sidebar functioning correctly before context resolves.
 */
export const LoadingContext: Story = {
  args: {
    topSlot: (collapsed: boolean) => <SkeletonContextSwitcher collapsed={collapsed} />,
  },
};
