import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The data path is the GENERATED admin SDK hooks — mock the module so no real
 * client is touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
 *
 * All three hooks used by this block are replaced with stubs returning
 * controllable mocks.
 */
const { queryMock, deleteMutateAsyncMock, updateMutateAsyncMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  deleteMutateAsyncMock: vi.fn(),
  updateMutateAsyncMock: vi.fn()
}));

vi.mock('@/generated/admin', () => ({
  useOrgMembershipsQuery: (params: unknown) => queryMock(params),
  useDeleteOrgMembershipMutation: () => ({
    mutateAsync: deleteMutateAsyncMock,
    isPending: false
  }),
  useUpdateOrgMembershipMutation: () => ({
    mutateAsync: updateMutateAsyncMock,
    isPending: false
  })
}));

// Mock the step-up hook — tests drive the resolved/rejected state directly.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', () => {
  class StepUpError extends Error {
    constructor(
      public readonly reason: 'cancelled' | 'error',
      public readonly cause?: unknown
    ) {
      super(reason === 'cancelled' ? 'Step-up cancelled.' : 'Step-up failed.');
      this.name = 'StepUpError';
    }
  }
  return {
    useStepUp: () => stepUpMock,
    StepUpError
  };
});

import { MembersList } from './members-list';
import { defaultOrgMembersListMessages } from './messages';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeMembership(overrides: {
  id?: string;
  actorId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  isApproved?: boolean;
  profileId?: string | null;
  displayName?: string;
} = {}) {
  return {
    id: overrides.id ?? 'ms-1',
    actorId: overrides.actorId ?? 'user-1',
    entityId: 'org-1',
    isOwner: overrides.isOwner ?? false,
    isAdmin: overrides.isAdmin ?? false,
    isApproved: overrides.isApproved ?? true,
    profileId: overrides.profileId ?? null,
    orgMemberProfileByMembershipId: {
      displayName: overrides.displayName ?? 'Alice',
      profilePicture: null
    }
  };
}

function mockQueryResult(memberships: ReturnType<typeof makeMembership>[] = []) {
  queryMock.mockReturnValue({
    data: { orgMemberships: { nodes: memberships, totalCount: memberships.length, pageInfo: { hasNextPage: false, hasPreviousPage: false } } },
    isLoading: false,
    error: null
  });
}

function mockQueryLoading() {
  queryMock.mockReturnValue({ data: undefined, isLoading: true, error: null });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  queryMock.mockReset();
  deleteMutateAsyncMock.mockReset();
  updateMutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  stepUpMock.mockResolvedValue(undefined); // default: step-up succeeds
  mockQueryResult(); // default: empty list
});

