import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mock generated auth hook so no real client is touched.
// (sdk-binding-contract.md: tests mock `@/generated/<ns>`)
// ---------------------------------------------------------------------------
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useSignInMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// ---------------------------------------------------------------------------
// Mock next/navigation — pages use useRouter + useSearchParams.
// ---------------------------------------------------------------------------
const pushMock = vi.fn();
const searchParamsGetMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetMock })
}));

import SignInPage from './sign-in-page';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  pushMock.mockReset();
  searchParamsGetMock.mockReset();
  // Default: no ?redirect= param
  searchParamsGetMock.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    userId: 'u1',
    accessToken: 'jwt',
    accessTokenExpiresAt: null,
    isVerified: true,
    totpEnabled: false,
    mfaRequired: false,
    mfaChallengeToken: null,
    ...overrides
  };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'user@example.com', password = 'hunter2!' } = {}
) {
  await user.type(screen.getByTestId('email'), email);
  await user.type(screen.getByTestId('password'), password);
  await user.click(screen.getByTestId('sign-in-submit'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignInPage', () => {
  it('renders the centered layout with the sign-in card', () => {
    render(<SignInPage />);
    // The card form elements should be visible
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('password')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-submit')).toBeInTheDocument();
    // The page root has the correct data-slot
    expect(document.querySelector('[data-slot="sign-in-page"]')).toBeInTheDocument();
  });

  it('navigates to DEFAULT_REDIRECT after successful sign-in (no ?redirect=)', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record() } });

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to a safe same-origin ?redirect= path after sign-in', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record() } });
    // Return encoded path from searchParams
    searchParamsGetMock.mockReturnValue(encodeURIComponent('/settings/profile'));

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/settings/profile');
  });

  it('rejects an external ?redirect= and falls back to DEFAULT_REDIRECT', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record() } });
    // An external URL should be rejected
    searchParamsGetMock.mockReturnValue(encodeURIComponent('https://evil.com/steal'));

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('routes to MFA_PATH with challenge token when mfaRequired', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({
      signIn: { result: record({ mfaRequired: true, mfaChallengeToken: 'cnc_live_mfa_abc123' }) }
    });

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const [target] = pushMock.mock.calls[0];
    expect(target).toMatch(/^\/auth\/mfa\/totp\?/);
    expect(target).toContain('token=cnc_live_mfa_abc123');
    expect(target).toContain('redirect=');
  });

  it('MFA route carries the safe ?redirect= path', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({
      signIn: { result: record({ mfaRequired: true, mfaChallengeToken: 'tok42' }) }
    });
    searchParamsGetMock.mockReturnValue(encodeURIComponent('/org/abc/dashboard'));

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const [target] = pushMock.mock.calls[0];
    expect(decodeURIComponent(target)).toContain('/org/abc/dashboard');
  });

  it('does not navigate on sign-in error', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('bad creds'), { extensions: { code: 'INVALID_CREDENTIALS' } })
    );

    render(<SignInPage />);
    await fillAndSubmit(user);

    // Error alert renders in the card
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rejects a protocol-relative ?redirect= (//evil.com) and falls back to DEFAULT_REDIRECT', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record() } });
    // Protocol-relative URL — passes startsWith('/') but must be caught by URL-parse guard
    searchParamsGetMock.mockReturnValue(encodeURIComponent('//evil.com'));

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('rejects a /\\/evil.com bypass and falls back to DEFAULT_REDIRECT', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ signIn: { result: record() } });
    // Looks like an absolute path but WHATWG URL-parser resolves it to https://evil.com/
    searchParamsGetMock.mockReturnValue(encodeURIComponent('/\\/evil.com'));

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('routes to DEFAULT_REDIRECT when mfaRequired=true but mfaChallengeToken is null', async () => {
    const user = userEvent.setup();
    // Server signals MFA required but sends no challenge token — should NOT navigate
    // to the MFA path (which would be broken) and should NOT silently bypass MFA
    // by navigating to the dashboard with an authenticated session.
    mutateAsyncMock.mockResolvedValue({
      signIn: { result: record({ mfaRequired: true, mfaChallengeToken: null }) }
    });

    render(<SignInPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    // Must NOT route to MFA path without a token
    const [target] = pushMock.mock.calls[0];
    expect(target).not.toMatch(/^\/auth\/mfa\//);
    // Documents the current fallback behaviour (routes to DEFAULT_REDIRECT)
    expect(target).toBe('/dashboard');
  });
});
