import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useSendVerificationEmailMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

import { VerifyEmailBanner } from './verify-email-banner';
import { defaultVerifyEmailBannerMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
});

const TEST_EMAIL = 'user@example.com';

describe('VerifyEmailBanner', () => {
  it('renders the banner text, resend button, and dismiss button', () => {
    render(<VerifyEmailBanner email={TEST_EMAIL} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(defaultVerifyEmailBannerMessages.text)).toBeInTheDocument();
    expect(screen.getByTestId('resend-button')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
  });

  it('calls the generated sendVerificationEmail mutation with { input: { email } } and fires success callbacks', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ sendVerificationEmail: { result: true } });

    render(<VerifyEmailBanner email={TEST_EMAIL} onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: { email: TEST_EMAIL } });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(TEST_EMAIL));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'resendSuccess',
      message: defaultVerifyEmailBannerMessages.resendSuccess
    });
  });

  it('shows inline success text after resend and hides the resend button', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ sendVerificationEmail: { result: true } });

    render(<VerifyEmailBanner email={TEST_EMAIL} />);
    await user.click(screen.getByTestId('resend-button'));

    expect(await screen.findByText(defaultVerifyEmailBannerMessages.resendSuccess)).toBeInTheDocument();
    expect(screen.queryByTestId('resend-button')).not.toBeInTheDocument();
  });

  it('maps a coded server error (RATE_LIMITED) and fires onError/onMessage with kind: error', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(<VerifyEmailBanner email={TEST_EMAIL} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('resend-button'));

    expect(await screen.findByText(defaultVerifyEmailBannerMessages.errors.RATE_LIMITED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultVerifyEmailBannerMessages.errors.RATE_LIMITED,
      code: 'RATE_LIMITED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'RATE_LIMITED',
      message: defaultVerifyEmailBannerMessages.errors.RATE_LIMITED
    });
  });

  it('applies a message override for a specific error code', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('unknown'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(
      <VerifyEmailBanner
        email={TEST_EMAIL}
        messages={{ errors: { UNKNOWN_ERROR: 'Custom error message.' } }}
      />
    );
    await user.click(screen.getByTestId('resend-button'));

    expect(await screen.findByText('Custom error message.')).toBeInTheDocument();
  });

  it('uses the onResend override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();

    render(<VerifyEmailBanner email={TEST_EMAIL} onResend={onResend} onSuccess={onSuccess} />);
    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(onResend).toHaveBeenCalledWith(TEST_EMAIL));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(TEST_EMAIL));
  });

  it('dismisses the banner (internal state) when clicking the dismiss button', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<VerifyEmailBanner email={TEST_EMAIL} onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.click(screen.getByTestId('dismiss-button'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('respects controlled dismissed=true prop — renders nothing', () => {
    render(<VerifyEmailBanner email={TEST_EMAIL} dismissed={true} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not show the resend button when showResendButton=false', () => {
    render(<VerifyEmailBanner email={TEST_EMAIL} showResendButton={false} />);
    expect(screen.queryByTestId('resend-button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows resendPending text and aria-busy on the resend button while isPending', async () => {
    const user = userEvent.setup();
    // A never-resolving override puts overridePending=true for the life of the test.
    const onResend = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<VerifyEmailBanner email={TEST_EMAIL} onResend={onResend} />);
    // Click without awaiting resolution so isPending stays true.
    user.click(screen.getByTestId('resend-button'));

    await waitFor(() => {
      const btn = screen.getByTestId('resend-button');
      expect(btn).toHaveTextContent(defaultVerifyEmailBannerMessages.resendPending);
      expect(btn).toHaveAttribute('aria-busy', 'true');
    });
  });

  it('onResend override rejection sets inline error and fires onError/onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const overrideError = Object.assign(new Error('rate limited'), {
      extensions: { code: 'RATE_LIMITED' }
    });
    const onResend = vi.fn().mockRejectedValue(overrideError);

    render(
      <VerifyEmailBanner
        email={TEST_EMAIL}
        onResend={onResend}
        onError={onError}
        onMessage={onMessage}
      />
    );
    await act(async () => {
      await user.click(screen.getByTestId('resend-button'));
    });

    expect(await screen.findByText(defaultVerifyEmailBannerMessages.errors.RATE_LIMITED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultVerifyEmailBannerMessages.errors.RATE_LIMITED,
      code: 'RATE_LIMITED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'RATE_LIMITED',
      message: defaultVerifyEmailBannerMessages.errors.RATE_LIMITED
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
