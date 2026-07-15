import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth module — tests must NEVER hit a real client.
// The utility hook (use-passkey-management) imports from @/generated/auth;
// by mocking here the hook picks up our controllable stubs.
const {
  credentialsQueryMock,
  updateMutateAsyncMock,
  deleteMutateAsyncMock
} = vi.hoisted(() => ({
  credentialsQueryMock: vi.fn(),
  updateMutateAsyncMock: vi.fn(),
  deleteMutateAsyncMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useWebauthnCredentialsQuery: () => ({
    data: credentialsQueryMock(),
    isLoading: false,
    error: null
  }),
  useUpdateWebauthnCredentialMutation: () => ({
    mutateAsync: updateMutateAsyncMock,
    isPending: false
  }),
  useDeleteWebauthnCredentialMutation: () => ({
    mutateAsync: deleteMutateAsyncMock,
    isPending: false
  })
}));

// Mock use-step-up — we control whether step-up resolves or rejects.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/blocks/auth/use-step-up/use-step-up')>();
  return {
    ...actual,
    useStepUp: () => stepUpMock
  };
});

import { PasskeyManagementList } from './passkey-management-list';
import { StepUpError } from './hooks/use-passkey-management';
import { defaultPasskeyManagementListMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCredential(overrides: Record<string, unknown> = {}) {
  return {
    nodes: [
      {
        id: 'cred-1',
        name: 'iPhone Face ID',
        transports: ['internal'],
        credentialDeviceType: 'platform',
        backupEligible: true,
        backupState: true,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        ...overrides
      }
    ],
    totalCount: 1,
    pageInfo: { hasNextPage: false, hasPreviousPage: false }
  };
}

beforeEach(() => {
  credentialsQueryMock.mockReset();
  updateMutateAsyncMock.mockReset();
  deleteMutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  // Default: no credentials
  credentialsQueryMock.mockReturnValue(null);
  // Default: step-up resolves (verified)
  stepUpMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PasskeyManagementList', () => {
  it('renders the title and empty state when no credentials', () => {
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: { nodes: [], totalCount: 0 } });
    render(<PasskeyManagementList />);
    expect(screen.getByText(defaultPasskeyManagementListMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultPasskeyManagementListMessages.emptyState)).toBeInTheDocument();
  });

  it('renders a credential row with name and badge', () => {
    credentialsQueryMock.mockReturnValue({
      webauthnCredentials: makeCredential()
    });
    render(<PasskeyManagementList />);
    expect(screen.getByText('iPhone Face ID')).toBeInTheDocument();
    expect(screen.getByText(defaultPasskeyManagementListMessages.platformBadge)).toBeInTheDocument();
  });

  it('shows Never used when lastUsedAt is null', () => {
    credentialsQueryMock.mockReturnValue({
      webauthnCredentials: makeCredential({ lastUsedAt: null })
    });
    render(<PasskeyManagementList />);
    expect(screen.getByText(defaultPasskeyManagementListMessages.lastUsedNever)).toBeInTheDocument();
  });

  it('renames a credential: calls update mutation and fires onSuccess + onMessage', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });
    updateMutateAsyncMock.mockResolvedValue({
      updateWebauthnCredential: { webauthnCredential: { id: 'cred-1', name: 'New Name' } }
    });

    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    render(<PasskeyManagementList onSuccess={onSuccess} onMessage={onMessage} />);

    // Open rename dialog
    await user.click(screen.getByTestId('rename-btn-cred-1'));
    // Clear existing text and type new name
    const input = screen.getByTestId('rename-input');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(screen.getByTestId('rename-save-btn'));

    await waitFor(() => {
      expect(updateMutateAsyncMock).toHaveBeenCalledWith({
        id: 'cred-1',
        webauthnCredentialPatch: { name: 'New Name' }
      });
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ type: 'renamed', credentialId: 'cred-1', name: 'New Name' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'passkey.renamed' })
    );
  });

  it('shows rename error when update mutation rejects', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });
    updateMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('db error'), { extensions: { code: 'RENAME_FAILED' } })
    );

    const onError = vi.fn();
    render(<PasskeyManagementList onError={onError} />);

    await user.click(screen.getByTestId('rename-btn-cred-1'));
    const input = screen.getByTestId('rename-input');
    await user.clear(input);
    await user.type(input, 'Bad Name');
    await user.click(screen.getByTestId('rename-save-btn'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RENAME_FAILED' })
    );
  });

  it('calls step-up before delete, then fires delete mutation and onSuccess', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });
    deleteMutateAsyncMock.mockResolvedValue({
      deleteWebauthnCredential: { webauthnCredential: { id: 'cred-1' } }
    });

    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    render(<PasskeyManagementList onSuccess={onSuccess} onMessage={onMessage} />);

    await user.click(screen.getByTestId('delete-btn-cred-1'));
    // Confirm dialog is open
    expect(screen.getByTestId('delete-confirm-btn')).toBeInTheDocument();
    await user.click(screen.getByTestId('delete-confirm-btn'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' }));
    await waitFor(() => expect(deleteMutateAsyncMock).toHaveBeenCalledWith({ id: 'cred-1' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ type: 'deleted', credentialId: 'cred-1' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'passkey.deleted' })
    );
  });

  it('step-up cancel: mutation NOT called, no error shown, no onError fired', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });
    // Step-up cancelled
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    const onError = vi.fn();
    render(<PasskeyManagementList onError={onError} />);

    await user.click(screen.getByTestId('delete-btn-cred-1'));
    await user.click(screen.getByTestId('delete-confirm-btn'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    // delete mutation must NOT have been called
    expect(deleteMutateAsyncMock).not.toHaveBeenCalled();
    // no error callback
    expect(onError).not.toHaveBeenCalled();
  });

  it('shows delete error when step-up passes but mutation rejects', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });
    stepUpMock.mockResolvedValue(undefined);
    deleteMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('delete error'), { extensions: { code: 'DELETE_FAILED' } })
    );

    const onError = vi.fn();
    render(<PasskeyManagementList onError={onError} />);

    await user.click(screen.getByTestId('delete-btn-cred-1'));
    await user.click(screen.getByTestId('delete-confirm-btn'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DELETE_FAILED' })
    );
  });

  it('uses onRename adapter instead of default mutation', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });

    const onRename = vi.fn().mockResolvedValue(undefined);
    render(<PasskeyManagementList onRename={onRename} />);

    await user.click(screen.getByTestId('rename-btn-cred-1'));
    const input = screen.getByTestId('rename-input');
    await user.clear(input);
    await user.type(input, 'Override Name');
    await user.click(screen.getByTestId('rename-save-btn'));

    await waitFor(() => expect(onRename).toHaveBeenCalledTimes(1));
    expect(onRename).toHaveBeenCalledWith({ credentialId: 'cred-1', name: 'Override Name' });
    expect(updateMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('uses onDelete adapter instead of default mutation (step-up still called)', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });

    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<PasskeyManagementList onDelete={onDelete} />);

    await user.click(screen.getByTestId('delete-btn-cred-1'));
    await user.click(screen.getByTestId('delete-confirm-btn'));

    // Step-up must fire BEFORE the adapter regardless of which path is taken
    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith({ credentialId: 'cred-1' }));
    expect(deleteMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('applies message overrides', () => {
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: { nodes: [], totalCount: 0 } });
    render(
      <PasskeyManagementList
        messages={{ title: 'My Passkeys', emptyState: 'Nothing here yet.' }}
      />
    );
    expect(screen.getByText('My Passkeys')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('delete confirmation can be cancelled without any side-effect', async () => {
    const user = userEvent.setup();
    credentialsQueryMock.mockReturnValue({ webauthnCredentials: makeCredential() });

    render(<PasskeyManagementList />);
    await user.click(screen.getByTestId('delete-btn-cred-1'));
    await user.click(screen.getByTestId('delete-cancel-btn'));

    expect(stepUpMock).not.toHaveBeenCalled();
    expect(deleteMutateAsyncMock).not.toHaveBeenCalled();
  });
});
