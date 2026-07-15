import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// BACKEND-PENDING (CASE b): `useSignInMagicLinkMutation` does not yet exist in
// the generated auth SDK — the mock module is intentionally empty so that the
// test env mirrors the compile-time situation: no import from `@/generated/auth`
// is needed by the component, and no real client is touched.
vi.mock('@/generated/auth', () => ({}));

// Mock next/navigation so useSearchParams and useRouter work in test environment.
const { searchParamsMock, routerPushMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(),
  routerPushMock: vi.fn()
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: searchParamsMock
  }),
  useRouter: () => ({
    push: routerPushMock
  })
}));

import MagicLinkCallbackPage from './magic-link-callback-page';
import { defaultMagicLinkCallbackPageMessages } from './messages';

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    userId: 'u1',
    accessToken: 'jwt',
    accessTokenExpiresAt: null,
    isVerified: true,
    mfaRequired: false,
    mfaChallengeToken: null,
    ...overrides
  };
}

function setSearchParams(token: string | null, redirect: string | null = null) {
  searchParamsMock.mockImplementation((key: string) => {
    if (key === 'token') return token;
    if (key === 'redirect') return redirect;
    return null;
  });
}

beforeEach(() => {
  searchParamsMock.mockReset();
  routerPushMock.mockReset();
});

describe('MagicLinkCallbackPage', () => {
  it('shows missing-token state immediately when ?token= is absent', () => {
    setSearchParams(null);
    render(<MagicLinkCallbackPage />);
    expect(
      screen.getByText(defaultMagicLinkCallbackPageMessages.missingTokenTitle)
    ).toBeInTheDocument();
    expect(
      screen.getByText(defaultMagicLinkCallbackPageMessages.missingTokenDescription)
    ).toBeInTheDocument();
  });

  it('shows loading state initially and transitions to success on successful onSubmit', async () => {
    setSearchParams('tok_abc');
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(makeResult());

    await act(async () => {
      render(
        <MagicLinkCallbackPage
          onSubmit={onSubmit}
          onSuccess={onSuccess}
          onMessage={onMessage}
        />
      );
    });

    await waitFor(() =>
      expect(screen.getByText(defaultMagicLinkCallbackPageMessages.successTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultMagicLinkCallbackPageMessages.successDescription)).toBeInTheDocument();

    expect(onSubmit).toHaveBeenCalledWith({ token: 'tok_abc', credentialKind: 'bearer' });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'signInMagicLink.success' })
    );
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to safeRedirect(redirect) on success', async () => {
    setSearchParams('tok_abc', '/billing');
    const onSubmit = vi.fn().mockResolvedValue(makeResult());

    await act(async () => {
      render(<MagicLinkCallbackPage onSubmit={onSubmit} />);
    });

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledTimes(1));
    expect(routerPushMock).toHaveBeenCalledWith('/billing');
  });

  it('rejects an external redirect and falls back to DEFAULT_REDIRECT', async () => {
    setSearchParams('tok_abc', 'https://evil.com/steal');
    const onSubmit = vi.fn().mockResolvedValue(makeResult());

    await act(async () => {
      render(<MagicLinkCallbackPage onSubmit={onSubmit} />);
    });

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledTimes(1));
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('routes to MFA path when mfaRequired=true', async () => {
    setSearchParams('tok_mfa');
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(
      makeResult({ mfaRequired: true, mfaChallengeToken: 'mfa_challenge_token' })
    );

    await act(async () => {
      render(
        <MagicLinkCallbackPage
          onSubmit={onSubmit}
          onSuccess={onSuccess}
          onMessage={onMessage}
        />
      );
    });

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledTimes(1));
    expect(routerPushMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/mfa/totp?token=mfa_challenge_token')
    );
    expect(onMessage).toHaveBeenCalledWith({ kind: 'warning', key: 'mfaRequired' });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('transitions to expired state on EXPIRED_TOKEN error', async () => {
    setSearchParams('tok_exp');
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('token expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );

    await act(async () => {
      render(<MagicLinkCallbackPage onSubmit={onSubmit} onError={onError} onMessage={onMessage} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultMagicLinkCallbackPageMessages.expiredTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultMagicLinkCallbackPageMessages.expiredDescription)).toBeInTheDocument();
    expect(screen.getByText(defaultMagicLinkCallbackPageMessages.expiredRequestNewLink)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkCallbackPageMessages.errors.EXPIRED_TOKEN,
      code: 'EXPIRED_TOKEN'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'EXPIRED_TOKEN',
      message: defaultMagicLinkCallbackPageMessages.errors.EXPIRED_TOKEN
    });
  });

  it('transitions to invalid state on INVALID_TOKEN error', async () => {
    setSearchParams('tok_bad');
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('invalid token'), { extensions: { code: 'INVALID_TOKEN' } })
    );

    await act(async () => {
      render(<MagicLinkCallbackPage onSubmit={onSubmit} onError={onError} onMessage={onMessage} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultMagicLinkCallbackPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(screen.getByText(defaultMagicLinkCallbackPageMessages.invalidDescription)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkCallbackPageMessages.errors.INVALID_TOKEN,
      code: 'INVALID_TOKEN'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'INVALID_TOKEN',
      message: defaultMagicLinkCallbackPageMessages.errors.INVALID_TOKEN
    });
  });

  it('transitions to invalid state on unknown error', async () => {
    setSearchParams('tok_unk');
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(new Error('network failure'));

    await act(async () => {
      render(
        <MagicLinkCallbackPage onSubmit={onSubmit} onError={onError} onMessage={onMessage} />
      );
    });

    await waitFor(() =>
      expect(screen.getByText(defaultMagicLinkCallbackPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('surfaces PROCEDURE_NOT_FOUND when no onSubmit override and no generated hook', async () => {
    setSearchParams('tok_no_proc');
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No onSubmit → the block throws PROCEDURE_NOT_FOUND internally.
    await act(async () => {
      render(<MagicLinkCallbackPage onError={onError} onMessage={onMessage} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultMagicLinkCallbackPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkCallbackPageMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('transitions to invalid state when onSubmit returns null', async () => {
    setSearchParams('tok_null');
    const onError = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(null);

    await act(async () => {
      render(<MagicLinkCallbackPage onSubmit={onSubmit} onError={onError} />);
    });

    await waitFor(() =>
      expect(screen.getByText(defaultMagicLinkCallbackPageMessages.invalidTitle)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({
      message: defaultMagicLinkCallbackPageMessages.errors.INVALID_TOKEN,
      code: 'INVALID_TOKEN'
    });
  });

  it('applies messages override — both top-level and errors', async () => {
    setSearchParams('tok_msg');
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('expired'), { extensions: { code: 'EXPIRED_TOKEN' } })
    );

    await act(async () => {
      render(
        <MagicLinkCallbackPage
          onSubmit={onSubmit}
          messages={{
            expiredTitle: 'Link is dead',
            errors: { EXPIRED_TOKEN: 'That link is gone.' }
          }}
        />
      );
    });

    await waitFor(() => expect(screen.getByText('Link is dead')).toBeInTheDocument());
  });
});
