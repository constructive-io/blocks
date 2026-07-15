import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// BACKEND-PENDING (CASE b): `useRequestMagicLinkMutation` does NOT exist in the
// reference SDK — `request_magic_link` is not yet deployed. This block has NO
// `@/generated/auth` import, so there is nothing to vi.mock here.
//
// Tests exercise the block via the `onSubmit` override seam (the primary path
// until the generated hook ships) and the graceful PROCEDURE_NOT_FOUND path
// (what happens if the block is mounted with no override — the stub throws).

import { MagicLinkRequestCard } from './magic-link-request-card';
import { defaultMagicLinkRequestCardMessages } from './messages';

beforeEach(() => {
  vi.restoreAllMocks();
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'user@example.com' } = {}
) {
  await user.type(screen.getByTestId('email'), email);
  await user.click(screen.getByTestId('magic-link-request-submit'));
}

describe('MagicLinkRequestCard', () => {
  it('renders the form with email field and submit button', () => {
    render(<MagicLinkRequestCard />);
    expect(screen.getByText('Sign in with email link')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('magic-link-request-submit')).toHaveTextContent('Send sign-in link');
  });

  it('transitions to confirmation state via onSubmit override and fires success', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <MagicLinkRequestCard
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com' });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ email: 'user@example.com' });

    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'magicLinkRequest.success'
    });

    // Confirmation panel should now be visible.
    expect(await screen.findByTestId('confirmation-title')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-title')).toHaveTextContent('Check your email');
  });

  it('interpolates {{email}} in confirmation description', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<MagicLinkRequestCard onSubmit={onSubmit} />);
    await fillAndSubmit(user, { email: 'test@domain.com' });

    await waitFor(() =>
      expect(screen.queryByTestId('confirmation-description')).toBeInTheDocument()
    );
    expect(screen.getByTestId('confirmation-description')).toHaveTextContent(
      'We sent a sign-in link to test@domain.com. Check your inbox.'
    );
  });

  it('shows PROCEDURE_NOT_FOUND error when no onSubmit override is provided', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No override — block hits the stub, which throws PROCEDURE_NOT_FOUND.
    render(<MagicLinkRequestCard onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(await screen.findByText(defaultMagicLinkRequestCardMessages.errors.PROCEDURE_NOT_FOUND)).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkRequestCardMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('maps a coded server error and applies the messages override', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(
      <MagicLinkRequestCard
        onSubmit={onSubmit}
        onError={onError}
        messages={{ errors: { RATE_LIMITED: 'Slow down!' } }}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('Slow down!')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Slow down!', code: 'RATE_LIMITED' });
  });

  it('calls onSubmit override on resend and fires info message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onMessage = vi.fn();

    render(<MagicLinkRequestCard onSubmit={onSubmit} onMessage={onMessage} />);
    await fillAndSubmit(user);

    // Wait for confirmation panel.
    await waitFor(() => expect(screen.queryByTestId('resend-button')).toBeInTheDocument());

    // Reset mock counts to isolate the resend call.
    onSubmit.mockClear();
    onMessage.mockClear();

    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'magicLinkRequest.resend' })
    );
  });

  it('uses the onSubmit override instead of the stub path', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();

    render(<MagicLinkRequestCard onSubmit={onSubmit} onError={onError} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // onError must NOT have been called (override resolved successfully).
    expect(onError).not.toHaveBeenCalled();
  });

  it('blocks submit while email field is invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<MagicLinkRequestCard onSubmit={onSubmit} />);
    await user.type(screen.getByTestId('email'), 'not-an-email');
    await user.click(screen.getByTestId('magic-link-request-submit'));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows back-to-sign-in link when signInHref is provided', () => {
    render(<MagicLinkRequestCard signInHref="/sign-in" />);
    const link = screen.getByRole('link', { name: '← Back to sign in' });
    expect(link).toHaveAttribute('href', '/sign-in');
  });

  it('hides the back link when showBackLink is false', () => {
    render(<MagicLinkRequestCard showBackLink={false} signInHref="/sign-in" />);
    expect(screen.queryByRole('link', { name: '← Back to sign in' })).not.toBeInTheDocument();
  });
});
