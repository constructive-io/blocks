import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The data path uses TWO generated namespaces — mock both so no real client
 * is touched. (sdk-binding-contract.md: tests mock `@/generated/<ns>`.)
 *
 * BACKEND-PENDING (CASE-b):
 *   `useSwitchContextMutation` does NOT exist in @/generated/auth.
 *   There is no import of that hook in this block.
 *   Tests cover the graceful PROCEDURE_NOT_FOUND path via:
 *   (a) no onSwitchSubmit provided → the hook throws PROCEDURE_NOT_FOUND
 *   (b) onSwitchSubmit override provided → happy-path + error-path covered.
 *
 * The Base UI dropdown-menu is mocked to render inline (avoids portal + context
 * issues in jsdom) — same pattern as shell-account-menu tests.
 */
const { currentUserQueryMock, orgMembershipsQueryMock } = vi.hoisted(() => ({
  currentUserQueryMock: vi.fn(),
  orgMembershipsQueryMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useCurrentUserQuery: (params: unknown) => currentUserQueryMock(params)
}));

vi.mock('@/generated/admin', () => ({
  useOrgMembershipsQuery: (params: unknown) => orgMembershipsQueryMock(params)
}));

// Mock the Base UI dropdown-menu to render inline (avoids portal + context issues in jsdom).
// DropdownMenuItem fires `onSelect` on click to match real Base UI behavior.
vi.mock('@constructive-io/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children, asChild, ...props }: React.ComponentProps<'button'> & { asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<React.ComponentProps<'button'>>, { ...props });
    }
    return <button {...props}>{children}</button>;
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-content">{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-group">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-slot="dropdown-menu-separator" />,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: React.ComponentProps<'div'> & { onSelect?: (e: Event) => void }) => (
    <div
      data-slot="dropdown-menu-item"
      {...props}
      onClick={(e) => {
        onSelect?.(e.nativeEvent);
        (props.onClick as React.MouseEventHandler<HTMLDivElement> | undefined)?.(e);
      }}
      role="menuitem"
    >
      {children}
    </div>
  )
}));

// React import is required for the mock JSX above.
import React from 'react';

import { UserContextSwitcher } from './context-switcher';
import { defaultUserContextSwitcherMessages } from './messages';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePersonUser() {
  return {
    id: 'user-person-1',
    type: 1, // wire int — the hook normalizes to 'person'
    displayName: 'Alice Smith',
    username: 'alice',
    profilePicture: null
  };
}

function makeOrgMembership(orgId = 'org-1') {
  return {
    id: `mem-${orgId}`,
    isOwner: true,
    isAdmin: false,
    profileId: null,
    entityId: orgId
  };
}

function successCurrentUser(user = makePersonUser()) {
  currentUserQueryMock.mockReturnValue({
    data: { currentUser: user },
    isLoading: false,
    error: null
  });
}

function successOrgMemberships(memberships: ReturnType<typeof makeOrgMembership>[] = []) {
  orgMembershipsQueryMock.mockReturnValue({
    data: { orgMemberships: { nodes: memberships, totalCount: memberships.length } },
    isLoading: false,
    error: null
  });
}

function loadingState() {
  currentUserQueryMock.mockReturnValue({ data: null, isLoading: true, error: null });
  orgMembershipsQueryMock.mockReturnValue({ data: null, isLoading: true, error: null });
}

