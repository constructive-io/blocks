import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// PURE LAYOUT block: no @/generated import, no mutation mock needed.
// vi.mock('@/generated/auth') is omitted intentionally — this block calls no generated hook.

import { ShellHeader } from './header';
import { defaultShellHeaderMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Logo() {
  return <span>MyApp</span>;
}

function Breadcrumbs() {
  return <nav aria-label="breadcrumbs">Home / Orgs</nav>;
}

function AccountMenu() {
  return <button type="button">Account</button>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShellHeader', () => {
  it('renders the header landmark with default aria label', () => {
    render(<ShellHeader />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('aria-label', defaultShellHeaderMessages.headerAriaLabel);
  });

  it('sets data-slot="header"', () => {
    render(<ShellHeader />);
    expect(screen.getByRole('banner')).toHaveAttribute('data-slot', 'header');
  });

  it('renders logo slot when provided', () => {
    render(<ShellHeader logo={<Logo />} />);
    expect(screen.getByText('MyApp')).toBeInTheDocument();
  });

  it('renders breadcrumbs slot when showBreadcrumbs=true (default)', () => {
    render(<ShellHeader breadcrumbsSlot={<Breadcrumbs />} />);
    expect(screen.getByText('Home / Orgs')).toBeInTheDocument();
  });

  it('hides breadcrumbs slot when showBreadcrumbs=false', () => {
    render(<ShellHeader showBreadcrumbs={false} breadcrumbsSlot={<Breadcrumbs />} />);
    expect(screen.queryByText('Home / Orgs')).not.toBeInTheDocument();
  });

  it('renders account menu slot', () => {
    render(<ShellHeader accountMenuSlot={<AccountMenu />} />);
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('renders sidebar toggle with correct aria attrs', () => {
    render(<ShellHeader showSidebarToggle sidebarOpen={false} sidebarId="sidebar" />);
    const toggle = screen.getByTestId('sidebar-toggle');
    expect(toggle).toHaveAttribute('aria-label', defaultShellHeaderMessages.sidebarToggleAriaLabel);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'sidebar');
  });

  it('reflects sidebarOpen=true in aria-expanded', () => {
    render(<ShellHeader showSidebarToggle sidebarOpen={true} />);
    expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onSidebarToggle when hamburger is clicked', () => {
    const onSidebarToggle = vi.fn();
    render(<ShellHeader showSidebarToggle onSidebarToggle={onSidebarToggle} />);
    fireEvent.click(screen.getByTestId('sidebar-toggle'));
    expect(onSidebarToggle).toHaveBeenCalledTimes(1);
  });

  it('hides sidebar toggle when showSidebarToggle=false', () => {
    render(<ShellHeader showSidebarToggle={false} />);
    expect(screen.queryByTestId('sidebar-toggle')).not.toBeInTheDocument();
  });

  it('renders command palette trigger when showCommandPalette=true (default)', () => {
    render(<ShellHeader />);
    expect(screen.getByTestId('command-palette-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-trigger')).toHaveAttribute(
      'aria-label',
      defaultShellHeaderMessages.commandPaletteAriaLabel
    );
    expect(screen.getByTestId('command-palette-trigger')).toHaveAttribute('aria-keyshortcuts', 'Meta+k');
  });

  it('calls onCommandPaletteOpen when trigger is clicked', () => {
    const onCommandPaletteOpen = vi.fn();
    render(<ShellHeader onCommandPaletteOpen={onCommandPaletteOpen} />);
    fireEvent.click(screen.getByTestId('command-palette-trigger'));
    expect(onCommandPaletteOpen).toHaveBeenCalledTimes(1);
  });

  it('hides command palette trigger when showCommandPalette=false', () => {
    render(<ShellHeader showCommandPalette={false} />);
    expect(screen.queryByTestId('command-palette-trigger')).not.toBeInTheDocument();
  });

  it('does NOT call onCommandPaletteOpen on Cmd+K when showCommandPalette=false', () => {
    const onCommandPaletteOpen = vi.fn();
    render(<ShellHeader showCommandPalette={false} onCommandPaletteOpen={onCommandPaletteOpen} />);
    fireEvent.keyDown(screen.getByRole('banner'), { key: 'k', metaKey: true });
    expect(onCommandPaletteOpen).not.toHaveBeenCalled();
  });

  it('renders search input when showSearch=true', () => {
    render(<ShellHeader showSearch />);
    expect(screen.getByTestId('header-search')).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    const onSearchChange = vi.fn();
    render(<ShellHeader showSearch onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByTestId('header-search'), { target: { value: 'hello' } });
    expect(onSearchChange).toHaveBeenCalledWith('hello');
  });

  it('hides search input by default', () => {
    render(<ShellHeader />);
    expect(screen.queryByTestId('header-search')).not.toBeInTheDocument();
  });

  it('applies message overrides for headerAriaLabel', () => {
    render(<ShellHeader messages={{ headerAriaLabel: 'App nav' }} />);
    expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'App nav');
  });

  it('applies message overrides for commandPaletteShortcut', () => {
    render(<ShellHeader messages={{ commandPaletteShortcut: 'Ctrl+K' }} />);
    expect(screen.getByTestId('command-palette-trigger')).toHaveTextContent('Ctrl+K');
  });

  it('applies className to header element', () => {
    render(<ShellHeader className="custom-class" />);
    expect(screen.getByRole('banner')).toHaveClass('custom-class');
  });

  it('triggers onCommandPaletteOpen on Cmd+K keyboard shortcut', () => {
    const onCommandPaletteOpen = vi.fn();
    render(<ShellHeader onCommandPaletteOpen={onCommandPaletteOpen} />);
    fireEvent.keyDown(screen.getByRole('banner'), { key: 'k', metaKey: true });
    expect(onCommandPaletteOpen).toHaveBeenCalledTimes(1);
  });

  it('also triggers onCommandPaletteOpen on Ctrl+K', () => {
    const onCommandPaletteOpen = vi.fn();
    render(<ShellHeader onCommandPaletteOpen={onCommandPaletteOpen} />);
    fireEvent.keyDown(screen.getByRole('banner'), { key: 'k', ctrlKey: true });
    expect(onCommandPaletteOpen).toHaveBeenCalledTimes(1);
  });

  it('renders search role="search" wrapping form', () => {
    render(<ShellHeader showSearch />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
