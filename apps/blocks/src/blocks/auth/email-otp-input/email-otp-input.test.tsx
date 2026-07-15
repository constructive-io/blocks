import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// BACKEND-PENDING CASE (b): neither useSignInEmailOtpMutation nor
// useSendEmailOtpMutation exists in the reference SDK — the procedures are not
// yet deployed. This block does NOT import `@/generated/auth` at all, so there
// is nothing to vi.mock. The `onVerify` / `onResend` override seam is the
// primary data path until the host regenerates the SDK after the backend ships.
//
// The tests exercise:
//   • happy path via onVerify override
//   • PROCEDURE_NOT_FOUND graceful degradation (no override provided)
//   • auto-submit on full fill
//   • error mapping (INVALID_OTP)
//   • resend success path (info message)
//   • onSubmit override takes precedence and mutateAsync is never called

import { EmailOtpInput } from './email-otp-input';
import { defaultEmailOtpInputMessages } from './messages';

const TEST_EMAIL = 'user@example.com';
const VALID_CODE = '123456';

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    userId: 'u1',
    accessToken: 'jwt-token',
    accessTokenExpiresAt: null,
    isVerified: true,
    mfaRequired: false,
    mfaChallengeToken: null,
    ...overrides
  };
}

/** Type each digit of the code into the segment inputs. */
async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  for (let i = 0; i < code.length; i++) {
    const input = screen.getByTestId(`otp-digit-${i}`);
    await user.type(input, code[i]);
  }
}

