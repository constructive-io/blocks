/**
 * sso-sign-in-card tests
 *
 * v2 stub — no generated hook import, so no `vi.mock('@/generated/auth')` is
 * needed. The block is purely presentational; data wiring is deferred to host
 * via `onDomainSubmit`. Tests cover the deferred-state notice, the host-wiring
 * path (happy + error), and callback firing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthSsoSignInCard } from './sso-sign-in-card';

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'user@company.com' } = {}
) {
  await user.type(screen.getByTestId('email'), email);
  await user.click(screen.getByTestId('sso-submit'));
}

describe('AuthSsoSignInCard', () => {
  it('renders the card with email field and submit button', () => {
    render(<AuthSsoSignInCard />);
    expect(screen.getByText('Sign in with SSO')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('sso-submit')).toHaveTextContent('Continue with SSO');
  });

  it('shows the deferred-state notice when no onDomainSubmit is provided', () => {
    render(<AuthSsoSignInCard />);
    expect(screen.getByText(/SSO domain lookup requires a backend update/i)).toBeInTheDocument();
  });

  it('shows PROCEDURE_NOT_FOUND error when submitting without onDomainSubmit', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(<AuthSsoSignInCard onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(await screen.findByText(/This feature requires a backend update/i)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: expect.stringContaining('backend update'),
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PROCEDURE_NOT_FOUND',
      message: expect.stringContaining('backend update')
    });
  });

  it('calls onDomainSubmit with the email and fires onSsoDetected on success', async () => {
    const user = userEvent.setup();
    const ssoResult = { ssoProviderId: 'prov-1', orgName: 'Acme Corp' };
    const onDomainSubmit = vi.fn().mockResolvedValue(ssoResult);
    const onSsoDetected = vi.fn();
    const onMessage = vi.fn();

    render(
      <AuthSsoSignInCard
        onDomainSubmit={onDomainSubmit}
        onSsoDetected={onSsoDetected}
        onMessage={onMessage}
      />
    );
    await fillAndSubmit(user);

    await waitFor(() => expect(onDomainSubmit).toHaveBeenCalledTimes(1));
    expect(onDomainSubmit).toHaveBeenCalledWith('user@company.com');
    await waitFor(() => expect(onSsoDetected).toHaveBeenCalledWith(ssoResult));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'ssoDetected' })
    );
  });

  it('maps a coded server error from onDomainSubmit and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onDomainSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('not configured'), { extensions: { code: 'SSO_NOT_CONFIGURED' } })
    );

    render(
      <AuthSsoSignInCard
        onDomainSubmit={onDomainSubmit}
        onError={onError}
        onMessage={onMessage}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('SSO is not configured for this domain.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: 'SSO is not configured for this domain.',
      code: 'SSO_NOT_CONFIGURED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'SSO_NOT_CONFIGURED',
      message: 'SSO is not configured for this domain.'
    });
  });

  it('falls back to UNKNOWN_ERROR for unmapped codes', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onDomainSubmit = vi.fn().mockRejectedValue(new Error('oops'));

    render(<AuthSsoSignInCard onDomainSubmit={onDomainSubmit} onError={onError} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Something went wrong. Please try again.', code: 'UNKNOWN_ERROR' });
  });

  it('applies message overrides', async () => {
    render(<AuthSsoSignInCard messages={{ title: 'SSO Login', submitLabel: 'Go' }} />);
    expect(screen.getByText('SSO Login')).toBeInTheDocument();
    expect(screen.getByTestId('sso-submit')).toHaveTextContent('Go');
  });

  it('renders the signInHref back link when provided', () => {
    render(<AuthSsoSignInCard signInHref="/login" />);
    const link = screen.getByRole('link', { name: /Back to sign in/i });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('blocks submit when email is empty', async () => {
    const user = userEvent.setup();
    const onDomainSubmit = vi.fn();

    render(<AuthSsoSignInCard onDomainSubmit={onDomainSubmit} />);
    await user.click(screen.getByTestId('sso-submit'));

    await screen.findByText('Email is required');
    expect(onDomainSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit when email is invalid', async () => {
    const user = userEvent.setup();
    const onDomainSubmit = vi.fn();

    render(<AuthSsoSignInCard onDomainSubmit={onDomainSubmit} />);
    await user.type(screen.getByTestId('email'), 'not-an-email');
    await user.click(screen.getByTestId('sso-submit'));

    await screen.findByText('Please enter a valid email');
    expect(onDomainSubmit).not.toHaveBeenCalled();
  });

  it('pre-fills defaultEmail', () => {
    render(<AuthSsoSignInCard defaultEmail="preset@corp.com" />);
    expect(screen.getByTestId('email')).toHaveValue('preset@corp.com');
  });
});