describe('MembersList', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the card title', () => {
    mockQueryResult();
    render(<MembersList orgId="org-1" />);
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    mockQueryResult([]);
    render(<MembersList orgId="org-1" />);
    expect(screen.getByText(defaultOrgMembersListMessages.emptyState)).toBeInTheDocument();
  });

  it('shows loading skeleton while query is pending', () => {
    mockQueryLoading();
    render(<MembersList orgId="org-1" />);
    expect(screen.getByLabelText(defaultOrgMembersListMessages.loadingAriaLabel)).toBeInTheDocument();
  });

  it('renders member rows with display name and role badge', () => {
    mockQueryResult([
      makeMembership({ id: 'ms-1', displayName: 'Alice', isOwner: true }),
      makeMembership({ id: 'ms-2', displayName: 'Bob', isAdmin: false })
    ]);
    render(<MembersList orgId="org-1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('shows Pending badge for unapproved members', () => {
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Carol', isApproved: false })]);
    render(<MembersList orgId="org-1" />);
    expect(screen.getByText(defaultOrgMembersListMessages.pendingBadge)).toBeInTheDocument();
  });

  // ── Remove member ──────────────────────────────────────────────────────────

  it('shows Remove button for non-owner rows when viewer is admin', () => {
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    render(<MembersList orgId="org-1" viewerIsAdmin />);
    expect(screen.getByTestId('remove-ms-1')).toBeInTheDocument();
  });

  it('hides Remove button for owner rows', () => {
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Alice', isOwner: true })]);
    render(<MembersList orgId="org-1" viewerIsOwner />);
    expect(screen.queryByTestId('remove-ms-1')).not.toBeInTheDocument();
  });

  it('opens confirm dialog on Remove click', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    render(<MembersList orgId="org-1" viewerIsAdmin />);

    await user.click(screen.getByTestId('remove-ms-1'));
    expect(screen.getByText(defaultOrgMembersListMessages.removeConfirmTitle)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove Bob/)).toBeInTheDocument();
  });

  it('calls onRemoveMember override and fires onRemoveSuccess + onMessage', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const onRemoveMember = vi.fn().mockResolvedValue(undefined);
    const onRemoveSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        onRemoveMember={onRemoveMember}
        onRemoveSuccess={onRemoveSuccess}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    await waitFor(() => expect(onRemoveMember).toHaveBeenCalledWith('ms-1'));
    expect(onRemoveSuccess).toHaveBeenCalledWith('user-1'); // B2: userId not membershipId
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'removeMember.success' })
    );
    expect(deleteMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('calls the default deleteOrgMembership mutation when no override is provided', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    deleteMutateAsyncMock.mockResolvedValue({ deleteOrgMembership: { orgMembership: { id: 'ms-1' } } });
    const onRemoveSuccess = vi.fn();

    render(<MembersList orgId="org-1" viewerIsAdmin onRemoveSuccess={onRemoveSuccess} />);

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    await waitFor(() => expect(deleteMutateAsyncMock).toHaveBeenCalledWith({ id: 'ms-1' }));
    expect(onRemoveSuccess).toHaveBeenCalledWith('user-1'); // B2: userId not membershipId
  });

  it('surfaces remove error inline and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const onRemoveMember = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('forbidden'), { extensions: { code: 'PERMISSION_DENIED' } })
      );
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        onRemoveMember={onRemoveMember}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    expect(await screen.findByText(defaultOrgMembersListMessages.errors.PERMISSION_DENIED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgMembersListMessages.errors.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PERMISSION_DENIED',
      message: defaultOrgMembersListMessages.errors.PERMISSION_DENIED
    });
  });

  // ── PROCEDURE_NOT_FOUND (backend-pending graceful path) ────────────────────

  it('surfaces PROCEDURE_NOT_FOUND message when backend proc is absent', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const onRemoveMember = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('proc not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } })
      );
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        onRemoveMember={onRemoveMember}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    expect(await screen.findByText(defaultOrgMembersListMessages.errors.PROCEDURE_NOT_FOUND)).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  // ── Transfer ownership (backend-pending) ───────────────────────────────────

  it('hides transfer button when onTransferOwnership is not provided', () => {
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    render(<MembersList orgId="org-1" viewerIsOwner />);
    // The button (aria-label contains the text) should not be present.
    // The dialog title may still be in DOM (Base UI renders hidden dialogs),
    // so we check there is no interactive button with transfer aria-label.
    expect(screen.queryByLabelText(`${defaultOrgMembersListMessages.transferOwnershipButton} Bob`)).not.toBeInTheDocument();
  });

  it('shows transfer button when onTransferOwnership is provided', () => {
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    render(
      <MembersList
        orgId="org-1"
        viewerIsOwner
        onTransferOwnership={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByLabelText(`${defaultOrgMembersListMessages.transferOwnershipButton} Bob`)).toBeInTheDocument();
  });

  it('calls onTransferOwnership and fires onTransferOwnershipSuccess + onMessage', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const onTransferOwnership = vi.fn().mockResolvedValue(undefined);
    const onTransferOwnershipSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsOwner
        onTransferOwnership={onTransferOwnership}
        onTransferOwnershipSuccess={onTransferOwnershipSuccess}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByLabelText(`${defaultOrgMembersListMessages.transferOwnershipButton} Bob`));
    await user.click(screen.getByTestId('confirm-transfer'));

    await waitFor(() => expect(onTransferOwnership).toHaveBeenCalledWith('ms-1'));
    expect(onTransferOwnershipSuccess).toHaveBeenCalledWith('user-1'); // B2: userId not membershipId
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'transferOwnership.success' })
    );
  });

  // ── adapter (query override seam) ─────────────────────────────────────────

  it('uses the adapter prop instead of the generated query hook', () => {
    const adapter = vi.fn().mockReturnValue({
      members: [
        {
          membershipId: 'ms-x',
          userId: 'u-x',
          displayName: 'From Adapter',
          username: null,
          profilePicture: null,
          isOwner: false,
          isAdmin: false,
          isApproved: true,
          profileId: null,
          roleLabel: 'Member'
        }
      ],
      isLoading: false,
      error: null
    });

    // The generated hook is still called (rules-of-hooks: cannot be conditional),
    // but its result is discarded when the adapter prop is provided.
    mockQueryResult(); // ensure the default mock doesn't crash
    render(<MembersList orgId="org-1" adapter={adapter} />);
    expect(screen.getByText('From Adapter')).toBeInTheDocument();
    // The adapter was used — the component displayed its data.
    expect(adapter).toHaveBeenCalled();
  });

  // ── Message overrides ──────────────────────────────────────────────────────

  it('applies title message override', () => {
    mockQueryResult();
    render(<MembersList orgId="org-1" messages={{ title: 'Team' }} />);
    expect(screen.getByText('Team')).toBeInTheDocument();
  });

  it('applies error message override', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const onRemoveMember = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('denied'), { extensions: { code: 'PERMISSION_DENIED' } })
      );

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        onRemoveMember={onRemoveMember}
        messages={{ errors: { PERMISSION_DENIED: 'Nope.' } }}
      />
    );

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));
    expect(await screen.findByText('Nope.')).toBeInTheDocument();
  });

  // ── Step-up gating ─────────────────────────────────────────────────────────

  it('remove: step-up cancel — mutation not called, onError not fired, onMessage warns', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const { StepUpError } = await import('@/blocks/auth/use-step-up/use-step-up');
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));
    const onRemoveMember = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        onRemoveMember={onRemoveMember}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(onRemoveMember).not.toHaveBeenCalled();
    expect(deleteMutateAsyncMock).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'STEP_UP_CANCELLED' })
    );
  });

  it('remove: non-admin member uses medium tier step-up', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isAdmin: false })]);
    const onRemoveMember = vi.fn().mockResolvedValue(undefined);

    render(<MembersList orgId="org-1" viewerIsAdmin onRemoveMember={onRemoveMember} />);

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'medium' }));
    expect(onRemoveMember).toHaveBeenCalledTimes(1);
  });

  it('remove: admin member uses high tier step-up', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Admin Dave', isAdmin: true })]);
    const onRemoveMember = vi.fn().mockResolvedValue(undefined);

    render(<MembersList orgId="org-1" viewerIsOwner onRemoveMember={onRemoveMember} />);

    await user.click(screen.getByTestId('remove-ms-1'));
    await user.click(screen.getByTestId('confirm-remove'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' }));
    expect(onRemoveMember).toHaveBeenCalledTimes(1);
  });

  it('transfer: step-up cancel — onTransferOwnership not called, no error fires', async () => {
    const user = userEvent.setup();
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    const { StepUpError } = await import('@/blocks/auth/use-step-up/use-step-up');
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));
    const onTransferOwnership = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsOwner
        onTransferOwnership={onTransferOwnership}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByLabelText(`${defaultOrgMembersListMessages.transferOwnershipButton} Bob`));
    await user.click(screen.getByTestId('confirm-transfer'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' }));
    expect(onTransferOwnership).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'STEP_UP_CANCELLED' })
    );
  });

  // ── Role change ────────────────────────────────────────────────────────────

  it('role change: happy path — updateMutateAsyncMock called with correct args, onRoleChangeSuccess fires', async () => {
    const user = userEvent.setup();
    const roleProfiles = [{ id: 'profile-1', label: 'Editor' }];
    mockQueryResult([makeMembership({ id: 'ms-1', actorId: 'user-1', displayName: 'Bob', isOwner: false })]);
    updateMutateAsyncMock.mockResolvedValue({ updateOrgMembership: { orgMembership: { id: 'ms-1', profileId: 'profile-1' } } });
    const onRoleChangeSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        roleProfiles={roleProfiles}
        onRoleChangeSuccess={onRoleChangeSuccess}
        onMessage={onMessage}
      />
    );

    // Trigger the select change
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Editor' }));

    await waitFor(() =>
      expect(updateMutateAsyncMock).toHaveBeenCalledWith({
        id: 'ms-1',
        orgMembershipPatch: { profileId: 'profile-1' }
      })
    );
    expect(onRoleChangeSuccess).toHaveBeenCalledWith('user-1', 'profile-1'); // B2: userId
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'roleChange.success' })
    );
  });

  it('role change: override prop used instead of default mutation', async () => {
    const user = userEvent.setup();
    const roleProfiles = [{ id: 'profile-1', label: 'Editor' }];
    mockQueryResult([makeMembership({ id: 'ms-1', actorId: 'user-1', displayName: 'Bob', isOwner: false })]);
    const onRoleChange = vi.fn().mockResolvedValue(undefined);
    const onRoleChangeSuccess = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        roleProfiles={roleProfiles}
        onRoleChange={onRoleChange}
        onRoleChangeSuccess={onRoleChangeSuccess}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Editor' }));

    await waitFor(() => expect(onRoleChange).toHaveBeenCalledWith('ms-1', 'profile-1'));
    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
    expect(onRoleChangeSuccess).toHaveBeenCalledWith('user-1', 'profile-1'); // B2: userId
  });

  it('role change: error surfaces inline and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const roleProfiles = [{ id: 'profile-1', label: 'Editor' }];
    mockQueryResult([makeMembership({ id: 'ms-1', displayName: 'Bob', isOwner: false })]);
    updateMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('forbidden'), { extensions: { code: 'PERMISSION_DENIED' } })
    );
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <MembersList
        orgId="org-1"
        viewerIsAdmin
        roleProfiles={roleProfiles}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Editor' }));

    expect(await screen.findByText(defaultOrgMembersListMessages.errors.PERMISSION_DENIED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgMembersListMessages.errors.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PERMISSION_DENIED' })
    );
  });
});
