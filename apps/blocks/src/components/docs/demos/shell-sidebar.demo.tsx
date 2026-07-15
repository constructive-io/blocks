'use client';

import { useState } from 'react';

import { ShellSidebar, type ShellSidebarNavItem } from '@/blocks/shell/sidebar/sidebar';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

// ---------------------------------------------------------------------------
// Inline icon helpers (no external icon dep)
// ---------------------------------------------------------------------------

function DashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Slot placeholders (mimic real consumer blocks without pulling in SDK)
// ---------------------------------------------------------------------------

function ContextSwitcher({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <div className="h-7 w-7 flex-shrink-0 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
        A
      </div>
      {!collapsed && (
        <span className="truncate text-sm font-medium text-foreground">Acme Corp</span>
      )}
    </div>
  );
}

function AccountMenuSlot({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
        U
      </div>
      {!collapsed && (
        <span className="truncate text-sm text-muted-foreground">user@acme.com</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav item sets
// ---------------------------------------------------------------------------

const baseNavItems: ShellSidebarNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashIcon /> },
  { label: 'Users', href: '/users', icon: <UsersIcon />, badge: 4 },
  {
    label: 'Products',
    href: '/products',
    icon: <ProductsIcon />,
    children: [
      { label: 'All Products', href: '/products/all' },
      { label: 'Categories', href: '/products/categories' },
      { label: 'Inventory', href: '/products/inventory', badge: 2 },
    ],
  },
  { label: 'Inbox', href: '/inbox', icon: <InboxIcon />, badge: 12 },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
];

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

type Variant = 'expanded' | 'collapsed';

export function BlockDemo() {
  const [variant, setVariant] = useState<Variant>('expanded');

  return (
    <Demo>
      <Segmented
        label="Mode"
        value={variant}
        options={['expanded', 'collapsed'] as const}
        onChange={setVariant}
      />
      <div className="w-full max-w-xs rounded-lg border border-border/60 overflow-hidden" style={{ height: 480 }}>
        <ShellSidebar
          navItems={baseNavItems}
          defaultCollapsed={variant === 'collapsed'}
          persistCollapsed={false}
          topSlot={(collapsed) => <ContextSwitcher collapsed={collapsed} />}
          bottomSlot={(collapsed) => <AccountMenuSlot collapsed={collapsed} />}
        />
      </div>
    </Demo>
  );
}
