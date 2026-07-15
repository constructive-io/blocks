import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useConfirmDeleteAccountMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock next/navigation router (pages may use it)
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}));

import { AccountDeletionConfirmPage } from './account-deletion-confirm-page';
import { defaultAccountDeletionConfirmMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  pushMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

const VALID_PROPS = { userId: 'user-uuid', token: 'tok-abc123' };

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('AccountDeletionConfirmPage', () => {
  it('renders the processing state while the mutation is in-flight', async () => {
    // Never resolves during this test
    mutateAsyncMock.mockReturnValue(new Promise(() => {}));

    render(<AccountDeletionConfirmPage {...VALID_PROPS} />);

    expect(screen.getByText(defaultAccountDeletionConfirmMessages.processingTitle)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Processing deletion' })).toBeInTheDocument();
  });

  it('calls the generated mutation with { input: { userId, token } }', async () => {
    mutateAsyncMock.mockResolvedValue({ confirmDeleteAccount: { result: true } });

    render(<AccountDeletionConfirmPage {...VALID_PROPS} />);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { userId: 'user-uuid', token: 'tok-abc123' }
    });
  });

  it('shows success state and fires onSuccess + onMessage after deletion', async () => {
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ confirmDeleteAccount: { result: true } });

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onSuccess={onSuccess} onMessage={onMessage} />);

    await waitFor(() => expect(screen.getByText(defaultAccountDeletionConfirmMessages.successTitle)).toBeInTheDocument());
    expect(onSuccess).toHaveBeenCalledWith({ userId: 'user-uuid' });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'confirmDeleteAccount.success' });
    expect(screen.getByTestId('success-cta')).toBeInTheDocument();
  });

  it('redirects to the default path after delay on success', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mutateAsyncMock.mockResolvedValue({ confirmDeleteAccount: { result: true } });

    render(<AccountDeletionConfirmPage {...VALID_PROPS} />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.successTitle)).toBeInTheDocument()
    );

    // Advance fake timers past REDIRECT_DELAY_MS
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(pushMock).toHaveBeenCalledWith('/auth/sign-in');
    vi.useRealTimers();
  });

  it('redirects to custom redirectTo after success', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mutateAsyncMock.mockResolvedValue({ confirmDeleteAccount: { result: true } });

    render(<AccountDeletionConfirmPage {...VALID_PROPS} redirectTo="/custom/landing" />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.successTitle)).toBeInTheDocument()
    );

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(pushMock).toHaveBeenCalledWith('/custom/landing');
    vi.useRealTimers();
  });

  it('shows expired state for expired-token error code and fires onExpired + onError', async () => {
    const onExpired = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('token expired'), { extensions: { code: 'TOKEN_EXPIRED' } })
    );

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onExpired={onExpired} onError={onError} onMessage={onMessage} />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.expiredTitle)).toBeInTheDocument()
    );
    expect(screen.getByTestId('expired-cta')).toBeInTheDocument();
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'TOKEN_EXPIRED' })
    );
  });

  it('shows invalid state for invalid-token error code and fires onInvalid', async () => {
    const onInvalid = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('invalid token'), { extensions: { code: 'TOKEN_INVALID' } })
    );

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onInvalid={onInvalid} />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(screen.getByTestId('invalid-cta')).toBeInTheDocument();
    expect(onInvalid).toHaveBeenCalledTimes(1);
  });

  it('shows invalid state with unknown error for unrecognized error code', async () => {
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('something bad'), { extensions: { code: 'SOME_UNKNOWN_CODE' } })
    );

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onError={onError} onMessage={onMessage} />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'SOME_UNKNOWN_CODE' })
    );
  });

  it('shows invalid state immediately when userId or token is missing (no API call)', () => {
    render(<AccountDeletionConfirmPage userId="" token="" />);

    expect(screen.getByText(defaultAccountDeletionConfirmMessages.invalidTitle)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('applies messages override for individual keys', async () => {
    mutateAsyncMock.mockResolvedValue({ confirmDeleteAccount: { result: true } });

    render(
      <AccountDeletionConfirmPage
        {...VALID_PROPS}
        messages={{ successTitle: 'Done! Goodbye.' }}
      />
    );

    await waitFor(() => expect(screen.getByText('Done! Goodbye.')).toBeInTheDocument());
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onSubmit={onSubmit} onSuccess={onSuccess} />);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ userId: 'user-uuid', token: 'tok-abc123' });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.successTitle)).toBeInTheDocument()
    );
    expect(onSuccess).toHaveBeenCalledWith({ userId: 'user-uuid' });
  });

  it('shares one irreversible request across Strict Mode replays and still commits success once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <StrictMode>
        <AccountDeletionConfirmPage
          {...VALID_PROPS}
          onSubmit={onSubmit}
          onSuccess={onSuccess}
          onMessage={onMessage}
        />
      </StrictMode>
    );

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.successTitle)).toBeInTheDocument()
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('does not commit an abandoned confirmation promise after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const confirmation = deferred<boolean | null>();
    const onSubmit = vi.fn(() => confirmation.promise);
    const onSuccess = vi.fn();
    const onExpired = vi.fn();
    const onInvalid = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const view = render(
      <AccountDeletionConfirmPage
        {...VALID_PROPS}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onExpired={onExpired}
        onInvalid={onInvalid}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    view.unmount();

    await act(async () => {
      confirmation.resolve(true);
      await confirmation.promise;
      await Promise.resolve();
      vi.advanceTimersByTime(3000);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
    expect(onInvalid).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('cancels the owned redirect timer when unmounted during the success delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSubmit = vi.fn().mockResolvedValue(true);
    const view = render(<AccountDeletionConfirmPage {...VALID_PROPS} onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.successTitle)).toBeInTheDocument()
    );
    expect(pushMock).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('applies errors messages override for UNKNOWN_ERROR', async () => {
    const customMsg = 'Custom unknown error text.';
    mutateAsyncMock.mockRejectedValue(new Error('raw error'));

    render(
      <AccountDeletionConfirmPage
        {...VALID_PROPS}
        messages={{ errors: { UNKNOWN_ERROR: customMsg } }}
      />
    );

    await waitFor(() => expect(screen.getByText(customMsg)).toBeInTheDocument());
  });

  it('treats result:false (no throw) as invalid and fires onInvalid + onError', async () => {
    const onInvalid = vi.fn();
    const onError = vi.fn();
    // Server returns { result: false } without throwing — the `deleted === false` branch
    mutateAsyncMock.mockResolvedValue({ confirmDeleteAccount: { result: false } });

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onInvalid={onInvalid} onError={onError} />);

    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNKNOWN_ERROR' }));
  });

  it('handles onSubmit override that rejects: shows error state and fires onError', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('override error'));
    const onError = vi.fn();

    render(<AccountDeletionConfirmPage {...VALID_PROPS} onSubmit={onSubmit} onError={onError} />);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // Rejection with no recognised code → 'error' status (mapped via codeToStatus(null) = 'error')
    await waitFor(() =>
      expect(screen.getByText(defaultAccountDeletionConfirmMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNKNOWN_ERROR' }));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
