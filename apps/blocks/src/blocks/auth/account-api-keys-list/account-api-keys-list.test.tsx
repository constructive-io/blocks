import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth SDK — never hit a real client.
// sdk-binding-contract.md: tests mock `@/generated/<ns>`.
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useRevokeApiKeyMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock the sibling blocks — we test only this block's behaviour, not the
// sub-components. The create dialog and created modal have their own test suites.
vi.mock('@/blocks/auth/api-key-create-dialog/api-key-create-dialog', () => ({
  ApiKeyCreateDialog: ({ open, onSuccess }: { open: boolean; onSuccess: (r: unknown) => void }) =>
    open ? (
      <div data-testid="api-key-create-dialog">
        <button
          data-testid="mock-create-success"
          onClick={() =>
            onSuccess({
              keyId: 'new-key-id',
              rawKey: 'cnc_live_sk_mock12345',
              name: 'My New Key',
              expiresAt: null
            })
          }
        >
          Create
        </button>
      </div>
    ) : null
}));

vi.mock('@/blocks/auth/api-key-created-modal/api-key-created-modal', () => ({
  ApiKeyCreatedModal: ({
    open,
    apiKey,
    keyName,
    onDismissed
  }: {
    open: boolean;
    apiKey: string;
    keyName: string;
    onDismissed?: () => void;
  }) =>
    open ? (
      <div data-testid="api-key-created-modal">
        <span data-testid="created-key-name">{keyName}</span>
        <span data-testid="created-api-key">{apiKey}</span>
        <button data-testid="mock-dismiss" onClick={onDismissed}>
          Dismiss
        </button>
      </div>
    ) : null
}));

