import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth SDK hook.
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useResetPasswordMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock next/navigation useSearchParams — return empty params by default.
const { searchParamsMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(() => ({ get: vi.fn(() => null) }))
}));
vi.mock('next/navigation', () => ({
  useSearchParams: searchParamsMock
}));

import { ResetPasswordCard } from './reset-password-card';
import { defaultResetPasswordCardMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  // Default: no URL params (missing-token guard unless props are given).
  searchParamsMock.mockReturnValue({ get: vi.fn(() => null) });
});

const VALID_ROLE_ID = 'role-uuid-1234';
const VALID_TOKEN = 'cnc_live_ot_abc123';
const VALID_PASSWORD = 'Str0ng!Pass99';

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { newPassword = VALID_PASSWORD, confirmPassword = VALID_PASSWORD } = {}
) {
  await user.type(screen.getByTestId('newPassword'), newPassword);
  await user.type(screen.getByTestId('confirmPassword'), confirmPassword);
  await user.click(screen.getByTestId('reset-password-submit'));
}

describe('ResetPasswordCard', () => {
  it('renders the form when roleId + token are provided as props', () => {
    render(<ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} />);
    expect(screen.getByText(defaultResetPasswordCardMessages.title)).toBeInTheDocument();
    expect(screen.getByTestId('newPassword')).toBeInTheDocument();
    expect(screen.getByTestId('confirmPassword')).toBeInTheDocument();
    expect(screen.getByTestId('reset-password-submit')).toHaveTextContent(
      defaultResetPasswordCardMessages.submitLabel
    );
  });

  it('shows missing-token state when neither prop nor URL param supplies token', () => {
    render(<ResetPasswordCard />);
    expect(screen.getByText(defaultResetPasswordCardMessages.missingTokenTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultResetPasswordCardMessages.missingTokenMessage)).toBeInTheDocument();
    expect(screen.queryByTestId('reset-password-submit')).not.toBeInTheDocument();
  });

  it('prop roleId + token win over URL searchParams (prop precedence)', async () => {
    // URL has different values — props must win.
    searchParamsMock.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'role_id') return 'url-role-id';
        if (key === 'token') return 'url-token';
        return null;
      })
    });
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ resetPassword: { result: true } });

    render(<ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    // Must be called with prop values, not URL values.
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { roleId: VALID_ROLE_ID, resetToken: VALID_TOKEN, newPassword: VALID_PASSWORD }
    });
  });

  it('reads roleId + token from URL searchParams when props are absent', () => {
    searchParamsMock.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'role_id') return VALID_ROLE_ID;
        if (key === 'token') return VALID_TOKEN;
        return null;
      })
    });
    render(<ResetPasswordCard />);
    expect(screen.getByTestId('reset-password-submit')).toBeInTheDocument();
  });

  it('prefers reset_token and falls back to the legacy token URL parameter', async () => {
    searchParamsMock.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'role_id') return VALID_ROLE_ID;
        if (key === 'reset_token') return 'email-reset-token';
        if (key === 'token') return 'legacy-token';
        return null;
      })
    });
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ resetPassword: { result: true } });

    render(<ResetPasswordCard />);
    await fillAndSubmit(user);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { roleId: VALID_ROLE_ID, resetToken: 'email-reset-token', newPassword: VALID_PASSWORD }
    });
  });

  it('calls the generated resetPassword mutation and transitions to success', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ resetPassword: { result: true } });

    render(
      <ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} onSuccess={onSuccess} onMessage={onMessage} />
    );
    await fillAndSubmit(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { roleId: VALID_ROLE_ID, resetToken: VALID_TOKEN, newPassword: VALID_PASSWORD }
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'resetPassword.success' })
    );
    expect(screen.getByText(defaultResetPasswordCardMessages.successTitle)).toBeInTheDocument();
  });

  it('transitions to expired state when server throws EXPIRED_TOKEN error code', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('token expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );

    render(
      <ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} onError={onError} onMessage={onMessage} />
    );
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByText(defaultResetPasswordCardMessages.expiredTokenTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultResetPasswordCardMessages.expiredTokenDescription)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultResetPasswordCardMessages.errors.EXPIRED_TOKEN,
      code: 'EXPIRED_TOKEN'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'EXPIRED_TOKEN',
      message: defaultResetPasswordCardMessages.errors.EXPIRED_TOKEN
    });
  });

  it('transitions to expired state when result is false (server-side invalid token)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    mutateAsyncMock.mockResolvedValue({ resetPassword: { result: false } });

    render(<ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} onError={onError} />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByText(defaultResetPasswordCardMessages.expiredTokenTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
  });

  it('shows inline error for WEAK_PASSWORD (not expired state)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('weak password'), { extensions: { code: 'WEAK_PASSWORD' } })
    );

    render(<ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} onError={onError} />);
    await fillAndSubmit(user);

    expect(await screen.findByText(defaultResetPasswordCardMessages.errors.WEAK_PASSWORD)).toBeInTheDocument();
    // Form should still be visible (not in expired/success state).
    expect(screen.getByTestId('reset-password-submit')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultResetPasswordCardMessages.errors.WEAK_PASSWORD,
      code: 'WEAK_PASSWORD'
    });
  });

  it('applies message overrides for error codes', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('weak'), { extensions: { code: 'WEAK_PASSWORD' } })
    );

    render(
      <ResetPasswordCard
        roleId={VALID_ROLE_ID}
        token={VALID_TOKEN}
        messages={{ errors: { WEAK_PASSWORD: 'Custom weak password message.' } }}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('Custom weak password message.')).toBeInTheDocument();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();

    render(
      <ResetPasswordCard
        roleId={VALID_ROLE_ID}
        token={VALID_TOKEN}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      roleId: VALID_ROLE_ID,
      resetToken: VALID_TOKEN,
      newPassword: VALID_PASSWORD
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ success: true });
  });

  it('shows inline mismatch error when confirm does not match new password', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} />);

    await user.type(screen.getByTestId('newPassword'), VALID_PASSWORD);
    await user.type(screen.getByTestId('confirmPassword'), 'different-password');
    await user.click(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByText(defaultResetPasswordCardMessages.passwordMismatch)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('blocks submit while fields are empty', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordCard roleId={VALID_ROLE_ID} token={VALID_TOKEN} />);

    await user.click(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByText('New password is required')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
