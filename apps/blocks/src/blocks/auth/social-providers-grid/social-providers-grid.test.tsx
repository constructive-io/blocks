import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth hook — this block delegates to auth-social-buttons
// which imports useIdentityProvidersQuery from @/generated/auth. Mocking it
// here ensures no real client is touched.
const { queryDataMock, queryPendingMock, queryErrorMock } = vi.hoisted(() => ({
  queryDataMock: vi.fn(),
  queryPendingMock: vi.fn(),
  queryErrorMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useIdentityProvidersQuery: (_params: unknown) => ({
    data: queryDataMock(),
    isPending: queryPendingMock(),
    error: queryErrorMock()
  })
}));

import { AuthSocialProvidersGrid } from './social-providers-grid';
import { defaultSocialProvidersGridMessages } from './messages';

// ─── localStorage helpers ─────────────────────────────────────────────────

function setLastUsed(slug: string) {
  localStorage.setItem('cnc_last_auth_provider', JSON.stringify({ slug, timestamp: Date.now() }));
}

function clearLastUsed() {
  localStorage.removeItem('cnc_last_auth_provider');
}

// ─── Provider data factory ────────────────────────────────────────────────

function makeProviderData(providers: Array<{ slug: string; kind?: string; displayName?: string; enabled?: boolean }>) {
  return {
    identityProviders: {
      nodes: providers.map((p) => ({
        slug: p.slug,
        kind: p.kind ?? 'oauth2',
        displayName: p.displayName ?? (p.slug.charAt(0).toUpperCase() + p.slug.slice(1)),
        enabled: p.enabled ?? true
      })),
      totalCount: providers.length,
      pageInfo: { hasNextPage: false, hasPreviousPage: false }
    }
  };
}

