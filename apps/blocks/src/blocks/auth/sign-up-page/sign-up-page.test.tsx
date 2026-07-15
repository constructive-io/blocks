import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mock next/navigation — pages use the router; we capture push calls.
// ---------------------------------------------------------------------------
const { pushMock, searchParamsGetMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamsGetMock: vi.fn().mockReturnValue(null)
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: searchParamsGetMock
  })
}));

// ---------------------------------------------------------------------------
// Mock the sign-up-card dependency — the page is thin glue. We capture the
// `onSuccess` callback to invoke it with controlled results in each test.
// ---------------------------------------------------------------------------
let capturedOnSuccess: ((result: Record<string, unknown>) => void) | undefined;

vi.mock('@/blocks/auth/sign-up-card/sign-up-card', () => ({
  SignUpCard: (props: { signInHref?: string; onSuccess?: (result: Record<string, unknown>) => void }) => {
    capturedOnSuccess = props.onSuccess;
    return (
      <div data-testid="sign-up-card">
        <span data-testid="sign-in-href">{props.signInHref}</span>
      </div>
    );
  }
}));

import { SignUpPage } from './sign-up-page';

beforeEach(() => {
  pushMock.mockReset();
  searchParamsGetMock.mockReturnValue(null);
  capturedOnSuccess = undefined;
});

function verifiedResult(overrides: Record<string, unknown> = {}) {
  return { id: 'u1', userId: 'u1', accessToken: 'jwt', accessTokenExpiresAt: null, isVerified: true, totpEnabled: false, ...overrides };
}

describe('SignUpPage', () => {
  it('renders the sign-up card', () => {
    render(<SignUpPage />);
    expect(screen.getByTestId('sign-up-card')).toBeInTheDocument();
  });

  it('passes the sign-in href constant to the card', () => {
    render(<SignUpPage />);
    expect(screen.getByTestId('sign-in-href')).toHaveTextContent('/auth/sign-in');
  });

  it('redirects to DEFAULT_REDIRECT after verified success (no redirect param)', async () => {
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult());
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to VERIFY_EMAIL_PATH when isVerified=false', async () => {
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult({ isVerified: false }));
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/auth/verify-email-sent');
  });

  it('redirects to VERIFY_EMAIL_PATH when isVerified=null (unknown verification status)', async () => {
    // SDK can return null for isVerified; treat unknown as unverified for safety
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult({ isVerified: null }));
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/auth/verify-email-sent');
  });

  it('respects a safe same-origin ?redirect= param on verified success', async () => {
    // useSearchParams().get() returns already-decoded strings (URLSearchParams semantics)
    searchParamsGetMock.mockReturnValue('/settings');
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult());
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/settings');
  });

  it('rejects a protocol-relative redirect= param (open-redirect guard)', async () => {
    // useSearchParams().get() returns decoded strings; attack URL arrives as-is
    searchParamsGetMock.mockReturnValue('//evil.com/phish');
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult());
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('rejects an absolute URL redirect= param (open-redirect guard)', async () => {
    // useSearchParams().get() returns decoded strings; attack URL arrives as-is
    searchParamsGetMock.mockReturnValue('https://evil.com/phish');
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult());
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('falls back to DEFAULT_REDIRECT on a malformed percent-sequence in redirect= param', async () => {
    // A lone '%' survives URLSearchParams decoding but breaks decodeURIComponent — safeRedirect must not throw
    searchParamsGetMock.mockReturnValue('%');
    render(<SignUpPage />);

    await act(async () => {
      capturedOnSuccess?.(verifiedResult());
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('applies a custom className to the main landmark', () => {
    render(<SignUpPage className="custom-class" />);
    expect(screen.getByRole('main')).toHaveClass('custom-class');
  });
});