beforeEach(() => {
  currentUserQueryMock.mockReset();
  orgMembershipsQueryMock.mockReset();
  // Sane defaults: personal user, no orgs.
  successCurrentUser();
  successOrgMemberships([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserContextSwitcher', () => {
  it('renders the trigger button with the current user display name', () => {
    render(<UserContextSwitcher />);
    expect(screen.getByRole('button', { name: /switch active context/i })).toBeInTheDocument();
    // 'Alice Smith' may appear in both the trigger and the personal account menu item
    // (the mock renders content inline, not in a portal). Use getAllByText.
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('opens the dropdown and shows the personal account section', async () => {
    const user = userEvent.setup();
    render(<UserContextSwitcher />);

    await user.click(screen.getByRole('button', { name: /switch active context/i }));

    expect(
      await screen.findByText(defaultUserContextSwitcherMessages.personalAccountLabel)
    ).toBeInTheDocument();
  });

  it('shows org entries when org memberships exist', async () => {
    successOrgMemberships([makeOrgMembership('org-1'), makeOrgMembership('org-2')]);
    const user = userEvent.setup();
    render(<UserContextSwitcher />);

    await user.click(screen.getByRole('button', { name: /switch active context/i }));

    expect(
      await screen.findByText(defaultUserContextSwitcherMessages.orgsLabel)
    ).toBeInTheDocument();
    // org-1 entity ID is used as displayName (Phase-1 limitation — no joined entity fields yet)
    expect(screen.getByText('org-1')).toBeInTheDocument();
    expect(screen.getByText('org-2')).toBeInTheDocument();
  });

  it('shows the noOrgsHint when there are no orgs and showCreateOrgLink=true', async () => {
    successOrgMemberships([]);
    const user = userEvent.setup();
    render(<UserContextSwitcher showCreateOrgLink />);

    await user.click(screen.getByRole('button', { name: /switch active context/i }));

    expect(
      await screen.findByText(defaultUserContextSwitcherMessages.noOrgsHint)
    ).toBeInTheDocument();
  });

  it('calls onSwitchSubmit override and fires onContextSwitch on success', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const onSwitchSubmit = vi.fn().mockResolvedValue(undefined);
    const onContextSwitch = vi.fn();
    const user = userEvent.setup();

    render(
      <UserContextSwitcher
        onSwitchSubmit={onSwitchSubmit}
        onContextSwitch={onContextSwitch}
      />
    );

    await user.click(screen.getByRole('button', { name: /switch active context/i }));
    // Click the org entry (entityId = 'org-1' rendered as displayName)
    const orgItem = await screen.findByText('org-1');
    await user.click(orgItem);

    await waitFor(() => expect(onSwitchSubmit).toHaveBeenCalledTimes(1));
    expect(onSwitchSubmit).toHaveBeenCalledWith('org-1');
    await waitFor(() => expect(onContextSwitch).toHaveBeenCalledTimes(1));
    expect(onContextSwitch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1', type: 'organization' })
    );
  });

  it('fires onMessage with kind=success and interpolated message after a successful switch via override', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const onSwitchSubmit = vi.fn().mockResolvedValue(undefined);
    const onMessage = vi.fn();
    const user = userEvent.setup();

    render(
      <UserContextSwitcher onSwitchSubmit={onSwitchSubmit} onMessage={onMessage} />
    );

    await user.click(screen.getByRole('button', { name: /switch active context/i }));
    await user.click(await screen.findByText('org-1'));

    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'success',
          key: 'switchContext.success',
          // switchedToast template is 'Switched to {{name}}'; org entityId is used as displayName
          message: 'Switched to org-1'
        })
      )
    );
    // onMessage fires exactly once per success (B1 fix: no double-firing)
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('fires onMessage with kind=error when onSwitchSubmit override rejects', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const onSwitchSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('switch failed'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );
    const onMessage = vi.fn();
    const onError = vi.fn();
    const user = userEvent.setup();

    render(
      <UserContextSwitcher
        onSwitchSubmit={onSwitchSubmit}
        onMessage={onMessage}
        onError={onError}
      />
    );

    await user.click(screen.getByRole('button', { name: /switch active context/i }));
    await user.click(await screen.findByText('org-1'));

    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
      )
    );
    // onMessage fires exactly once per error (B1 fix: no double-firing)
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('GRACEFUL PROCEDURE_NOT_FOUND — fires error without onSwitchSubmit (backend pending)', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const onMessage = vi.fn();
    const onError = vi.fn();
    const user = userEvent.setup();

    // No onSwitchSubmit — the hook throws PROCEDURE_NOT_FOUND internally.
    render(<UserContextSwitcher onMessage={onMessage} onError={onError} />);

    await user.click(screen.getByRole('button', { name: /switch active context/i }));
    await user.click(await screen.findByText('org-1'));

    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
      )
    );
    // onMessage fires exactly once per error (B1 fix: no double-firing)
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('fires onCreateOrgClick when "Create new organization" is clicked', async () => {
    const onCreateOrgClick = vi.fn();
    const user = userEvent.setup();

    render(
      <UserContextSwitcher showCreateOrgLink onCreateOrgClick={onCreateOrgClick} />
    );

    await user.click(screen.getByRole('button', { name: /switch active context/i }));
    await user.click(
      await screen.findByText(defaultUserContextSwitcherMessages.createOrgLink)
    );

    expect(onCreateOrgClick).toHaveBeenCalledTimes(1);
  });

  it('shows role chip for org entries when showRoleChip=true', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const user = userEvent.setup();

    render(<UserContextSwitcher showRoleChip />);
    await user.click(screen.getByRole('button', { name: /switch active context/i }));

    // makeOrgMembership has isOwner=true → roleOwner label
    expect(
      await screen.findByText(defaultUserContextSwitcherMessages.roleOwner)
    ).toBeInTheDocument();
  });

  it('hides role chip when showRoleChip=false', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const user = userEvent.setup();

    render(<UserContextSwitcher showRoleChip={false} />);
    await user.click(screen.getByRole('button', { name: /switch active context/i }));

    await screen.findByText('org-1'); // wait for dropdown
    expect(
      screen.queryByText(defaultUserContextSwitcherMessages.roleOwner)
    ).not.toBeInTheDocument();
  });

  it('disables trigger button and sets aria-busy when queries are loading', () => {
    loadingState();
    render(<UserContextSwitcher />);

    const trigger = screen.getByRole('button', { name: /switch active context/i });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-busy', 'true');
  });

  it('normalizes Int type=2 org entity to type="organization"', async () => {
    successOrgMemberships([makeOrgMembership('org-1')]);
    const onContextSwitch = vi.fn();
    const onSwitchSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<UserContextSwitcher onSwitchSubmit={onSwitchSubmit} onContextSwitch={onContextSwitch} />);
    await user.click(screen.getByRole('button', { name: /switch active context/i }));
    await user.click(await screen.findByText('org-1'));

    await waitFor(() => expect(onContextSwitch).toHaveBeenCalledTimes(1));
    // The onContextSwitch callback must receive 'organization', never the raw wire int 2.
    expect(onContextSwitch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'organization' })
    );
  });
});