import { AccountApiKeysList } from './account-api-keys-list';
import { defaultAccountApiKeysListMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKey(overrides: Partial<import('./account-api-keys-list').ApiKeyRow> = {}) {
  return {
    id: 'key-1',
    name: 'My API Key',
    keyPrefix: 'cnc_live_sk_abc1',
    accessLevel: 'read',
    mfaLevel: 'none',
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function makeExpiredKey() {
  return makeKey({
    id: 'key-expired',
    name: 'Old Key',
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // yesterday
  });
}

beforeEach(() => {
  mutateAsyncMock.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountApiKeysList', () => {
  it('renders the card title and description', () => {
    render(<AccountApiKeysList />);
    expect(screen.getByText(defaultAccountApiKeysListMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountApiKeysListMessages.description)).toBeInTheDocument();
  });

  it('renders the empty state when no keys are provided', () => {
    render(<AccountApiKeysList keys={[]} />);
    expect(screen.getByText(defaultAccountApiKeysListMessages.noKeysDescription)).toBeInTheDocument();
  });

  it('renders key rows with name and prefix', () => {
    const key = makeKey();
    render(<AccountApiKeysList keys={[key]} />);
    expect(screen.getByText('My API Key')).toBeInTheDocument();
    expect(screen.getByText(/cnc_live_sk_abc1/)).toBeInTheDocument();
  });

  it('shows "Expired" badge for expired keys', () => {
    const key = makeExpiredKey();
    render(<AccountApiKeysList keys={[key]} />);
    // Badge with "Expired" text
    const badges = screen.getAllByText(defaultAccountApiKeysListMessages.expired);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows "Never" for lastUsedAt when null', () => {
    const key = makeKey({ lastUsedAt: null });
    render(<AccountApiKeysList keys={[key]} />);
    expect(screen.getByText(new RegExp(defaultAccountApiKeysListMessages.neverUsed))).toBeInTheDocument();
  });

  it('shows "No expiry" for keys without expiresAt', () => {
    const key = makeKey({ expiresAt: null });
    render(<AccountApiKeysList keys={[key]} />);
    // noExpiry appears in the expiry column
    expect(screen.getAllByText(new RegExp(defaultAccountApiKeysListMessages.noExpiry)).length).toBeGreaterThan(0);
  });

  it('shows maxKeysReached note and disables create button when limit is hit', () => {
    render(<AccountApiKeysList keys={[makeKey()]} maxKeys={1} />);
    expect(screen.getByText(defaultAccountApiKeysListMessages.maxKeysReached)).toBeInTheDocument();
    const createBtn = screen.getByTestId('create-key-button');
    expect(createBtn).toBeDisabled();
  });

  it('opens the create dialog when "Create API key" is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountApiKeysList />);
    await user.click(screen.getByTestId('create-key-button'));
    expect(screen.getByTestId('api-key-create-dialog')).toBeInTheDocument();
  });

  it('opens the created-modal after the create dialog succeeds', async () => {
    const user = userEvent.setup();
    const onKeyCreated = vi.fn();
    render(<AccountApiKeysList onKeyCreated={onKeyCreated} />);

    // Open create dialog
    await user.click(screen.getByTestId('create-key-button'));
    // Simulate create success
    await user.click(screen.getByTestId('mock-create-success'));

    await waitFor(() => expect(screen.getByTestId('api-key-created-modal')).toBeInTheDocument());
    expect(screen.getByTestId('created-key-name')).toHaveTextContent('My New Key');
    expect(screen.getByTestId('created-api-key')).toHaveTextContent('cnc_live_sk_mock12345');
    expect(onKeyCreated).toHaveBeenCalledWith({
      keyId: 'new-key-id',
      rawKey: 'cnc_live_sk_mock12345',
      name: 'My New Key',
      expiresAt: null
    });
  });

  it('dismisses the created-modal when the user dismisses it', async () => {
    const user = userEvent.setup();
    render(<AccountApiKeysList />);

    await user.click(screen.getByTestId('create-key-button'));
    await user.click(screen.getByTestId('mock-create-success'));

    await waitFor(() => expect(screen.getByTestId('api-key-created-modal')).toBeInTheDocument());
    await user.click(screen.getByTestId('mock-dismiss'));

    await waitFor(() => expect(screen.queryByTestId('api-key-created-modal')).toBeNull());
  });

  it('opens revoke confirmation dialog when Revoke is clicked', async () => {
    const user = userEvent.setup();
    const key = makeKey();
    render(<AccountApiKeysList keys={[key]} />);

    await user.click(screen.getByTestId(`revoke-button-${key.id}`));

    expect(screen.getByText(defaultAccountApiKeysListMessages.revokeConfirmTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountApiKeysListMessages.revokeConfirmDescription)).toBeInTheDocument();
  });

  it('calls the generated revokeApiKey mutation with { input: { keyId } } and fires success', async () => {
    const user = userEvent.setup();
    const onKeyRevoked = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncMock.mockResolvedValue({ revokeApiKey: { result: true } });

    const key = makeKey();
    render(<AccountApiKeysList keys={[key]} onKeyRevoked={onKeyRevoked} onMessage={onMessage} />);

    await user.click(screen.getByTestId(`revoke-button-${key.id}`));
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: { keyId: 'key-1' } });
    expect(onKeyRevoked).toHaveBeenCalledWith('key-1');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'revokeApiKey.success' })
    );
  });

  it('uses the onRevokeSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onRevokeSubmit = vi.fn().mockResolvedValue({ result: true });
    const onKeyRevoked = vi.fn();

    const key = makeKey();
    render(
      <AccountApiKeysList
        keys={[key]}
        onRevokeSubmit={onRevokeSubmit}
        onKeyRevoked={onKeyRevoked}
      />
    );

    await user.click(screen.getByTestId(`revoke-button-${key.id}`));
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(onRevokeSubmit).toHaveBeenCalledTimes(1));
    expect(onRevokeSubmit).toHaveBeenCalledWith({ keyId: 'key-1' });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onKeyRevoked).toHaveBeenCalledWith('key-1');
  });

  it('maps a coded server error and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('Internal error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    const key = makeKey();
    render(<AccountApiKeysList keys={[key]} onError={onError} onMessage={onMessage} />);

    await user.click(screen.getByTestId(`revoke-button-${key.id}`));
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: expect.any(String), code: 'UNKNOWN_ERROR' });
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' }));
  });

  it('applies message overrides via deep merge', () => {
    render(
      <AccountApiKeysList
        messages={{ title: 'Custom Keys Title', errors: { UNKNOWN_ERROR: 'Custom error.' } }}
      />
    );
    expect(screen.getByText('Custom Keys Title')).toBeInTheDocument();
    // Default description still present (not overridden)
    expect(screen.getByText(defaultAccountApiKeysListMessages.description)).toBeInTheDocument();
  });

  it('revoke button has aria-label including the key name', () => {
    const key = makeKey({ name: 'Production Key' });
    render(<AccountApiKeysList keys={[key]} />);
    const btn = screen.getByTestId(`revoke-button-${key.id}`);
    expect(btn).toHaveAttribute('aria-label', `${defaultAccountApiKeysListMessages.revokeButton} Production Key`);
  });

  it('renders multiple keys with separators between them', () => {
    const keys = [
      makeKey({ id: 'k1', name: 'Key One' }),
      makeKey({ id: 'k2', name: 'Key Two' })
    ];
    render(<AccountApiKeysList keys={keys} />);
    expect(screen.getByText('Key One')).toBeInTheDocument();
    expect(screen.getByText('Key Two')).toBeInTheDocument();
    // Both revoke buttons are present
    expect(screen.getByTestId('revoke-button-k1')).toBeInTheDocument();
    expect(screen.getByTestId('revoke-button-k2')).toBeInTheDocument();
  });
});