// ─── Test setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  queryDataMock.mockReturnValue(undefined);
  queryPendingMock.mockReturnValue(false);
  queryErrorMock.mockReturnValue(null);
  clearLastUsed();
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('AuthSocialProvidersGrid', () => {
  // ── data-slot + className ──────────────────────────────────────────────

  it('renders the root element with data-slot="social-providers-grid"', () => {
    render(<AuthSocialProvidersGrid providers={['google']} />);
    const root = document.querySelector('[data-slot="social-providers-grid"]');
    expect(root).not.toBeNull();
  });

  it('applies cn("w-full max-w-sm mx-auto") and merges className prop', () => {
    render(<AuthSocialProvidersGrid providers={['google']} className="my-custom" />);
    const root = document.querySelector('[data-slot="social-providers-grid"]');
    expect(root?.className).toContain('w-full');
    expect(root?.className).toContain('max-w-sm');
    expect(root?.className).toContain('my-custom');
  });

  // ── divider ───────────────────────────────────────────────────────────

  it('shows the outer divider by default', () => {
    render(<AuthSocialProvidersGrid providers={['google']} />);
    expect(screen.getByText(defaultSocialProvidersGridMessages.dividerText)).toBeInTheDocument();
  });

  it('hides the outer divider when showDivider=false', () => {
    render(<AuthSocialProvidersGrid providers={['google']} showDivider={false} />);
    expect(screen.queryByText(defaultSocialProvidersGridMessages.dividerText)).not.toBeInTheDocument();
  });

  // ── provider buttons ─────────────────────────────────────────────────

  it('renders provider buttons from static providers prop', () => {
    render(<AuthSocialProvidersGrid providers={['google', 'github']} />);
    expect(screen.getByTestId('social-btn-google')).toBeInTheDocument();
    expect(screen.getByTestId('social-btn-github')).toBeInTheDocument();
  });

  it('renders provider buttons from DB query', async () => {
    queryDataMock.mockReturnValue(makeProviderData([{ slug: 'google', displayName: 'Google' }]));
    render(<AuthSocialProvidersGrid />);
    await waitFor(() => {
      expect(screen.getByTestId('social-btn-google')).toBeInTheDocument();
    });
  });

  // ── mode label passthrough ────────────────────────────────────────────

  it('passes sign-in mode through to auth-social-buttons', () => {
    render(<AuthSocialProvidersGrid providers={['google']} mode="sign-in" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('passes sign-up mode through to auth-social-buttons', () => {
    render(<AuthSocialProvidersGrid providers={['google']} mode="sign-up" />);
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });

  // ── last-used badge ───────────────────────────────────────────────────

  it('shows "Last used" badge for the previously-used provider (read from localStorage)', async () => {
    setLastUsed('google');
    await act(async () => {
      render(<AuthSocialProvidersGrid providers={['google', 'github']} showLastUsed={true} />);
    });
    await waitFor(() => {
      expect(screen.getByText(defaultSocialProvidersGridMessages.lastUsedBadge)).toBeInTheDocument();
    });
  });

  it('does not show "Last used" badge when showLastUsed=false', async () => {
    setLastUsed('google');
    await act(async () => {
      render(<AuthSocialProvidersGrid providers={['google']} showLastUsed={false} />);
    });
    expect(screen.queryByText(defaultSocialProvidersGridMessages.lastUsedBadge)).not.toBeInTheDocument();
  });

  it('does not show "Last used" badge when localStorage is empty', () => {
    render(<AuthSocialProvidersGrid providers={['google']} showLastUsed={true} />);
    expect(screen.queryByText(defaultSocialProvidersGridMessages.lastUsedBadge)).not.toBeInTheDocument();
  });

  it('does not show "Last used" badge for a different provider', async () => {
    setLastUsed('github');
    await act(async () => {
      render(<AuthSocialProvidersGrid providers={['google', 'github']} showLastUsed={true} />);
    });
    // badge renders for github, not google
    await waitFor(() => {
      expect(screen.getByText(defaultSocialProvidersGridMessages.lastUsedBadge)).toBeInTheDocument();
    });
    // github button has aria-label containing "Last used"
    const githubBtn = screen.getByTestId('social-btn-github');
    expect(githubBtn.getAttribute('aria-label')).toContain(defaultSocialProvidersGridMessages.lastUsedBadge);
  });

  // ── last-used localStorage write on click ─────────────────────────────

  it('writes cnc_last_auth_provider to localStorage on provider click', async () => {
    const user = userEvent.setup();
    const onProviderClick = vi.fn().mockReturnValue(false); // cancel nav
    render(
      <AuthSocialProvidersGrid
        providers={['github']}
        baseOAuthPath="/auth"
        returnTo="/home"
        onProviderClick={onProviderClick}
        showLastUsed={true}
      />
    );
    await user.click(screen.getByTestId('social-btn-github'));
    const raw = localStorage.getItem('cnc_last_auth_provider');
    expect(raw).not.toBeNull();
    const entry = JSON.parse(raw!);
    expect(entry.slug).toBe('github');
    expect(typeof entry.timestamp).toBe('number');
  });

  // ── last-used custom button navigates correctly ───────────────────────

  it('navigates to OAuth URL when the last-used badged button is clicked', async () => {
    // Seed the last-used provider so the custom badged button is rendered.
    setLastUsed('google');
    // Override window.location so jsdom allows href assignment.
    delete (window as any).location;
    (window as any).location = { href: '' };

    const user = userEvent.setup();
    await act(async () => {
      render(
        <AuthSocialProvidersGrid
          providers={['google']}
          baseOAuthPath="/auth"
          returnTo="/dashboard"
          showLastUsed={true}
        />
      );
    });

    // Wait for the badged button to appear (useEffect reads localStorage).
    await waitFor(() => {
      expect(screen.getByTestId('social-btn-google')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('social-btn-google'));

    // localStorage must be updated with the clicked slug.
    const raw = localStorage.getItem('cnc_last_auth_provider');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).slug).toBe('google');

    // Navigation must have fired to the correct OAuth URL.
    expect((window as any).location.href).toBe('/auth/google?return_to=%2Fdashboard');
  });

  // ── onProviderClick forwarding ────────────────────────────────────────

  it('calls onProviderClick with provider and URL when a button is clicked', async () => {
    const user = userEvent.setup();
    const onProviderClick = vi.fn().mockReturnValue(false); // cancel nav
    render(
      <AuthSocialProvidersGrid
        providers={['google']}
        baseOAuthPath="/auth"
        returnTo="/dashboard"
        onProviderClick={onProviderClick}
      />
    );
    await user.click(screen.getByTestId('social-btn-google'));
    expect(onProviderClick).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'google' }),
      expect.stringContaining('/auth/google?return_to=')
    );
  });

  // ── error forwarding ──────────────────────────────────────────────────

  it('forwards onError when auth-social-buttons encounters a query error', async () => {
    const onError = vi.fn();
    const onMessage = vi.fn();
    const err = Object.assign(new Error('Network failure'), { extensions: { code: 'UNKNOWN_ERROR' } });
    queryErrorMock.mockReturnValue(err);
    render(<AuthSocialProvidersGrid onError={onError} onMessage={onMessage} />);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(err);
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
      );
    });
  });

  // ── message overrides ─────────────────────────────────────────────────

  it('accepts a custom dividerText message override', () => {
    render(
      <AuthSocialProvidersGrid
        providers={['google']}
        messages={{ dividerText: 'continue with' }}
      />
    );
    expect(screen.getByText('continue with')).toBeInTheDocument();
  });

  it('accepts a custom lastUsedBadge message override', async () => {
    setLastUsed('google');
    await act(async () => {
      render(
        <AuthSocialProvidersGrid
          providers={['google']}
          showLastUsed={true}
          messages={{ lastUsedBadge: 'Previously used' }}
        />
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Previously used')).toBeInTheDocument();
    });
  });

  it('accepts a custom signInWith message override passed to inner buttons', () => {
    render(
      <AuthSocialProvidersGrid
        providers={['google']}
        mode="sign-in"
        messages={{ signInWith: 'Log in with {{provider}}' }}
      />
    );
    expect(screen.getByText('Log in with Google')).toBeInTheDocument();
  });

  // ── host renderButton override ────────────────────────────────────────

  it('uses the host renderButton override when provided', async () => {
    queryDataMock.mockReturnValue(makeProviderData([{ slug: 'google', displayName: 'Google' }]));
    render(
      <AuthSocialProvidersGrid
        renderButton={(p) => (
          <button key={p.slug} data-testid={`custom-${p.slug}`}>
            Host {p.displayName}
          </button>
        )}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('custom-google')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('social-btn-google')).not.toBeInTheDocument();
  });
});
