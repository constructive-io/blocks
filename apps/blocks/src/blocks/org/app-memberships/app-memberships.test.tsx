import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated admin SDK so no real client is hit.
// Pattern mirrors sign-in-card.test.tsx (sdk-binding-contract.md §3).
const { mutateAsyncMock, deleteAsyncMock, membershipsDataMock, stepUpMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  deleteAsyncMock: vi.fn(),
  membershipsDataMock: vi.fn(),
  stepUpMock: vi.fn()
}));

vi.mock('@/generated/admin', () => ({
  useAppMembershipsQuery: () => ({
    data: membershipsDataMock(),
    isLoading: false
  }),
  useUpdateAppMembershipMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false
  }),
  useDeleteAppMembershipMutation: () => ({
    mutateAsync: deleteAsyncMock,
    isPending: false
  })
}));

// Mock use-step-up so step-up calls are controllable in tests.
vi.mock('@/blocks/auth/use-step-up/use-step-up', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/blocks/auth/use-step-up/use-step-up')>();
  return {
    ...original,
    useStepUp: () => stepUpMock
  };
});

import { OrgAppMemberships } from './app-memberships';
import { defaultOrgAppMembershipsMessages } from './messages';

const ORG_ID = 'org-123';

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    actorId: ORG_ID,
    isApproved: false,
    isVerified: false,
    profileId: null,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides
  };
}

function membershipsPayload(items: ReturnType<typeof membership>[]) {
  return { appMemberships: { nodes: items } };
}

beforeEach(() => {
  mutateAsyncMock.mockReset();
  deleteAsyncMock.mockReset();
  stepUpMock.mockReset();
  membershipsDataMock.mockReturnValue(membershipsPayload([]));
});

