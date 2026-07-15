import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`). Both
// hooks are replaced with stubs returning controllable mutateAsync functions.
const { verifyMutateAsyncMock, resendMutateAsyncMock } = vi.hoisted(() => ({
  verifyMutateAsyncMock: vi.fn(),
  resendMutateAsyncMock: vi.fn()
}));
vi.mock('@/generated/auth', () => ({
  useVerifyEmailMutation: () => ({
    mutateAsync: verifyMutateAsyncMock,
    isPending: false
  }),
  useSendVerificationEmailMutation: () => ({
    mutateAsync: resendMutateAsyncMock,
    isPending: false
  })
}));

// Mock next/navigation so useSearchParams works in test environment.
const { searchParamsMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn()
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: searchParamsMock
  })
}));

import { VerifyEmailPage } from './verify-email-page';
import { defaultVerifyEmailPageMessages } from './messages';

function setSearchParams(emailId: string | null, token: string | null) {
  searchParamsMock.mockImplementation((key: string) => {
    if (key === 'email_id') return emailId;
    if (key === 'token') return token;
    return null;
  });
}

beforeEach(() => {
  verifyMutateAsyncMock.mockReset();
  resendMutateAsyncMock.mockReset();
  searchParamsMock.mockReset();
});

describe('VerifyEmailPage', () => {
  it('shows missing-params state when email_id or token is absent', () => {
    setSearchParams(null, null);
    render(<VerifyEmailPage />);
    expect(screen.getByText(defaultVerifyEmailPageMessages.missingParamsTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultVerifyEmailPageMessages.missingParamsDescription)).toBeInTheDocument();
    expect(verifyMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows missing-params when only token is present', () => {
    setSearchParams(null, 'sometoken');
    render(<VerifyEmailPage />);
    expect(screen.getByText(defaultVerifyEmailPageMessages.missingParamsTitle)).toBeInTheDocument();
    expect(verifyMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows loading state initially when params are present, then success', async () => {
    setSearchParams('email-uuid', 'token-abc');
    verifyMutateAsyncMock.mockResolvedValue({ verifyEmail: { result: true } });

    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    await act(async () => {
      render(<VerifyEmailPage onSuccess={onSuccess} onMessage={onMessage} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.successTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultVerifyEmailPageMessages.successDescription)).toBeInTheDocument();
    expect(screen.getByText(defaultVerifyEmailPageMessages.successCta)).toBeInTheDocument();

    expect(verifyMutateAsyncMock).toHaveBeenCalledWith({
      input: { emailId: 'email-uuid', token: 'token-abc' }
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'verifyEmail.success' });
  });

  it('transitions to invalid state when result is false', async () => {
    setSearchParams('email-uuid', 'token-bad');
    verifyMutateAsyncMock.mockResolvedValue({ verifyEmail: { result: false } });

    const onError = vi.fn();
    const onMessage = vi.fn();

    await act(async () => {
      render(<VerifyEmailPage onError={onError} onMessage={onMessage} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultVerifyEmailPageMessages.invalidDescription)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultVerifyEmailPageMessages.errors.INVALID_TOKEN,
      code: 'INVALID_TOKEN'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'INVALID_TOKEN',
      message: defaultVerifyEmailPageMessages.errors.INVALID_TOKEN
    });
  });

  it('transitions to expired state on EXPIRED_TOKEN error and shows resend when email is provided', async () => {
    setSearchParams('email-uuid', 'expired-token');
    verifyMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('token expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );

    const onMessage = vi.fn();

    await act(async () => {
      render(
        <VerifyEmailPage
          email="user@example.com"
          onMessage={onMessage}
        />
      );
    });

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.expiredTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultVerifyEmailPageMessages.expiredDescription)).toBeInTheDocument();
    expect(screen.getByTestId('resend-button')).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'warning',
      key: 'EXPIRED_TOKEN',
      message: defaultVerifyEmailPageMessages.errors.EXPIRED_TOKEN
    });
  });

  it('transitions to invalid state on INVALID_TOKEN exception', async () => {
    setSearchParams('email-uuid', 'invalid-token');
    verifyMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('bad token'), { extensions: { code: 'INVALID_TOKEN' } })
    );

    const onError = vi.fn();

    await act(async () => {
      render(<VerifyEmailPage onError={onError} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({
      message: defaultVerifyEmailPageMessages.errors.INVALID_TOKEN,
      code: 'INVALID_TOKEN'
    });
  });

  it('transitions to invalid state on unknown error', async () => {
    setSearchParams('email-uuid', 'token-xyz');
    verifyMutateAsyncMock.mockRejectedValue(new Error('network failure'));

    const onError = vi.fn();
    const onMessage = vi.fn();

    await act(async () => {
      render(<VerifyEmailPage onError={onError} onMessage={onMessage} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('sends a resend email when the resend button is clicked', async () => {
    const user = userEvent.setup();
    setSearchParams('email-uuid', 'expired-token');
    verifyMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('token expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );
    resendMutateAsyncMock.mockResolvedValue({ sendVerificationEmail: { result: true } });

    const onMessage = vi.fn();

    await act(async () => {
      render(
        <VerifyEmailPage
          email="user@example.com"
          onMessage={onMessage}
        />
      );
    });

    await waitFor(() => expect(screen.getByTestId('resend-button')).toBeInTheDocument());

    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.expiredResendSuccess)).toBeInTheDocument()
    );
    expect(resendMutateAsyncMock).toHaveBeenCalledWith({
      input: { email: 'user@example.com' }
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'info',
      key: 'resend.success',
      message: defaultVerifyEmailPageMessages.expiredResendSuccess
    });
  });

  it('shows error state and fires onError + onMessage when resend mutation rejects', async () => {
    const user = userEvent.setup();
    setSearchParams('email-uuid', 'expired-token');
    verifyMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('token expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );
    resendMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('too many requests'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    const onError = vi.fn();
    const onMessage = vi.fn();

    await act(async () => {
      render(
        <VerifyEmailPage
          email="user@example.com"
          onError={onError}
          onMessage={onMessage}
        />
      );
    });

    await waitFor(() => expect(screen.getByTestId('resend-button')).toBeInTheDocument());

    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toBeInTheDocument()
    );

    expect(resendMutateAsyncMock).toHaveBeenCalledWith({ input: { email: 'user@example.com' } });
    expect(onError).toHaveBeenCalledWith({
      message: defaultVerifyEmailPageMessages.errors.UNKNOWN_ERROR,
      code: 'UNKNOWN_ERROR'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
    );
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    setSearchParams('email-uuid', 'token-abc');
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();

    await act(async () => {
      render(<VerifyEmailPage onSubmit={onSubmit} onSuccess={onSuccess} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultVerifyEmailPageMessages.successTitle)).toBeInTheDocument()
    );
    expect(onSubmit).toHaveBeenCalledWith({ emailId: 'email-uuid', token: 'token-abc' });
    expect(verifyMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('applies message overrides', async () => {
    setSearchParams('email-uuid', 'good-token');
    verifyMutateAsyncMock.mockResolvedValue({ verifyEmail: { result: true } });

    await act(async () => {
      render(
        <VerifyEmailPage
          messages={{ successTitle: 'All good!', errors: { INVALID_TOKEN: 'Bad link.' } }}
        />
      );
    });

    await waitFor(() => expect(screen.getByText('All good!')).toBeInTheDocument());
  });
});
