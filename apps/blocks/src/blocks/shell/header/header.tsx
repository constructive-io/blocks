'use client';

/**
 * shell-header  (registry: shell-header)
 *
 * PURE LAYOUT — no data fetching, no generated-hook imports, no requires.json.
 * Top application bar providing:
 *   - A logo/wordmark slot (left)
 *   - An optional breadcrumbs slot (center-left)
 *   - An optional search input
 *   - An optional command-palette trigger (Cmd+K)
 *   - An account-menu slot (right)
 *   - A sidebar hamburger toggle (mobile only, < lg breakpoint)
 *
 * Height: 56px (h-14). Sticky positioned (sticky top-0 z-40).
 * Full-width header — NOT a centered max-w-sm card.
 *
 * Delegates data-fetching entirely to child blocks passed via props or
 * the `children` / `breadcrumbsSlot` / `accountMenuSlot` slot props.
 */

import React from 'react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Separator } from '@constructive-io/ui/separator';

import { cn } from '@/lib/utils';

import { defaultShellHeaderMessages, type ShellHeaderMessages } from './messages';

// ---------------------------------------------------------------------------
// Message overrides type
// ---------------------------------------------------------------------------

export type ShellHeaderMessageOverrides = Partial<Omit<ShellHeaderMessages, 'errors'>> & {
  errors?: Partial<ShellHeaderMessages['errors']>;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ShellHeaderProps = {
  /** Logo / wordmark rendered left of breadcrumbs. Accepts any ReactNode. */
  logo?: React.ReactNode;
  /** Slot for a breadcrumbs component (e.g. shell-breadcrumbs). Default: nothing. */
  breadcrumbsSlot?: React.ReactNode;
  /** Slot for an account-menu component (e.g. shell-account-menu). Default: nothing. */
  accountMenuSlot?: React.ReactNode;
  /** Show breadcrumbs section. Default: true */
  showBreadcrumbs?: boolean;
  /** Show search input. Default: false */
  showSearch?: boolean;
  /** Placeholder text for the search input. Takes precedence over messages.searchPlaceholder. */
  searchPlaceholder?: string;
  /** Fired when the user types in the search input. */
  onSearchChange?: (value: string) => void;
  /** Show command palette trigger button (Cmd+K). Default: true */
  showCommandPalette?: boolean;
  /** Show sidebar hamburger toggle. Default: true */
  showSidebarToggle?: boolean;
  /** Sidebar is currently open (for mobile drawer state). Default: false */
  sidebarOpen?: boolean;
  /**
   * DOM id of the sidebar element; forwarded as `aria-controls` on the
   * hamburger button so screen-readers can identify the controlled element.
   */
  sidebarId?: string;
  /** Called when the hamburger button is clicked — parent manages sidebar state. */
  onSidebarToggle?: () => void;
  /** Fires when the command palette trigger is clicked. */
  onCommandPaletteOpen?: () => void;
  messages?: ShellHeaderMessageOverrides;
  /** Fires when an error occurs (e.g. propagated from a child block). */
  onError?: (err: unknown) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShellHeader({
  logo,
  breadcrumbsSlot,
  accountMenuSlot,
  showBreadcrumbs = true,
  showSearch = false,
  searchPlaceholder,
  onSearchChange,
  showCommandPalette = true,
  showSidebarToggle = true,
  sidebarOpen = false,
  sidebarId,
  onSidebarToggle,
  onCommandPaletteOpen,
  messages: messageOverrides,
  // onError is accepted per spec but is a no-op on this pure layout block.
  // No error conditions originate here; child errors bubble via slot composition.
  onError: _onError,
  className
}: ShellHeaderProps) {
  // Deep merge: top-level copy + errors object merged separately.
  const merged: ShellHeaderMessages = {
    ...defaultShellHeaderMessages,
    ...messageOverrides,
    errors: { ...defaultShellHeaderMessages.errors, ...messageOverrides?.errors }
  };
  // Direct prop takes precedence over messages.searchPlaceholder (spec line 56).
  const resolvedSearchPlaceholder = searchPlaceholder ?? merged.searchPlaceholder;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSearchChange?.(e.target.value);
  }

  function handleCommandPaletteKeyDown(e: React.KeyboardEvent) {
    // Guard: if the feature is disabled, ignore keyboard shortcuts too.
    if (!showCommandPalette) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onCommandPaletteOpen?.();
    }
  }

  return (
    <header
      data-slot="header"
      role="banner"
      aria-label={merged.headerAriaLabel}
      className={cn(
        'bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border/40 sticky top-0 z-40 w-full border-b backdrop-blur',
        className
      )}
      onKeyDown={handleCommandPaletteKeyDown}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        {/* ── Sidebar hamburger toggle (mobile only) ────────────────────── */}
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            aria-label={merged.sidebarToggleAriaLabel}
            aria-controls={sidebarId}
            aria-expanded={sidebarOpen}
            onClick={onSidebarToggle}
            data-testid="sidebar-toggle"
          >
            {/* Hamburger icon — three horizontal lines */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </Button>
        )}

        {/* ── Logo / wordmark slot ─────────────────────────────────────── */}
        {logo && (
          <>
            <div className="flex shrink-0 items-center">{logo}</div>
            <Separator orientation="vertical" className="mx-1 h-5" />
          </>
        )}

        {/* ── Breadcrumbs slot ─────────────────────────────────────────── */}
        {showBreadcrumbs && breadcrumbsSlot && (
          <div className="min-w-0 flex-1">{breadcrumbsSlot}</div>
        )}

        {/* ── Spacer (pushes right-side items to the end) ──────────────── */}
        {!(showBreadcrumbs && breadcrumbsSlot) && <div className="flex-1" />}

        {/* ── Search input ─────────────────────────────────────────────── */}
        {showSearch && (
          <form role="search" className="hidden sm:block">
            <Input
              type="search"
              placeholder={resolvedSearchPlaceholder}
              className="w-48 md:w-64"
              onChange={handleSearchChange}
              data-testid="header-search"
            />
          </form>
        )}

        {/* ── Command palette trigger (Cmd+K) ──────────────────────────── */}
        {showCommandPalette && (
          <Button
            variant="outline"
            className="text-muted-foreground hidden h-8 gap-2 px-3 text-sm sm:flex"
            aria-label={merged.commandPaletteAriaLabel}
            aria-keyshortcuts="Meta+k"
            onClick={onCommandPaletteOpen}
            data-testid="command-palette-trigger"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="hidden md:inline">Search</span>
            <kbd className="bg-muted pointer-events-none inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium opacity-100">
              {merged.commandPaletteShortcut}
            </kbd>
          </Button>
        )}

        {/* ── Account menu slot ────────────────────────────────────────── */}
        {accountMenuSlot && (
          <div className="flex shrink-0 items-center">{accountMenuSlot}</div>
        )}
      </div>
    </header>
  );
}
