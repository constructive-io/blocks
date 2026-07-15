import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Component-level tests for ShellCommandPalette.
//
// Permission filtering (requiredPermission vs session permissions) is performed
// by use-command-palette.ts — tested in a separate describe block below. The
// component itself renders whatever commands it receives without further filtering.
//
// Mock @constructive-io/ui/command to avoid cmdk's ResizeObserver dependency in
// jsdom. The component logic (grouping, open state, keyboard shortcut, async
// onSelect error handling) is fully testable via the thin DOM stubs below.

vi.mock('@constructive-io/ui/command', () => {
  const React = require('react');

  function CommandDialog({
    open,
    onOpenChange,
    children,
    ...props
  }: {
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    children?: React.ReactNode;
    [k: string]: unknown;
  }) {
    if (!open) return null;
    return (
      <div data-testid="command-dialog" role="dialog" {...props}>
        <button
          aria-label="close"
          data-testid="dialog-close"
          onClick={() => onOpenChange?.(false)}
        />
        {children}
      </div>
    );
  }

  function Command({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) {
    return <div data-testid="command" {...props}>{children}</div>;
  }

  function CommandInput({
    placeholder,
    ...props
  }: { placeholder?: string; [k: string]: unknown }) {
    return <input data-testid="command-input" placeholder={placeholder} {...props} />;
  }

  function CommandList({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) {
    return <div data-testid="command-list" role="listbox" {...props}>{children}</div>;
  }

  function CommandEmpty({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) {
    return <div data-testid="command-empty" {...props}>{children}</div>;
  }

  function CommandGroup({
    children,
    heading,
    ...props
  }: { children?: React.ReactNode; heading?: React.ReactNode; [k: string]: unknown }) {
    return (
      <div data-testid={`command-group-${String(props['data-testid']).replace('command-group-', '')}`} role="group" {...props}>
        {heading && <div data-testid="command-group-heading">{heading}</div>}
        {children}
      </div>
    );
  }

  function CommandItem({
    children,
    onSelect,
    value: _value,
    ...props
  }: { children?: React.ReactNode; onSelect?: () => void; value?: string; [k: string]: unknown }) {
    return (
      <div
        role="option"
        aria-selected={false}
        onClick={onSelect}
        {...props}
      >
        {children}
      </div>
    );
  }

  function CommandShortcut({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) {
    return <kbd {...props}>{children}</kbd>;
  }

  return {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
  };
});

import { ShellCommandPalette } from './command-palette';
import type { CommandRegistryEntry } from './command-palette';
import { defaultShellCommandPaletteMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCmd(overrides: Partial<CommandRegistryEntry> = {}): CommandRegistryEntry {
  return {
    id: 'test-cmd',
    label: 'Test Command',
    group: 'navigation',
    onSelect: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShellCommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the palette when closed', () => {
    render(<ShellCommandPalette open={false} commands={[makeCmd()]} />);
    expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument();
  });

  it('renders the command list when open', async () => {
    render(
      <ShellCommandPalette
        open={true}
        commands={[makeCmd({ id: 'settings', label: 'Go to settings', group: 'navigation' })]}
      />
    );
    expect(await screen.findByTestId('command-item-settings')).toBeInTheDocument();
    expect(screen.getByText('Go to settings')).toBeInTheDocument();
  });

  it('shows the search input with the default placeholder', async () => {
    render(<ShellCommandPalette open={true} commands={[makeCmd()]} />);
    const input = await screen.findByPlaceholderText(
      defaultShellCommandPaletteMessages.searchPlaceholder
    );
    expect(input).toBeInTheDocument();
  });

  it('shows the no-results message when provided empty commands list', async () => {
    render(<ShellCommandPalette open={true} commands={[]} />);
    expect(
      await screen.findByText(defaultShellCommandPaletteMessages.noResultsMessage)
    ).toBeInTheDocument();
  });

  it('calls onSelect and closes when a command item is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ShellCommandPalette
        open={true}
        onOpenChange={onOpenChange}
        commands={[makeCmd({ id: 'cmd-a', onSelect })]}
      />
    );

    const item = await screen.findByTestId('command-item-cmd-a');
    await user.click(item);

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('groups commands by their group field', async () => {
    render(
      <ShellCommandPalette
        open={true}
        commands={[
          makeCmd({ id: 'nav-1', label: 'Navigate Home', group: 'navigation' }),
          makeCmd({ id: 'acct-1', label: 'Sign Out', group: 'account' }),
        ]}
      />
    );

    expect(await screen.findByTestId('command-group-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('command-group-account')).toBeInTheDocument();
    expect(screen.getByText('Navigate Home')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('renders all commands passed — no permission filtering at component level', async () => {
    // Permission filtering is the hook's job. The component renders whatever it
    // receives via the commands prop without inspecting requiredPermission.
    render(
      <ShellCommandPalette
        open={true}
        commands={[
          makeCmd({ id: 'has-perm', label: 'Has Permission', requiredPermission: 'admin' }),
          makeCmd({ id: 'no-perm', label: 'No Permission Needed' }),
        ]}
      />
    );

    expect(await screen.findByText('Has Permission')).toBeInTheDocument();
    expect(screen.getByText('No Permission Needed')).toBeInTheDocument();
  });

  it('renders a command with requiredPermission when passed in the commands list', async () => {
    render(
      <ShellCommandPalette
        open={true}
        commands={[
          makeCmd({ id: 'no-perm', label: 'No Permission Needed' }),
        ]}
      />
    );
    expect(await screen.findByText('No Permission Needed')).toBeInTheDocument();
  });

  it('opens via Mod+K keyboard shortcut (uncontrolled mode)', async () => {
    render(
      <ShellCommandPalette
        commands={[makeCmd({ id: 'shortcut-cmd', label: 'Shortcut Command' })]}
      />
    );

    // Initially closed.
    expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument();

    // Fire the keyboard shortcut.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    });

    expect(await screen.findByTestId('command-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('command-item-shortcut-cmd')).toBeInTheDocument();
  });

  it('toggles open state when Mod+K is pressed again (uncontrolled)', async () => {
    render(
      <ShellCommandPalette commands={[makeCmd({ id: 'toggle-cmd', label: 'Toggle Command' })]} />
    );

    // Open.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    });
    expect(await screen.findByTestId('command-dialog')).toBeInTheDocument();

    // Close.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    });
    await waitFor(() =>
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    );
  });

  it('calls onOpenChange when controlled and Mod+K is pressed', async () => {
    const onOpenChange = vi.fn();
    render(
      <ShellCommandPalette
        open={false}
        onOpenChange={onOpenChange}
        commands={[makeCmd({ id: 'ctrl-cmd', label: 'Ctrl Command' })]}
      />
    );

    // Mod+K fires onOpenChange(true) via the global listener.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
  });

  it('renders a command shortcut label when provided', async () => {
    render(
      <ShellCommandPalette
        open={true}
        commands={[makeCmd({ id: 'shortcut', label: 'Quick Action', shortcut: '⌘K' })]}
      />
    );
    expect(await screen.findByText('⌘K')).toBeInTheDocument();
  });

  it('accepts message overrides for placeholder copy', async () => {
    render(
      <ShellCommandPalette
        open={true}
        commands={[makeCmd({ label: 'Something' })]}
        messages={{ searchPlaceholder: 'Custom placeholder…' }}
      />
    );
    const input = await screen.findByPlaceholderText('Custom placeholder…');
    expect(input).toBeInTheDocument();
  });

  it('renders a command description when provided', async () => {
    render(
      <ShellCommandPalette
        open={true}
        commands={[makeCmd({ id: 'desc-cmd', label: 'Described', description: 'Some description' })]}
      />
    );
    expect(await screen.findByText('Some description')).toBeInTheDocument();
  });

  it('calls onError when a command onSelect throws synchronously', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const err = new Error('command failed');
    const throwingCmd = makeCmd({
      id: 'fail-cmd',
      label: 'Failing Command',
      onSelect: () => { throw err; },
    });

    render(
      <ShellCommandPalette open={true} commands={[throwingCmd]} onError={onError} />
    );

    const item = await screen.findByTestId('command-item-fail-cmd');
    await user.click(item);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(err));
  });

  it('calls onError when an async command onSelect rejects', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const err = new Error('async fail');
    const asyncThrowingCmd = makeCmd({
      id: 'async-fail-cmd',
      label: 'Async Failing Command',
      onSelect: async () => { throw err; },
    });

    render(
      <ShellCommandPalette open={true} commands={[asyncThrowingCmd]} onError={onError} />
    );

    const item = await screen.findByTestId('command-item-async-fail-cmd');
    await user.click(item);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(err));
  });
});
