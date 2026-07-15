import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * BACKEND-PENDING CASE (b): useCompleteMfaChallengeMutation does not yet exist
 * in `@/generated/auth` (complete_mfa_challenge is not deployed). The component
 * does NOT import from @/generated/auth, so no mock of that module is required.
 * Once the hook lands, add:
 *   vi.mock('@/generated/auth', () => ({
 *     useCompleteMfaChallengeMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false })
 *   }));
 * and wire the hybrid isPending path.
 */

import { MfaTotpChallenge } from './mfa-totp-challenge';
import { defaultMfaTotpChallengeMessages } from './messages';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    session: { id: 's1', accessToken: 'jwt-mfa', expiresAt: '2099-01-01T00:00:00Z' },
    user: { id: 'u1' },
    redirectTo: '/dashboard',
    ...overrides
  };
}

async function typeAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  code = '123456'
) {
  const input = screen.getByTestId('totp-code');
  await user.clear(input);
  await user.type(input, code);
  await user.click(screen.getByTestId('mfa-totp-submit'));
}

describe('MfaTotpChallenge', () => {
  it('renders the card with title, description, code input, and submit', () => {
    render(<MfaTotpChallenge challengeToken="tok_abc" onSubmit={vi.fn().mockResolvedValue(makeResult())} />);
    expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
    expect(screen.getByText('Enter the 6-digit code from your authenticator app.')).toBeInTheDocument();
    expect(screen.getByTestId('totp-code')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-totp-submit')).toHaveTextContent('Verify');
  });

  it('shows trust-device checkbox by default', () => {
    render(<MfaTotpChallenge challengeToken="tok_abc" onSubmit={vi.fn().mockResolvedValue(makeResult())} />);
    expect(
      screen.getByRole('checkbox', { name: 'Trust this device for 30 days' })
    ).toBeInTheDocument();
  });

  it('hides trust-device checkbox when showTrustDevice=false', () => {
    render(
      <MfaTotpChallenge
        challengeToken="tok_abc"
        showTrustDevice={false}
        onSubmit={vi.fn().mockResolvedValue(makeResult())}
      />
    );
    expect(
      screen.queryByRole('checkbox', { name: 'Trust this device for 30 days' })
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit override with correct vars and fires onSuccess + onMessage', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(makeResult());
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <MfaTotpChallenge
        challengeToken="tok_challenge"
        mfaMethod="totp"
        credentialKind="bearer"
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    await typeAndSubmit(user, '654321');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        totpValue: '654321',
        trustDevice: false,
        challengeToken: 'tok_challenge',
        mfaMethod: 'totp',
        credentialKind: 'bearer'
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ session: expect.objectContaining({ accessToken: 'jwt-mfa' }) })
    );
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'completeMfaChallenge.success',
      message: defaultMfaTotpChallengeMessages.successToast
    });
  });

  it('maps INVALID_TOTP error and fires onError + onMessage with kind=error', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('invalid totp'), { extensions: { code: 'INVALID_TOTP' } })
      );

    render(
      <MfaTotpChallenge
        challengeToken="tok_abc"
        onSubmit={onSubmit}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await typeAndSubmit(user, '000000');

    expect(await screen.findByText('Invalid code. Check your authenticator app and try again.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: 'Invalid code. Check your authenticator app and try again.',
      code: 'INVALID_TOTP'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'INVALID_TOTP',
      message: 'Invalid code. Check your authenticator app and try again.'
    });
  });

  it('maps EXPIRED_TOKEN error and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('token expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
      );

    render(
      <MfaTotpChallenge challengeToken="tok_expired" onSubmit={onSubmit} onError={onError} />
    );

    await typeAndSubmit(user, '123456');

    expect(await screen.findByText('Your session expired. Please sign in again.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: 'Your session expired. Please sign in again.',
      code: 'EXPIRED_TOKEN'
    });
  });

  it('surfaces PROCEDURE_NOT_FOUND when no onSubmit is provided (backend-pending graceful path)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No onSubmit provided — the block will throw PROCEDURE_NOT_FOUND internally.
    render(
      <MfaTotpChallenge challengeToken="tok_abc" onError={onError} onMessage={onMessage} />
    );

    await typeAndSubmit(user, '123456');

    expect(
      await screen.findByText(
        'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures'
      )
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('respects messages override for a single error code', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('invalid'), { extensions: { code: 'INVALID_TOTP' } })
      );

    render(
      <MfaTotpChallenge
        challengeToken="tok_abc"
        onSubmit={onSubmit}
        messages={{ errors: { INVALID_TOTP: 'Wrong code, please retry.' } }}
      />
    );

    await typeAndSubmit(user, '000000');

    expect(await screen.findByText('Wrong code, please retry.')).toBeInTheDocument();
  });

  it('rejects invalid (non-6-digit) code before calling onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<MfaTotpChallenge challengeToken="tok_abc" onSubmit={onSubmit} />);

    await typeAndSubmit(user, '12'); // too short

    expect(await screen.findByText('Enter a 6-digit code')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['123 456', '123456'],
    ['123-456', '123456']
  ])('strips formatting from "%s" on change and forwards stripped "%s" to onSubmit', async (rawInput, stripped) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(makeResult());

    render(<MfaTotpChallenge challengeToken="tok_paste" onSubmit={onSubmit} />);

    // Use fireEvent.change to simulate a paste that delivers the raw formatted
    // string directly to the React onChange handler (userEvent.paste does not
    // trigger the React synthetic onChange on @base-ui inputs in jsdom).
    const input = screen.getByTestId('totp-code');
    fireEvent.change(input, { target: { value: rawInput } });
    await user.click(screen.getByTestId('mfa-totp-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ totpValue: stripped })
    );
  });
});