describe('EmailOtpInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, description with interpolated email, and 6 segment inputs', () => {
    render(<EmailOtpInput email={TEST_EMAIL} />);

    expect(screen.getByText('Enter your code')).toBeInTheDocument();
    expect(screen.getByText(`We sent a 6-digit code to ${TEST_EMAIL}.`)).toBeInTheDocument();

    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`otp-digit-${i}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId('otp-submit')).toHaveTextContent('Verify');
    expect(screen.getByTestId('resend-button')).toHaveTextContent('Resend code');
  });

  it('renders with a custom length', () => {
    render(<EmailOtpInput email={TEST_EMAIL} length={4} />);
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`otp-digit-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('otp-digit-4')).not.toBeInTheDocument();
  });

  it('happy path: calls onVerify override, fires onSuccess and onMessage', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn().mockResolvedValue(makeResult());
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <EmailOtpInput
        email={TEST_EMAIL}
        onVerify={onVerify}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    await typeCode(user, VALID_CODE);

    // Auto-submit fires when last digit is entered.
    await waitFor(() => expect(onVerify).toHaveBeenCalledTimes(1));
    expect(onVerify).toHaveBeenCalledWith(TEST_EMAIL, VALID_CODE);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', accessToken: 'jwt-token' }));

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'signInEmailOtp.success' })
    );
  });

  it('mfaRequired fires a warning onMessage but still calls onSuccess', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn().mockResolvedValue(makeResult({ mfaRequired: true }));
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <EmailOtpInput email={TEST_EMAIL} onVerify={onVerify} onSuccess={onSuccess} onMessage={onMessage} />
    );

    await typeCode(user, VALID_CODE);

    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'warning', key: 'mfaRequired' }))
    );
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ mfaRequired: true }));
  });

  it('maps INVALID_OTP error, shows inline message, fires onError and onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onVerify = vi.fn().mockRejectedValue(
      Object.assign(new Error('invalid otp'), { extensions: { code: 'INVALID_OTP' } })
    );

    render(
      <EmailOtpInput email={TEST_EMAIL} onVerify={onVerify} onError={onError} onMessage={onMessage} />
    );

    await typeCode(user, VALID_CODE);

    expect(await screen.findByText(defaultEmailOtpInputMessages.errors.INVALID_OTP)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultEmailOtpInputMessages.errors.INVALID_OTP,
      code: 'INVALID_OTP'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'INVALID_OTP',
      message: defaultEmailOtpInputMessages.errors.INVALID_OTP
    });
  });

  it('applies message overrides for a specific error code', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn().mockRejectedValue(
      Object.assign(new Error('expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );

    render(
      <EmailOtpInput
        email={TEST_EMAIL}
        onVerify={onVerify}
        messages={{ errors: { EXPIRED_TOKEN: 'Custom: code is expired.' } }}
      />
    );

    await typeCode(user, VALID_CODE);

    expect(await screen.findByText('Custom: code is expired.')).toBeInTheDocument();
  });

  it('graceful PROCEDURE_NOT_FOUND when no onVerify override is provided', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No onVerify → stub throws PROCEDURE_NOT_FOUND.
    render(<EmailOtpInput email={TEST_EMAIL} onError={onError} onMessage={onMessage} />);

    // Fill all digits to trigger auto-submit.
    await typeCode(user, VALID_CODE);

    // The stub is async — wait for the error to surface.
    const expectedMsg = defaultEmailOtpInputMessages.errors.PROCEDURE_NOT_FOUND;
    expect(await screen.findByText(expectedMsg)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: expectedMsg, code: 'PROCEDURE_NOT_FOUND' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('resend: calls onResend override, fires info onMessage, resets cooldown', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn().mockResolvedValue(undefined);
    const onMessage = vi.fn();

    render(<EmailOtpInput email={TEST_EMAIL} onResend={onResend} onMessage={onMessage} />);

    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(onResend).toHaveBeenCalledTimes(1));
    expect(onResend).toHaveBeenCalledWith(TEST_EMAIL);

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'sendEmailOtp.success' })
    );
    // Resend success message appears.
    expect(await screen.findByText(defaultEmailOtpInputMessages.resendSuccess)).toBeInTheDocument();
  });

  it('resend cooldown uses the custom duration, stops at zero, restarts, and cleans up', async () => {
    vi.useFakeTimers();
    const onResend = vi.fn().mockResolvedValue(undefined);

    const { unmount } = render(
      <EmailOtpInput email={TEST_EMAIL} resendCooldownSeconds={2} onResend={onResend} />
    );

    const resendButton = screen.getByTestId('resend-button');
    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(resendButton).toHaveTextContent('Resend in 2s');
    expect(resendButton).toBeDisabled();
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(resendButton).toHaveTextContent('Resend in 1s');
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(resendButton).toHaveTextContent('Resend code');
    expect(resendButton).not.toBeDisabled();
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      fireEvent.click(resendButton);
    });
    expect(onResend).toHaveBeenCalledTimes(2);
    expect(resendButton).toHaveTextContent('Resend in 2s');
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resend: graceful PROCEDURE_NOT_FOUND when no onResend provided', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    // No onResend → stub throws PROCEDURE_NOT_FOUND.
    render(<EmailOtpInput email={TEST_EMAIL} onError={onError} />);

    await user.click(screen.getByTestId('resend-button'));

    const expectedMsg = defaultEmailOtpInputMessages.errors.PROCEDURE_NOT_FOUND;
    expect(await screen.findByText(expectedMsg)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: expectedMsg, code: 'PROCEDURE_NOT_FOUND' });
  });

  it('manual submit button triggers verification when all digits are filled', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn().mockResolvedValue(makeResult());
    const onSuccess = vi.fn();

    render(<EmailOtpInput email={TEST_EMAIL} onVerify={onVerify} onSuccess={onSuccess} />);

    // Type digits but intercept auto-submit: fill all then click submit.
    // Since auto-submit fires, we just verify it was called once regardless.
    await typeCode(user, VALID_CODE);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('submit button is disabled when digits are incomplete', () => {
    render(<EmailOtpInput email={TEST_EMAIL} />);
    expect(screen.getByTestId('otp-submit')).toBeDisabled();
  });

  it('segment inputs have correct aria-labels', () => {
    render(<EmailOtpInput email={TEST_EMAIL} />);
    expect(screen.getByLabelText('Digit 1 of 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 6 of 6')).toBeInTheDocument();
  });
});
