import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth SDK — no real client is touched.
const { mutateAsyncMock, hookOptionsMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  hookOptionsMock: vi.fn()
}));
vi.mock('@/generated/auth', () => ({
  useForgotPasswordMutation: (options: unknown) => {
    hookOptionsMock(options);
    return { mutateAsync: mutateAsyncMock, isPending: false };
  }
}));

import { ForgotPasswordCard } from './forgot-password-card';
import { defaultForgotPasswordCardMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  hookOptionsMock.mockClear();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email = 'user@example.com') {
  await user.type(screen.getByTestId('email'), email);
  await user.click(screen.getByTestId('forgot-password-submit'));
}

describe('ForgotPasswordCard', () => {
  it('renders the form with email field and submit button', () => {
    render(<ForgotPasswordCard />);
    expect(screen.getByText(defaultForgotPasswordCardMessages.title)).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('forgot-password-submit')).toHaveTextContent(
      defaultForgotPasswordCardMessages.submitLabel
    );
  });

  it('selects clientMutationId so the PostGraphile mutation document is valid', () => {
    render(<ForgotPasswordCard />);
    expect(hookOptionsMock).toHaveBeenCalledWith({ selection: { fields: { clientMutationId: true } } });
  });

  it('happy path: transitions to confirmed state on success and interpolates email', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    // forgot_password returns void — mutateAsync resolves with the forgotPassword key (null payload)
    mutateAsyncMock.mockResolvedValue({ forgotPassword: null });

    render(<ForgotPasswordCard onSuccess={onSuccess} onMessage={onMessage} />);
    await fillAndSubmit(user, 'user@example.com');

    // Should transition to confirmation panel
    expect(await screen.findByTestId('confirmation-title')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-title')).toHaveTextContent(
      defaultForgotPasswordCardMessages.confirmationTitle
    );

    // Email interpolated in the description
    const desc = screen.getByTestId('confirmation-description');
    expect(desc.textContent).toContain('user@example.com');
    expect(desc.textContent).not.toContain('{{email}}');

    // Callbacks fired
    expect(onSuccess).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'forgotPassword.success' });

    // Mutation called with correct input wrapper
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: { email: 'user@example.com' } });
  });

  it('FIX1: confirmation panel receives focus after transition (block-owned focusable div)', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ forgotPassword: null });

    render(<ForgotPasswordCard />);
    await fillAndSubmit(user, 'focus@example.com');

    // Wait for the confirmed panel to render
    const title = await screen.findByTestId('confirmation-title');
    // The focusable wrapper is the parent div (tabIndex={-1}) enclosing confirmation-title
    const focusableWrapper = title.closest('[tabindex="-1"]');
    expect(focusableWrapper).not.toBeNull();
    // jsdom sets focus synchronously in the setTimeout callback; wait for it
    await waitFor(() => expect(focusableWrapper).toHaveFocus());
  });

  it('error path: maps a coded server error, shows inline alert, fires onError', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('rate limit exceeded'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(<ForgotPasswordCard onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(
      await screen.findByText(defaultForgotPasswordCardMessages.errors.RATE_LIMITED)
    ).toBeInTheDocument();
    // Card does NOT transition on error
    expect(screen.queryByTestId('confirmation-title')).not.toBeInTheDocument();

    expect(onError).toHaveBeenCalledWith({
      message: defaultForgotPasswordCardMessages.errors.RATE_LIMITED,
      code: 'RATE_LIMITED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'RATE_LIMITED',
      message: defaultForgotPasswordCardMessages.errors.RATE_LIMITED
    });
  });

  it('applies custom error message override', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('rate limit'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(<ForgotPasswordCard messages={{ errors: { RATE_LIMITED: 'Slow down!' } }} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('Slow down!')).toBeInTheDocument();
  });

  it('onSubmit override: calls override instead of generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(<ForgotPasswordCard onSubmit={onSubmit} onSuccess={onSuccess} />);
    await fillAndSubmit(user, 'override@example.com');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'override@example.com' });
    // Generated hook NOT called
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ email: 'override@example.com' });
    // Still transitions to confirmed state
    expect(await screen.findByTestId('confirmation-title')).toBeInTheDocument();
  });

  it('validates email field: shows inline error and blocks submission', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordCard />);

    await user.type(screen.getByTestId('email'), 'not-an-email');
    await user.click(screen.getByTestId('forgot-password-submit'));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('resend button in confirmed state calls the same mutation again', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ forgotPassword: null });

    render(<ForgotPasswordCard onMessage={onMessage} />);
    await fillAndSubmit(user, 'resend@example.com');
    await screen.findByTestId('resend-button');

    // Reset call count after initial submit
    mutateAsyncMock.mockClear();

    await user.click(screen.getByTestId('resend-button'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: { email: 'resend@example.com' } });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'forgotPassword.resend' })
    );
  });
});
