import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
const { queryDataMock, signOutMutateAsyncMock } = vi.hoisted(() => ({
  queryDataMock: vi.fn(),
  signOutMutateAsyncMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useCurrentUserQuery: () => ({ data: queryDataMock(), isPending: false }),
  useSignOutMutation: () => ({ mutateAsync: signOutMutateAsyncMock, isPending: false })
}));

// Mock useQueryClient so sign-out-button's queryClient.clear() works.
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useQueryClient: () => ({ clear: vi.fn(), invalidateQueries: vi.fn() })
  };
});

// Mock the Base UI dropdown-menu to render inline (avoids portal + context issues in jsdom).
vi.mock('@constructive-io/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-slot="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuContent: ({ children, ...props }: React.ComponentProps<'div'>) => (
    <div {...props}>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div data-slot="dropdown-menu-group">{children}</div>,
  DropdownMenuLabel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-slot="dropdown-menu-label" className={className}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-slot="dropdown-menu-separator" />,
  DropdownMenuItem: ({ children, onSelect, asChild: _asChild, ...props }: React.ComponentProps<'div'> & {
    onSelect?: (e: Event) => void;
    asChild?: boolean;
  }) => (
    <div data-slot="dropdown-menu-item" {...props}>{children}</div>
  )
}));

// React import needed for mock JSX
import React from 'react';
import { ShellAccountMenu } from './account-menu';
import { defaultShellAccountMenuMessages } from './messages';

const personUser = {
  currentUser: {
    id: 'u1',
    type: 1,
    displayName: 'Alice Smith',
    username: 'alice',
    profilePicture: null
  }
};

const orgUser = {
  currentUser: {
    id: 'o1',
    type: 2,
    displayName: 'Acme Corp',
    username: null,
    profilePicture: null
  }
};

beforeEach(() => {
  queryDataMock.mockReset();
  signOutMutateAsyncMock.mockReset();
  // Default: return person user
  queryDataMock.mockReturnValue(personUser);
});

describe('ShellAccountMenu', () => {
  it('renders the trigger with the user display name', () => {
    render(<ShellAccountMenu />);
    expect(screen.getByTestId('account-menu-trigger')).toBeInTheDocument();
    // Name appears in both the trigger and the menu header label
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('renders with accessible aria-label on trigger', () => {
    render(<ShellAccountMenu />);
    const trigger = screen.getByTestId('account-menu-trigger');
    expect(trigger).toHaveAttribute('aria-label', defaultShellAccountMenuMessages.triggerAriaLabel);
  });

  it('shows account settings link and sign out button in the menu', () => {
    render(<ShellAccountMenu />);
    expect(screen.getByTestId('account-menu-content')).toBeInTheDocument();
    expect(screen.getByTestId('account-settings-link')).toBeInTheDocument();
    expect(screen.getByTestId('sign-out-button')).toBeInTheDocument();
  });

  it('account settings link href defaults to /account/settings', () => {
    render(<ShellAccountMenu />);
    expect(screen.getByTestId('account-settings-link')).toHaveAttribute('href', '/account/settings');
  });

  it('accepts a custom accountSettingsHref', () => {
    render(<ShellAccountMenu accountSettingsHref="/settings/profile" />);
    expect(screen.getByTestId('account-settings-link')).toHaveAttribute('href', '/settings/profile');
  });

  it('shows personal context label for type=1 user when showActiveContext=true', () => {
    render(<ShellAccountMenu showActiveContext={true} />);
    expect(screen.getByTestId('context-label')).toHaveTextContent(
      defaultShellAccountMenuMessages.personalContextLabel
    );
  });

  it('shows org display name for type=2 user when showActiveContext=true', () => {
    queryDataMock.mockReturnValue(orgUser);
    render(<ShellAccountMenu showActiveContext={true} />);
    expect(screen.getByTestId('context-label')).toHaveTextContent('Acme Corp');
  });

  it('hides context label when showActiveContext=false', () => {
    render(<ShellAccountMenu showActiveContext={false} />);
    expect(screen.queryByTestId('context-label')).not.toBeInTheDocument();
  });

  it('fires onSignOutSuccess and navigates after successful sign-out', async () => {
    const user = userEvent.setup();
    const onSignOutSuccess = vi.fn();
    signOutMutateAsyncMock.mockResolvedValue({ signOut: {} });

    // Mock window.location.href setter
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true
    });

    render(<ShellAccountMenu onSignOutSuccess={onSignOutSuccess} signOutRedirectHref="/login" />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onSignOutSuccess).toHaveBeenCalledTimes(1));
    expect(window.location.href).toBe('/login');
  });

  it('applies message overrides for labels', () => {
    render(
      <ShellAccountMenu
        messages={{
          accountSettingsLabel: 'Profile Settings',
          signOutLabel: 'Log Out'
        }}
      />
    );
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Log Out')).toBeInTheDocument();
  });

  it('renders a placeholder when no user data is available', () => {
    queryDataMock.mockReturnValue({ currentUser: null });
    render(<ShellAccountMenu />);
    const trigger = screen.getByTestId('account-menu-trigger');
    expect(trigger).toBeInTheDocument();
    // Skeleton placeholder rendered, no avatar text
    expect(trigger.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('fires onError when sign-out fails', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    signOutMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('sign out failed'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(<ShellAccountMenu onError={onError} />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: expect.any(String), message: expect.any(String) })
    );
  });

  it('data-slot is "account-menu" on the root element', () => {
    const { container } = render(<ShellAccountMenu />);
    expect(container.querySelector('[data-slot="account-menu"]')).toBeInTheDocument();
  });

  it('forwards onMessage to SignOutButton and fires it on success', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    signOutMutateAsyncMock.mockResolvedValue({ signOut: {} });

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true
    });

    render(<ShellAccountMenu onMessage={onMessage} />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(1));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'signOut.success' })
    );
  });

  it('forwards onMessage to SignOutButton and fires it on sign-out error', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    signOutMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('sign out failed'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(<ShellAccountMenu onMessage={onMessage} />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(1));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error' })
    );
  });
});
