import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`). The hook is
// replaced with a stub returning our controllable mutateAsync.
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useSignInMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

import { SignInCard } from './sign-in-card';
import { defaultSignInCardMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
});

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    userId: 'u1',
    accessToken: 'jwt',
    accessTokenExpiresAt: null,
    isVerified: true,
    totpEnabled: false,
    mfaRequired: false,
    mfaChallengeToken: null,
    ...overrides
  };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'user@example.com', password = 'hunter2!' } = {}
) {
  await user.type(screen.getByTestId('email'), email);
  await user.type(screen.getByTestId('password'), password);
  await user.click(screen.getByTestId('sign-in-submit'));
}

describe('SignInCard', () => {
  it('renders the card with email, password, and submit', () => {
    render(<SignInCard />);
    expect(screen.getByText('Enter your credentials to access your account.')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('password')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-submit')).toHaveTextContent('Sign in');
  });

  it('calls the generated signIn mutation with { input } and fires success', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record() } });

    render(<SignInCard onSuccess={onSuccess} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { email: 'user@example.com', password: 'hunter2!', rememberMe: true, credentialKind: 'bearer' }
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', accessToken: 'jwt' }));
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'signIn.success', message: 'Signed in.' });
  });

  it('treats a null result as invalid credentials', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    mutateAsyncMock.mockResolvedValue({ signIn: null });

    render(<SignInCard onError={onError} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
  });

  it('maps a coded server error and applies the messages override', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('pg: relation does not exist'), { extensions: { code: 'ACCOUNT_DISABLED' } })
    );

    render(
      <SignInCard
        onError={onError}
        onMessage={onMessage}
        messages={{ errors: { ACCOUNT_DISABLED: 'This account is off.' } }}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('This account is off.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'This account is off.', code: 'ACCOUNT_DISABLED' });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'error', key: 'ACCOUNT_DISABLED', message: 'This account is off.' });
  });

  it('signals mfaRequired as a warning but still fires onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record({ mfaRequired: true }) } });

    render(<SignInCard onSuccess={onSuccess} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith({
        kind: 'warning',
        key: 'mfaRequired',
        message: defaultSignInCardMessages.mfaRequiredMessage
      })
    );
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ mfaRequired: true }));
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(record({ userId: 'override-user' }));
    const onSuccess = vi.fn();

    render(<SignInCard onSubmit={onSubmit} onSuccess={onSuccess} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hunter2!',
      rememberMe: true,
      credentialKind: 'bearer'
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ userId: 'override-user' }));
  });

  it('blocks submit while a field is invalid', async () => {
    const user = userEvent.setup();
    render(<SignInCard />);

    await user.type(screen.getByTestId('email'), 'not-an-email');
    await user.click(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
