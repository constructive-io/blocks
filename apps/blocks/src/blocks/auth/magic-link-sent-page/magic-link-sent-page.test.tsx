import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// NOTE: This block is BACKEND-PENDING.
// `useRequestMagicLinkMutation` does not yet exist in the reference SDK
// (`request_magic_link` procedure not deployed). The block does NOT import from
// `@/generated/auth`; it uses a stub default path that throws PROCEDURE_NOT_FOUND.
// Tests exercise:
//   (a) the stub default path (PROCEDURE_NOT_FOUND surfaces in the UI),
//   (b) the `onSubmit` override path (host replaces the network call), and
//   (c) all UI branches (countdown, success, error mapping, navigation links).
// ---------------------------------------------------------------------------

// Mock next/navigation — page uses useRouter + useSearchParams.
const pushMock = vi.fn();
const searchParamsGetMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetMock })
}));

import MagicLinkSentPage from './magic-link-sent-page';
import { defaultMagicLinkSentPageMessages } from './messages';

beforeEach(() => {
  pushMock.mockReset();
  searchParamsGetMock.mockReset();
  // Default: provide an email in searchParams
  searchParamsGetMock.mockImplementation((key: string) => (key === 'email' ? 'user@example.com' : null));
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MagicLinkSentPage', () => {
  it('renders the page with title, email interpolated, and resend button', () => {
    render(<MagicLinkSentPage />);
    expect(screen.getByText(defaultMagicLinkSentPageMessages.title)).toBeInTheDocument();
    // Email interpolated into description
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument();
    expect(screen.getByTestId('resend-button')).toHaveTextContent(defaultMagicLinkSentPageMessages.resendButton);
    expect(document.querySelector('[data-slot="magic-link-sent-page"]')).toBeInTheDocument();
  });

  it('has the correct navigation links', () => {
    render(<MagicLinkSentPage />);
    const differentEmailLink = screen.getByTestId('different-email-link');
    expect(differentEmailLink).toHaveAttribute('href', '/auth/magic-link');
    expect(differentEmailLink).toHaveTextContent(defaultMagicLinkSentPageMessages.differentEmailLink);

    const signInLink = screen.getByTestId('sign-in-link');
    expect(signInLink).toHaveAttribute('href', '/auth/sign-in');
    expect(signInLink).toHaveTextContent(defaultMagicLinkSentPageMessages.signInLink);
  });

  it('shows PROCEDURE_NOT_FOUND when the backend is not deployed (stub default path)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No onSubmit override — the stub default path runs and throws PROCEDURE_NOT_FOUND.
    render(<MagicLinkSentPage onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('resend-button'));

    expect(
      await screen.findByText(defaultMagicLinkSentPageMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkSentPageMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PROCEDURE_NOT_FOUND',
      message: defaultMagicLinkSentPageMessages.errors.PROCEDURE_NOT_FOUND
    });
  });

  it('uses the onSubmit override and fires success callbacks', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(<MagicLinkSentPage onSubmit={onSubmit} onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com' });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(null));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'requestMagicLink.success',
      message: defaultMagicLinkSentPageMessages.resendSuccess
    });
  });

  it('shows the success message after a successful resend (override path)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);

    render(<MagicLinkSentPage onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('resend-button'));

    expect(await screen.findByText(defaultMagicLinkSentPageMessages.resendSuccess)).toBeInTheDocument();
  });

  it('maps RATE_LIMITED error and fires error callbacks', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(<MagicLinkSentPage onSubmit={onSubmit} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('resend-button'));

    expect(await screen.findByText(defaultMagicLinkSentPageMessages.errors.RATE_LIMITED)).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkSentPageMessages.errors.RATE_LIMITED,
      code: 'RATE_LIMITED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'RATE_LIMITED',
      message: defaultMagicLinkSentPageMessages.errors.RATE_LIMITED
    });
  });

  it('applies messages override for error codes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('rate'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(
      <MagicLinkSentPage
        onSubmit={onSubmit}
        messages={{ errors: { RATE_LIMITED: 'Custom rate limit message.' } }}
      />
    );
    await user.click(screen.getByTestId('resend-button'));

    expect(await screen.findByText('Custom rate limit message.')).toBeInTheDocument();
  });

  it('disables the resend button when no email is available', () => {
    searchParamsGetMock.mockReturnValue(null);

    render(<MagicLinkSentPage />);
    const button = screen.getByTestId('resend-button');
    expect(button).toBeDisabled();
  });

  it('renders description fallback when no email is in searchParams', () => {
    searchParamsGetMock.mockReturnValue(null);

    render(<MagicLinkSentPage />);
    // Fallback replaces {{email}} with "your email address"
    expect(screen.getByText(/your email address/)).toBeInTheDocument();
  });

  it('starts countdown after a successful resend (override path)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);

    render(<MagicLinkSentPage onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('resend-button'));

    // After success the button should show the cooldown label
    await waitFor(() => {
      const btn = screen.getByTestId('resend-button');
      expect(btn.textContent).toMatch(/Resend in \d+s/);
    });
  });

  it('ticks to zero, restarts after another resend, and cancels the pending tick on unmount', async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn().mockResolvedValue(null);
    const view = render(<MagicLinkSentPage onSubmit={onSubmit} />);
    const resendButton = screen.getByTestId('resend-button');

    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(resendButton).toHaveTextContent('Resend in 60s');
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(resendButton).toHaveTextContent('Resend in 59s');

    for (let expected = 58; expected >= 0; expected -= 1) {
      act(() => vi.advanceTimersByTime(1000));
      if (expected > 0) expect(resendButton).toHaveTextContent(`Resend in ${expected}s`);
    }

    expect(resendButton).toHaveTextContent(defaultMagicLinkSentPageMessages.resendButton);
    expect(resendButton).toBeEnabled();
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(resendButton).toHaveTextContent('Resend in 60s');
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fires onError for unknown errors', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(new Error('unexpected network failure'));

    render(<MagicLinkSentPage onSubmit={onSubmit} onError={onError} />);
    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: expect.any(String), message: expect.any(String) })
    );
  });
});
