import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth module — tests never hit a real client.
// (sdk-binding-contract.md §11: tests mock `@/generated/<ns>`)
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useDisconnectAccountMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock useStepUp — covers both the success and the cancel paths.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/blocks/auth/use-step-up/use-step-up')>();
  return {
    ...original,
    useStepUp: () => stepUpMock
  };
});

import { AccountConnectedAccounts } from './account-connected-accounts';
import { StepUpError } from '@/blocks/auth/use-step-up/use-step-up';
import { defaultAccountConnectedAccountsMessages } from './messages';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAccount(
  overrides: Partial<{
    id: string;
    service: string;
    identifier: string;
    isVerified: boolean;
    createdAt: string;
  }> = {}
) {
  return {
    id: 'acc-1',
    service: 'google',
    identifier: 'user@gmail.com',
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

function makeProvider(
  overrides: Partial<{
    id: string;
    slug: string;
    displayName: string;
    kind: 'oidc' | 'oauth2';
    enabled: boolean;
  }> = {}
) {
  return {
    id: 'prov-1',
    slug: 'google',
    displayName: 'Google',
    kind: 'oidc' as const,
    enabled: true,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  mutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  // Default: step-up resolves (user verified).
  stepUpMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open the disconnect confirmation dialog for a given account. */
async function openDisconnectDialog(
  user: ReturnType<typeof userEvent.setup>,
  accountId: string
) {
  await user.click(screen.getByTestId(`disconnect-button-${accountId}`));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountConnectedAccounts', () => {
  it('renders title and description', () => {
    render(<AccountConnectedAccounts />);
    expect(screen.getByText(defaultAccountConnectedAccountsMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountConnectedAccountsMessages.description)).toBeInTheDocument();
  });

  it('shows empty state when no accounts or providers are provided', () => {
    render(<AccountConnectedAccounts />);
    expect(screen.getByTestId('no-providers-message')).toBeInTheDocument();
  });

  it('renders connected account row with provider name, identifier and verified badge', () => {
    const account = makeAccount({ id: 'acc-1', service: 'google', identifier: 'user@gmail.com', isVerified: true });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });

    render(<AccountConnectedAccounts connectedAccounts={[account]} providers={[provider]} />);

    expect(screen.getByTestId('connected-row-acc-1')).toBeInTheDocument();
    expect(screen.getByTestId('provider-name-acc-1')).toHaveTextContent('Google');
    expect(screen.getByTestId('provider-identifier-acc-1')).toHaveTextContent('user@gmail.com');
    expect(screen.getByTestId('badge-verified-acc-1')).toBeInTheDocument();
  });

  it('renders unconnected provider row with a connect link', () => {
    const provider = makeProvider({ id: 'prov-gh', slug: 'github', displayName: 'GitHub' });

    render(
      <AccountConnectedAccounts
        connectedAccounts={[]}
        providers={[provider]}
        oauthRedirectBase="/auth/social"
      />
    );

    const link = screen.getByTestId('connect-button-prov-gh');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auth/social?provider=github&action=connect');
    expect(link).toHaveTextContent('Connect GitHub');
  });

  it('happy path: opens confirm dialog, calls step-up then mutation, fires callbacks', async () => {
    const user = userEvent.setup();
    const onAccountDisconnected = vi.fn();
    const onMessage = vi.fn();

    const account = makeAccount({ id: 'acc-1', service: 'google' });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });
    mutateAsyncMock.mockResolvedValue({ disconnectAccount: { result: true } });

    render(
      <AccountConnectedAccounts
        connectedAccounts={[account]}
        providers={[provider]}
        onAccountDisconnected={onAccountDisconnected}
        onMessage={onMessage}
      />
    );

    // Open confirmation dialog.
    await openDisconnectDialog(user, 'acc-1');
    expect(await screen.findByTestId('disconnect-confirm')).toBeInTheDocument();

    // Confirm disconnect.
    await user.click(screen.getByTestId('disconnect-confirm'));

    // Step-up must be called with tier: medium BEFORE the mutation.
    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'medium' });

    // The generated mutation must be called with { input: { accountId } }.
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: { accountId: 'acc-1' } });

    // Callbacks must fire.
    await waitFor(() => expect(onAccountDisconnected).toHaveBeenCalledTimes(1));
    expect(onAccountDisconnected).toHaveBeenCalledWith('acc-1', 'google');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'disconnectAccount.success' })
    );
  });

  it('step-up cancel — mutation NOT called, dialog closes silently then re-opens', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    const account = makeAccount({ id: 'acc-1', service: 'google' });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });

    render(
      <AccountConnectedAccounts
        connectedAccounts={[account]}
        providers={[provider]}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await openDisconnectDialog(user, 'acc-1');
    expect(await screen.findByTestId('disconnect-confirm')).toBeInTheDocument();

    await user.click(screen.getByTestId('disconnect-confirm'));

    // Step-up was called once.
    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));

    // Mutation MUST NOT have been called.
    expect(mutateAsyncMock).not.toHaveBeenCalled();

    // Dialog re-opens (confirmTarget is reset to the target).
    expect(await screen.findByTestId('disconnect-confirm')).toBeInTheDocument();

    // No error callbacks fired for step-up cancel.
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('surfaces LAST_AUTH_METHOD error inline and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('last auth method'), { extensions: { code: 'LAST_AUTH_METHOD' } })
    );

    const account = makeAccount({ id: 'acc-1', service: 'google' });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });

    render(
      <AccountConnectedAccounts
        connectedAccounts={[account]}
        providers={[provider]}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await openDisconnectDialog(user, 'acc-1');
    await user.click(await screen.findByTestId('disconnect-confirm'));

    expect(
      await screen.findByText(defaultAccountConnectedAccountsMessages.errors.LAST_AUTH_METHOD)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultAccountConnectedAccountsMessages.errors.LAST_AUTH_METHOD,
      code: 'LAST_AUTH_METHOD'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'LAST_AUTH_METHOD' })
    );
  });

  it('applies message override for LAST_AUTH_METHOD', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('last auth method'), { extensions: { code: 'LAST_AUTH_METHOD' } })
    );

    const account = makeAccount({ id: 'acc-1', service: 'google' });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });

    render(
      <AccountConnectedAccounts
        connectedAccounts={[account]}
        providers={[provider]}
        onError={onError}
        messages={{ errors: { LAST_AUTH_METHOD: 'Add another method first.' } }}
      />
    );

    await openDisconnectDialog(user, 'acc-1');
    await user.click(await screen.findByTestId('disconnect-confirm'));

    expect(await screen.findByText('Add another method first.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Add another method first.', code: 'LAST_AUTH_METHOD' });
  });

  it('onSubmitDisconnect override: calls override fn, skips generated hook', async () => {
    const user = userEvent.setup();
    const onSubmitDisconnect = vi.fn().mockResolvedValue({ success: true });
    const onAccountDisconnected = vi.fn();

    const account = makeAccount({ id: 'acc-1', service: 'google' });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });

    render(
      <AccountConnectedAccounts
        connectedAccounts={[account]}
        providers={[provider]}
        onSubmitDisconnect={onSubmitDisconnect}
        onAccountDisconnected={onAccountDisconnected}
      />
    );

    await openDisconnectDialog(user, 'acc-1');
    await user.click(await screen.findByTestId('disconnect-confirm'));

    await waitFor(() => expect(onSubmitDisconnect).toHaveBeenCalledTimes(1));
    expect(onSubmitDisconnect).toHaveBeenCalledWith({ accountId: 'acc-1' });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onAccountDisconnected).toHaveBeenCalledWith('acc-1', 'google'));
  });

  it('cancel button closes the dialog without calling step-up or mutation', async () => {
    const user = userEvent.setup();
    const account = makeAccount({ id: 'acc-1', service: 'google' });
    const provider = makeProvider({ id: 'prov-1', slug: 'google', displayName: 'Google' });

    render(<AccountConnectedAccounts connectedAccounts={[account]} providers={[provider]} />);

    await openDisconnectDialog(user, 'acc-1');
    expect(await screen.findByTestId('disconnect-cancel')).toBeInTheDocument();

    await user.click(screen.getByTestId('disconnect-cancel'));

    expect(stepUpMock).not.toHaveBeenCalled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('connected account without a matching provider shows the service slug as fallback name', () => {
    const account = makeAccount({ id: 'acc-1', service: 'github', identifier: 'octocat' });

    render(<AccountConnectedAccounts connectedAccounts={[account]} providers={[]} />);

    // The provider-name testid should fall back to the service slug 'github'.
    expect(screen.getByTestId('provider-name-acc-1')).toHaveTextContent('github');
  });
});
