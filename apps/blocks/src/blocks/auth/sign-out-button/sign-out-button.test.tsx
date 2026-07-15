import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth module — no real client touched.
const { mutateAsyncMock, hookOptionsMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  hookOptionsMock: vi.fn()
}));
vi.mock('@/generated/auth', () => ({
  useSignOutMutation: (options: unknown) => {
    hookOptionsMock(options);
    return { mutateAsync: mutateAsyncMock, isPending: false };
  }
}));

// Mock useQueryClient from @tanstack/react-query to capture .clear() calls.
const { clearMock } = vi.hoisted(() => ({ clearMock: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: clearMock })
}));

import { SignOutButton } from './sign-out-button';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  hookOptionsMock.mockClear();
  clearMock.mockReset();
});

describe('SignOutButton', () => {
  it('renders with default button text', () => {
    render(<SignOutButton />);
    expect(screen.getByTestId('sign-out-button')).toHaveTextContent('Sign out');
  });

  it('selects clientMutationId so the PostGraphile mutation document is valid', () => {
    render(<SignOutButton />);
    expect(hookOptionsMock).toHaveBeenCalledWith({ selection: { fields: { clientMutationId: true } } });
  });

  it('renders children when provided', () => {
    render(<SignOutButton>Log out</SignOutButton>);
    expect(screen.getByTestId('sign-out-button')).toHaveTextContent('Log out');
  });

  it('calls mutation, clears cache, and fires onSuccess on happy path', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({});

    render(<SignOutButton onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: {} });
    expect(clearMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'signOut.success',
      message: 'You have been signed out.'
    });
  });

  it('fires onError and onMessage on mutation failure', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('sign out failed'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(<SignOutButton onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: 'Failed to sign out. Please try again.',
      code: 'UNKNOWN_ERROR'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'UNKNOWN_ERROR',
      message: 'Failed to sign out. Please try again.'
    });
    // Cache should NOT be cleared on error
    expect(clearMock).not.toHaveBeenCalled();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(<SignOutButton onSubmit={onSubmit} onSuccess={onSuccess} />);
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(clearMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('applies custom error messages via messages override', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    // Throw a coded error so parseGraphQLError maps it through customMessages.
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('network'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(
      <SignOutButton
        onError={onError}
        onMessage={onMessage}
        messages={{ errors: { UNKNOWN_ERROR: 'Custom sign out error.' } }}
      />
    );
    await user.click(screen.getByTestId('sign-out-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: 'Custom sign out error.', code: 'UNKNOWN_ERROR' });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'error', key: 'UNKNOWN_ERROR', message: 'Custom sign out error.' });
  });
});
