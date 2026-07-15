import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated hook — no real client touched.
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useSignUpMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

import { SignUpCard } from './sign-up-card';
import { defaultSignUpCardMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
});

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    userId: 'u1',
    accessToken: 'jwt',
    accessTokenExpiresAt: null,
    isVerified: false,
    totpEnabled: false,
    ...overrides
  };
}

/** Fill email + password (+ confirm when visible) and submit. */
async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  {
    email = 'user@example.com',
    password = 'Str0ng!pw',
    confirmPassword = 'Str0ng!pw',
    withConfirm = true
  } = {}
) {
  await user.type(screen.getByTestId('email'), email);
  await user.type(screen.getByTestId('password'), password);
  if (withConfirm) {
    const confirmInput = screen.queryByTestId('confirmPassword');
    if (confirmInput) await user.type(confirmInput, confirmPassword);
  }
  await user.click(screen.getByTestId('sign-up-submit'));
}

describe('SignUpCard', () => {
  it('renders title, email, password, confirm, and submit', () => {
    render(<SignUpCard />);
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('password')).toBeInTheDocument();
    expect(screen.getByTestId('confirmPassword')).toBeInTheDocument();
    expect(screen.getByTestId('sign-up-submit')).toHaveTextContent('Create account');
  });

  it('calls the generated signUp mutation with { input } and fires success + onMessage', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ signUp: { result: record() } });

    render(<SignUpCard onSuccess={onSuccess} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { email: 'user@example.com', password: 'Str0ng!pw', rememberMe: true, credentialKind: 'bearer' }
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', accessToken: 'jwt' }));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'signUp.success',
      message: defaultSignUpCardMessages.successMessage
    });
  });

  it('maps a coded server error (ACCOUNT_EXISTS) and fires onError', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('account exists'), { extensions: { code: 'ACCOUNT_EXISTS' } })
    );

    render(<SignUpCard onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(
      await screen.findByText('An account with this email already exists. Please sign in or use a different email.')
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: 'An account with this email already exists. Please sign in or use a different email.',
      code: 'ACCOUNT_EXISTS'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'ACCOUNT_EXISTS' })
    );
  });

  it('applies messages override for a single error code', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('account exists'), { extensions: { code: 'ACCOUNT_EXISTS' } })
    );

    render(<SignUpCard messages={{ errors: { ACCOUNT_EXISTS: 'That email is taken.' } }} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('That email is taken.')).toBeInTheDocument();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(record({ userId: 'override-user' }));
    const onSuccess = vi.fn();

    render(<SignUpCard onSubmit={onSubmit} onSuccess={onSuccess} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Str0ng!pw',
      rememberMe: true,
      credentialKind: 'bearer'
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ userId: 'override-user' }));
  });

  it('shows inline mismatch error when confirm-password does not match', async () => {
    const user = userEvent.setup();
    render(<SignUpCard showPasswordConfirm />);

    await user.type(screen.getByTestId('email'), 'user@example.com');
    await user.type(screen.getByTestId('password'), 'Str0ng!pw');
    await user.type(screen.getByTestId('confirmPassword'), 'different!pw');
    await user.click(screen.getByTestId('sign-up-submit'));

    expect(await screen.findByText(defaultSignUpCardMessages.passwordMismatch)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('hides the confirm field when showPasswordConfirm=false', () => {
    render(<SignUpCard showPasswordConfirm={false} />);
    expect(screen.queryByTestId('confirmPassword')).not.toBeInTheDocument();
  });

  it('blocks submit while a required field is empty', async () => {
    const user = userEvent.setup();
    render(<SignUpCard />);

    // Only type email — leave password empty.
    await user.type(screen.getByTestId('email'), 'user@example.com');
    await user.click(screen.getByTestId('sign-up-submit'));

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('calls onCheckPasswordBreach and surfaces warning when breached', async () => {
    const user = userEvent.setup();
    const onCheckPasswordBreach = vi.fn().mockResolvedValue(false);
    const onMessage = vi.fn();

    render(<SignUpCard onCheckPasswordBreach={onCheckPasswordBreach} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onCheckPasswordBreach).toHaveBeenCalledWith('Str0ng!pw'));
    expect(await screen.findByText(defaultSignUpCardMessages.passwordBreached)).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'passwordBreached' })
    );
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
