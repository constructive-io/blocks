'use client';

/**
 * sidebar  (registry: shell-sidebar)
 *
 * Pure-layout application sidebar — the primary navigation rail for consumer
 * app shells. Contains:
 *   - top slot: children / context-switcher (render-prop or React node)
 *   - middle: nav items from the `navItems` prop
 *   - bottom: children-bottom slot (account menu etc.)
 *
 * PURE LAYOUT — no SDK binding, no @/generated import, no requires.json.
 * All data fetching is delegated to child blocks (user-context-switcher,
 * shell-account-menu). Collapses to icon-only mode, persists collapsed
 * state to localStorage, and announces the toggle via aria-expanded.
 *
 * spec: planning/blocks/shell/shell-sidebar.md
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { cn } from '@/lib/utils';

import { defaultShellSidebarMessages, type ShellSidebarMessages } from './messages';

// ---------------------------------------------------------------------------
// Module-level custom hook — safe try-catch (not inside a render function)
// ---------------------------------------------------------------------------

/**
 * Calls usePathname() unconditionally as required by React's Rules of Hooks.
 * The try-catch lives inside this custom hook, NOT inside a component render
 * function, so the hook call count is always stable across renders. Returns
 * null when outside a Next.js App Router context (tests, Storybook).
 */
function useOptionalPathname(): string | null {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePathname();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single item in the nav list. */
export type ShellSidebarNavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  /**
   * Client-side hide only. Server RLS is the actual security gate.
   * A hidden item is simply not rendered — it is NOT access-controlled by this block.
   */
  requiredPermission?: string;
  badge?: string | number;
  /** Nested sub-items (renders as collapsible group). */
  children?: ShellSidebarNavItem[];
};

/** Minimal User type — same shape as user-context-switcher. */
export type User = {
  id: string;
  /** Normalized from GraphQL `Int!` (1 → 'person', 2 → 'organization'). */
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  profilePicture: string | null;
};

/** Message overrides: shallow partial at the top level, partial inside errors. */
export type ShellSidebarMessageOverrides = Partial<Omit<ShellSidebarMessages, 'errors'>> & {
  errors?: Partial<ShellSidebarMessages['errors']>;
};

export type ShellSidebarProps = {
  /** Nav items rendered in the middle section. Required. */
  navItems: ShellSidebarNavItem[];
  /**
   * Top slot — typically a UserContextSwitcher. Receives collapsed state so
   * children can adapt their own layout (collapsed icon vs expanded row).
   * May also be a plain React node (collapsed state is ignored in that case).
   */
  topSlot?: React.ReactNode | ((collapsed: boolean) => React.ReactNode);
  /**
   * Bottom slot — typically a ShellAccountMenu. Receives collapsed state.
   */
  bottomSlot?: React.ReactNode | ((collapsed: boolean) => React.ReactNode);
  /**
   * Client-side permission gate: a function that returns true when the user
   * has the given permission string. Items with `requiredPermission` are
   * hidden when this returns false. Server RLS remains the security gate.
   */
  hasPermission?: (permission: string) => boolean;
  /** Start in collapsed (icon-only) mode. Default: false. */
  defaultCollapsed?: boolean;
  /** Persist collapsed state to localStorage. Default: true. */
  persistCollapsed?: boolean;
  /** localStorage key for collapsed state. Default: 'cnc_sidebar_collapsed'. */
  persistKey?: string;
  /**
   * Keyboard shortcut to toggle collapsed state. Default: 'mod+b'.
   * 'mod' resolves to Meta on macOS and Ctrl on other platforms.
   * Announced via a visually-hidden <kbd> hint in the expanded tooltip.
   */
  collapseShortcut?: string;
  messages?: ShellSidebarMessageOverrides;
  /** Forwarded to child blocks when using render-prop topSlot. */
  onContextSwitch?: (user: User) => void;
  /** Forwarded to child blocks when using render-prop topSlot. */
  onCreateOrgClick?: () => void;
  onError?: (err: unknown) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Expanded width in px. */
const EXPANDED_WIDTH = 240;
/** Collapsed (icon-only) width in px. */
const COLLAPSED_WIDTH = 64;
/** Default localStorage key. */
const DEFAULT_PERSIST_KEY = 'cnc_sidebar_collapsed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read collapsed state from localStorage safely (SSR guard). */
function readCollapsed(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}

/** Write collapsed state to localStorage safely. */
function writeCollapsed(key: string, collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(collapsed));
  } catch {
    // ignore quota / security errors
  }
}

