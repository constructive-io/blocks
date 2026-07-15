import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// BACKEND-PENDING (CASE b): `useSendEmailOtpMutation` does NOT exist in the
// reference SDK — `send_email_otp` is not yet deployed. This block has NO
// `@/generated/auth` import, so there is nothing to vi.mock here.
//
// Tests exercise the block via the `onSubmit` override seam (the primary path
// until the generated hook ships) and the graceful PROCEDURE_NOT_FOUND path
// (what happens if the block is mounted with no override — the stub throws).

import { EmailOtpRequestCard } from './email-otp-request-card';
import { defaultEmailOtpRequestCardMessages } from './messages';

beforeEach(() => {
  vi.restoreAllMocks();
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'user@example.com' } = {}
) {
  await user.type(screen.getByTestId('email'), email);
  await user.click(screen.getByTestId('email-otp-request-submit'));
}

describe('EmailOtpRequestCard', () => {
  it('renders the form with email field and submit button', () => {
    render(<EmailOtpRequestCard />);
    expect(screen.getByText('Sign in with a code')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('email-otp-request-submit')).toHaveTextContent('Send code');
  });

  it('renders description from default messages', () => {
    render(<EmailOtpRequestCard />);
    expect(screen.getByText(defaultEmailOtpRequestCardMessages.description)).toBeInTheDocument();
  });

  it('shows PROCEDURE_NOT_FOUND error when no onSubmit override is provided', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No override — block hits the stub, which throws PROCEDURE_NOT_FOUND.
    render(<EmailOtpRequestCard onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(await screen.findByText(defaultEmailOtpRequestCardMessages.errors.PROCEDURE_NOT_FOUND)).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultEmailOtpRequestCardMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('transitions to code-sent state via onSubmit override and fires success (showOtpInputInline=false)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <EmailOtpRequestCard
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onMessage={onMessage}
        showOtpInputInline={false}
      />
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com', type: 'sign_in' });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ email: 'user@example.com' });

    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'emailOtpRequest.success'
    });

    // Code-sent panel (confirmation + resend only) should now be visible.
    expect(await screen.findByTestId('code-sent-title')).toBeInTheDocument();
    expect(screen.getByTestId('code-sent-description')).toBeInTheDocument();
  });

  it('passes the otpType prop to onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<EmailOtpRequestCard onSubmit={onSubmit} otpType="verify" />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com', type: 'verify' });
  });

  it('interpolates {{email}} in the code-sent description (showOtpInputInline=false)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<EmailOtpRequestCard onSubmit={onSubmit} showOtpInputInline={false} />);
    await fillAndSubmit(user, { email: 'test@domain.com' });

    await waitFor(() =>
      expect(screen.queryByTestId('code-sent-description')).toBeInTheDocument()
    );
    expect(screen.getByTestId('code-sent-description')).toHaveTextContent(
      'We sent a 6-digit code to test@domain.com. Enter it below.'
    );
  });

  it('maps a coded server error and applies the messages override', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(
      <EmailOtpRequestCard
        onSubmit={onSubmit}
        onError={onError}
        messages={{ errors: { RATE_LIMITED: 'Slow down!' } }}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('Slow down!')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Slow down!', code: 'RATE_LIMITED' });
  });

  it('calls onSubmit override on resend and fires info message (showOtpInputInline=false)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onMessage = vi.fn();

    render(<EmailOtpRequestCard onSubmit={onSubmit} onMessage={onMessage} showOtpInputInline={false} />);
    await fillAndSubmit(user);

    // Wait for code-sent panel (confirmation + resend only).
    await waitFor(() => expect(screen.queryByTestId('resend-button')).toBeInTheDocument());

    // Reset mock counts to isolate the resend call.
    onSubmit.mockClear();
    onMessage.mockClear();

    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com', type: 'sign_in' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'emailOtpRequest.resend' })
    );
  });

  it('uses the onSubmit override instead of the stub path', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();

    render(<EmailOtpRequestCard onSubmit={onSubmit} onError={onError} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // onError must NOT have been called (override resolved successfully).
    expect(onError).not.toHaveBeenCalled();
  });

  it('blocks submit while email field is invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<EmailOtpRequestCard onSubmit={onSubmit} />);
    await user.type(screen.getByTestId('email'), 'not-an-email');
    await user.click(screen.getByTestId('email-otp-request-submit'));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prefills the email field when defaultEmail is provided', () => {
    render(<EmailOtpRequestCard defaultEmail="prefilled@example.com" />);
    expect(screen.getByTestId('email')).toHaveValue('prefilled@example.com');
  });

  it('shows back-to-sign-in link when signInHref is provided', () => {
    render(<EmailOtpRequestCard signInHref="/sign-in" />);
    const link = screen.getByRole('link', { name: '← Back to sign in' });
    expect(link).toHaveAttribute('href', '/sign-in');
  });

  it('hides the sign-in link when signInHref is not provided', () => {
    render(<EmailOtpRequestCard />);
    expect(screen.queryByRole('link', { name: '← Back to sign in' })).not.toBeInTheDocument();
  });

  it('fires EMAIL_OTP_DISABLED error message correctly', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('otp disabled'), { extensions: { code: 'EMAIL_OTP_DISABLED' } })
    );

    render(<EmailOtpRequestCard onSubmit={onSubmit} onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(await screen.findByText(defaultEmailOtpRequestCardMessages.errors.EMAIL_OTP_DISABLED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultEmailOtpRequestCardMessages.errors.EMAIL_OTP_DISABLED,
      code: 'EMAIL_OTP_DISABLED'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'EMAIL_OTP_DISABLED' })
    );
  });

  it('renders EmailOtpInput inline after OTP sent when showOtpInputInline=true (default)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <EmailOtpRequestCard
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ email: 'user@example.com' });

    // EmailOtpInput renders its digit inputs — confirm the inline OTP entry is shown.
    expect(await screen.findByTestId('otp-digit-0')).toBeInTheDocument();
    // No code-sent-title because we rendered EmailOtpInput, not the confirmation card.
    expect(screen.queryByTestId('code-sent-title')).not.toBeInTheDocument();
  });

  it('shows only confirmation + resend when showOtpInputInline=false and fires onSuccess for navigation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <EmailOtpRequestCard
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        showOtpInputInline={false}
      />
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ email: 'user@example.com' });

    // Confirmation card visible; OTP digit inputs absent.
    expect(await screen.findByTestId('code-sent-title')).toBeInTheDocument();
    expect(screen.getByTestId('resend-button')).toBeInTheDocument();
    expect(screen.queryByTestId('otp-digit-0')).not.toBeInTheDocument();
  });
});