describe('OrgAppMemberships', () => {
  it('renders the card title and description', () => {
    render(<OrgAppMemberships orgId={ORG_ID} />);
    expect(screen.getByText(defaultOrgAppMembershipsMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultOrgAppMembershipsMessages.description)).toBeInTheDocument();
  });

  it('shows empty state when no memberships', () => {
    membershipsDataMock.mockReturnValue(membershipsPayload([]));
    render(<OrgAppMemberships orgId={ORG_ID} />);
    expect(screen.getByText(defaultOrgAppMembershipsMessages.emptyState)).toBeInTheDocument();
  });

  it('renders a pending membership row with approve + revoke buttons', () => {
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));
    render(<OrgAppMemberships orgId={ORG_ID} />);
    expect(screen.getByTestId('approve-button')).toBeInTheDocument();
    expect(screen.getByTestId('revoke-button')).toBeInTheDocument();
    expect(screen.getByText(defaultOrgAppMembershipsMessages.pendingBadge)).toBeInTheDocument();
  });

  it('renders an approved membership row without approve button', () => {
    membershipsDataMock.mockReturnValue(membershipsPayload([membership({ isApproved: true })]));
    render(<OrgAppMemberships orgId={ORG_ID} />);
    expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('revoke-button')).toBeInTheDocument();
    expect(screen.getByText(defaultOrgAppMembershipsMessages.approvedBadge)).toBeInTheDocument();
  });

  it('approve calls updateMutation with isApproved:true and fires onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({
      updateAppMembership: { appMembership: { id: 'm1', isApproved: true, profileId: null } }
    });
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(<OrgAppMemberships orgId={ORG_ID} onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('approve-button'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 'm1',
      appMembershipPatch: { isApproved: true }
    });
    expect(onSuccess).toHaveBeenCalledWith('approve', 'm1');
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'approve.success',
      message: defaultOrgAppMembershipsMessages.approveSuccessMessage
    });
  });

  it('approve mutation error fires onError and onMessage with kind:error', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('forbidden'), { extensions: { code: 'PERMISSION_DENIED' } })
    );
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(<OrgAppMemberships orgId={ORG_ID} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('approve-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PERMISSION_DENIED',
      message: defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED
    });
    expect(await screen.findByText(defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED)).toBeInTheDocument();
  });

  it('revoke: step-up cancel silently aborts without calling deleteMutation', async () => {
    const { StepUpError } = await import('@/blocks/auth/use-step-up/use-step-up');
    const user = userEvent.setup();
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));
    const onSuccess = vi.fn();

    render(<OrgAppMemberships orgId={ORG_ID} onSuccess={onSuccess} />);
    await user.click(screen.getByTestId('revoke-button'));

    // Confirmation dialog should appear.
    expect(await screen.findByTestId('revoke-confirm-button')).toBeInTheDocument();
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'medium' }));
    expect(deleteAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('revoke: step-up success then deleteMutation fires, onSuccess and onMessage called', async () => {
    const user = userEvent.setup();
    stepUpMock.mockResolvedValue(undefined);
    deleteAsyncMock.mockResolvedValue({
      deleteAppMembership: { appMembership: { id: 'm1' } }
    });
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(<OrgAppMemberships orgId={ORG_ID} onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('revoke-button'));

    expect(await screen.findByTestId('revoke-confirm-button')).toBeInTheDocument();
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(deleteAsyncMock).toHaveBeenCalledTimes(1));
    expect(deleteAsyncMock).toHaveBeenCalledWith({ id: 'm1' });
    expect(onSuccess).toHaveBeenCalledWith('revoke', 'm1');
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'revoke.success',
      message: defaultOrgAppMembershipsMessages.revokeSuccessMessage
    });
  });

  it('profile-update: happy path — Select onChange calls mutateAsync with profileId and fires onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    const profiles = [
      { id: 'profile-1', label: 'Standard' },
      { id: 'profile-2', label: 'Admin' }
    ];
    mutateAsyncMock.mockResolvedValue({
      updateAppMembership: { appMembership: { id: 'm1', isApproved: false, profileId: 'profile-1' } }
    });
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(
      <OrgAppMemberships
        orgId={ORG_ID}
        membershipProfiles={profiles}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    // Open the select and choose 'Admin' profile.
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const adminOption = await screen.findByText('Admin');
    await user.click(adminOption);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 'm1',
      appMembershipPatch: { profileId: 'profile-2' }
    });
    expect(onSuccess).toHaveBeenCalledWith('profile-update', 'm1');
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'profileUpdate.success',
      message: defaultOrgAppMembershipsMessages.profileUpdateSuccessMessage
    });
  });

  it('profile-update: error path — mutateAsync rejects, fires onError and onMessage with kind:error', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onError = vi.fn();
    const onMessage = vi.fn();
    const profiles = [{ id: 'profile-1', label: 'Standard' }];
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('forbidden'), { extensions: { code: 'PERMISSION_DENIED' } })
    );
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(
      <OrgAppMemberships
        orgId={ORG_ID}
        membershipProfiles={profiles}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const standardOption = await screen.findByText('Standard');
    await user.click(standardOption);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PERMISSION_DENIED',
      message: defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED
    });
    expect(await screen.findByText(defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED)).toBeInTheDocument();
  });

  it('revoke: step-up succeeds but deleteMutation rejects, fires onError and onMessage with kind:error', async () => {
    const user = userEvent.setup();
    stepUpMock.mockResolvedValue(undefined);
    deleteAsyncMock.mockRejectedValue(
      Object.assign(new Error('permission denied'), { extensions: { code: 'PERMISSION_DENIED' } })
    );
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(<OrgAppMemberships orgId={ORG_ID} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('revoke-button'));

    expect(await screen.findByTestId('revoke-confirm-button')).toBeInTheDocument();
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(deleteAsyncMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PERMISSION_DENIED',
      message: defaultOrgAppMembershipsMessages.errors.PERMISSION_DENIED
    });
  });

  it('uses onSubmit override instead of the generated updateMutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(<OrgAppMemberships orgId={ORG_ID} onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('approve-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      id: 'm1',
      appMembershipPatch: { isApproved: true }
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('uses onRevoke override instead of the generated deleteMutation', async () => {
    const user = userEvent.setup();
    stepUpMock.mockResolvedValue(undefined);
    const onRevoke = vi.fn().mockResolvedValue(null);
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(<OrgAppMemberships orgId={ORG_ID} onRevoke={onRevoke} />);
    await user.click(screen.getByTestId('revoke-button'));

    expect(await screen.findByTestId('revoke-confirm-button')).toBeInTheDocument();
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(onRevoke).toHaveBeenCalledTimes(1));
    expect(onRevoke).toHaveBeenCalledWith({ id: 'm1' });
    expect(deleteAsyncMock).not.toHaveBeenCalled();
  });

  it('message overrides are applied (custom PERMISSION_DENIED)', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('forbidden'), { extensions: { code: 'PERMISSION_DENIED' } })
    );
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(
      <OrgAppMemberships
        orgId={ORG_ID}
        messages={{ errors: { PERMISSION_DENIED: 'Not allowed, custom.' } }}
      />
    );
    await user.click(screen.getByTestId('approve-button'));
    expect(await screen.findByText('Not allowed, custom.')).toBeInTheDocument();
  });

  it('revoke dialog cancel button closes the dialog without any mutation', async () => {
    const user = userEvent.setup();
    membershipsDataMock.mockReturnValue(membershipsPayload([membership()]));

    render(<OrgAppMemberships orgId={ORG_ID} />);
    await user.click(screen.getByTestId('revoke-button'));

    expect(await screen.findByTestId('revoke-cancel-button')).toBeInTheDocument();
    await user.click(screen.getByTestId('revoke-cancel-button'));

    // The dialog uses an animation library — after cancel the confirm button becomes
    // aria-hidden / data-closed rather than removed from the DOM immediately.
    // Assert that the mutations were NOT called (the important invariant).
    await waitFor(() => expect(deleteAsyncMock).not.toHaveBeenCalled());
    expect(stepUpMock).not.toHaveBeenCalled();
  });
});