/** Render a slot — supports both static nodes and render-props. */
function renderSlot(
  slot: React.ReactNode | ((collapsed: boolean) => React.ReactNode) | undefined,
  collapsed: boolean
): React.ReactNode {
  if (slot === undefined || slot === null) return null;
  if (typeof slot === 'function') return slot(collapsed);
  return slot;
}

// ---------------------------------------------------------------------------
// NavItem
// ---------------------------------------------------------------------------

type NavItemProps = {
  item: ShellSidebarNavItem;
  collapsed: boolean;
  isActive: boolean;
  pathname?: string | null;
};

function NavItem({ item, collapsed, isActive, pathname }: NavItemProps) {
  const [subOpen, setSubOpen] = useState(false);
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const itemContent = (
    <>
      {item.icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {item.icon}
        </span>
      )}
      {!collapsed && (
        <span className="flex-1 truncate text-sm">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && (
        <span className="ml-auto flex-shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {item.badge}
        </span>
      )}
    </>
  );

  const baseClasses = cn(
    'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5',
    'transition-colors duration-150',
    isActive
      ? 'bg-accent text-accent-foreground font-medium'
      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
    collapsed && 'justify-center px-0'
  );

  if (collapsed) {
    // In icon-only mode, items with children are shown as a link to the parent
    // href (CSS-only expand not implemented yet — icon provides a navigable
    // fallback so sub-navigation is not silently inaccessible).
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={baseClasses}
            >
              {itemContent}
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (hasChildren) {
    return (
      <div>
        {/* text-left — buttons default to text-align:center, which centers the
            flex-1 label span's text and misaligns it from the sibling <a> items */}
        <button
          type="button"
          aria-expanded={subOpen}
          onClick={() => setSubOpen((v) => !v)}
          className={cn(baseClasses, 'cursor-pointer select-none text-left')}
        >
          {itemContent}
          <svg
            aria-hidden="true"
            className={cn('ml-auto size-3 flex-shrink-0 transition-transform', subOpen && 'rotate-90')}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {subOpen && (
          <div className="ml-4 mt-0.5 border-l border-border/60 pl-2.5 space-y-0.5">
            {item.children!.map((child) => {
              const childActive = pathname !== null && pathname !== undefined && pathname === child.href;
              return (
                <a
                  key={child.href}
                  href={child.href}
                  aria-current={childActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    childActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  )}
                >
                  {child.icon && <span aria-hidden="true">{child.icon}</span>}
                  <span className="truncate">{child.label}</span>
                  {child.badge !== undefined && (
                    <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {child.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={baseClasses}
    >
      {itemContent}
    </a>
  );
}

// ---------------------------------------------------------------------------
// CollapseToggle
// ---------------------------------------------------------------------------

type CollapseToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
  collapseTooltip: string;
  expandTooltip: string;
  /** Displayed as a visually-hidden <kbd> hint in the expanded-state tooltip. */
  collapseShortcut?: string;
};

function CollapseToggle({ collapsed, onToggle, collapseTooltip, expandTooltip, collapseShortcut }: CollapseToggleProps) {
  const tooltip = collapsed ? expandTooltip : collapseTooltip;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={!collapsed}
            aria-label={tooltip}
            onClick={onToggle}
            className="size-7 text-muted-foreground hover:text-foreground"
            data-testid="sidebar-collapse-toggle"
          >
            {collapsed ? (
              <svg
                aria-hidden="true"
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <polyline points="15 8 9 12 15 16" />
              </svg>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {tooltip}
          {/* Spec §accessibility: visually-hidden kbd hint shown when expanded */}
          {!collapsed && collapseShortcut && (
            <kbd className="sr-only">{collapseShortcut}</kbd>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// ShellSidebar
// ---------------------------------------------------------------------------

export function ShellSidebar({
  navItems,
  topSlot,
  bottomSlot,
  hasPermission,
  defaultCollapsed = false,
  persistCollapsed = true,
  persistKey = DEFAULT_PERSIST_KEY,
  collapseShortcut = 'mod+b',
  messages: messageOverrides,
  // onContextSwitch and onCreateOrgClick are spec-required props forwarded to
  // render-prop topSlot consumers. Destructured here so they are in scope;
  // forwarding via render-prop is the consumer's responsibility when they
  // compose the topSlot inline. Exposed on the props surface per the spec.
  onContextSwitch: _onContextSwitch,
  onCreateOrgClick: _onCreateOrgClick,
  onError: _onError,
  className
}: ShellSidebarProps) {
  // Deep merge messages.
  const merged: ShellSidebarMessages = {
    ...defaultShellSidebarMessages,
    ...messageOverrides,
    errors: { ...defaultShellSidebarMessages.errors, ...messageOverrides?.errors }
  };

  // Collapsed state — initialized from localStorage (SSR-safe: runs in useEffect).
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!persistCollapsed) return;
    const stored = readCollapsed(persistKey);
    if (stored !== null) setCollapsed(stored);
  }, [persistCollapsed, persistKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (persistCollapsed) writeCollapsed(persistKey, next);
      return next;
    });
  }, [persistCollapsed, persistKey]);

  // Active pathname — useOptionalPathname() is called unconditionally (top-level
  // custom hook); the try-catch lives inside that hook at module scope, not here.
  const pathname = useOptionalPathname();

  // Keyboard shortcut listener (spec §accessibility — Mod+B toggle).
  useEffect(() => {
    if (!collapseShortcut) return;
    const parts = collapseShortcut.toLowerCase().split('+');
    const needsMod = parts.includes('mod');
    const key = parts[parts.length - 1];

    function onKeyDown(e: KeyboardEvent) {
      const modActive = needsMod ? (e.metaKey || e.ctrlKey) : true;
      if (modActive && e.key.toLowerCase() === key) {
        e.preventDefault();
        toggleCollapsed();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [collapseShortcut, toggleCollapsed]);

  // Filter items by client-side permission (server RLS is the real gate).
  const visibleItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    if (!hasPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <aside
      data-slot="sidebar"
      style={{ width }}
      className={cn(
        'relative flex flex-col h-full',
        'border-r border-border/60 bg-background',
        'transition-all duration-200 ease-in-out',
        'overflow-hidden',
        className
      )}
    >
      {/* Top slot */}
      <div className={cn('flex items-center px-3 py-3', collapsed && 'justify-center px-0 py-3')}>
        {renderSlot(topSlot, collapsed)}
      </div>

      <Separator />

      {/* Nav */}
      <nav
        aria-label={merged.navAriaLabel}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5"
      >
        {visibleItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={pathname !== null && pathname === item.href}
            pathname={pathname}
          />
        ))}
      </nav>

      <Separator />

      {/* Bottom slot */}
      <div className={cn('px-3 py-3', collapsed && 'flex justify-center px-0 py-3')}>
        {renderSlot(bottomSlot, collapsed)}
      </div>

      {/* Collapse toggle — pinned to bottom-right corner */}
      <div className={cn('flex px-2 pb-2', collapsed ? 'justify-center' : 'justify-end')}>
        <CollapseToggle
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          collapseTooltip={merged.collapseTooltip}
          expandTooltip={merged.expandTooltip}
          collapseShortcut={collapseShortcut}
        />
      </div>
    </aside>
  );
}
