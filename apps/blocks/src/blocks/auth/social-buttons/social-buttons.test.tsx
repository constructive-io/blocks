import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`). The hook is
// replaced with a stub returning our controllable data/isPending/error.
const { queryDataMock, queryPendingMock, queryErrorMock } = vi.hoisted(() => ({
  queryDataMock: vi.fn(),
  queryPendingMock: vi.fn(),
  queryErrorMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useIdentityProvidersQuery: (params: unknown) => {
    void params;
    return {
      data: queryDataMock(),
      isPending: queryPendingMock(),
      error: queryErrorMock()
    };
  }
}));

import { AuthSocialButtons } from './social-buttons';
import { defaultAuthSocialButtonsMessages } from './messages';

beforeEach(() => {
  queryDataMock.mockReturnValue(undefined);
  queryPendingMock.mockReturnValue(false);
  queryErrorMock.mockReturnValue(null);
});

function makeProviderData(providers: Array<{ slug: string; kind?: string; displayName?: string; enabled?: boolean }>) {
  return {
    identityProviders: {
      nodes: providers.map((p) => ({
        slug: p.slug,
        kind: p.kind ?? 'oauth2',
        displayName: p.displayName ?? p.slug.charAt(0).toUpperCase() + p.slug.slice(1),
        enabled: p.enabled ?? true
      })),
      totalCount: providers.length,
      pageInfo: { hasNextPage: false, hasPreviousPage: false }
    }
  };
}

describe('AuthSocialButtons', () => {
  it('renders a loading skeleton while the query is pending', () => {
    queryPendingMock.mockReturnValue(true);
    const { container } = render(<AuthSocialButtons />);
    // Skeleton container has aria-busy="true"
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy).toHaveAttribute('aria-label', defaultAuthSocialButtonsMessages.loadingAriaLabel);
  });

  it('renders provider buttons from the query result', async () => {
    queryDataMock.mockReturnValue(makeProviderData([
      { slug: 'google', displayName: 'Google' },
      { slug: 'github', displayName: 'GitHub' }
    ]));
    render(<AuthSocialButtons />);
    expect(screen.getByTestId('social-btn-google')).toBeInTheDocument();
    expect(screen.getByTestId('social-btn-github')).toBeInTheDocument();
  });

  it('filters out disabled providers from the query result', () => {
    queryDataMock.mockReturnValue(makeProviderData([
      { slug: 'google', enabled: true },
      { slug: 'github', enabled: false }
    ]));
    render(<AuthSocialButtons />);
    expect(screen.getByTestId('social-btn-google')).toBeInTheDocument();
    expect(screen.queryByTestId('social-btn-github')).not.toBeInTheDocument();
  });

  it('uses static providers prop and skips the DB query', () => {
    // queryDataMock returns undefined — if the component uses static providers
    // it should still render buttons without calling the query
    render(<AuthSocialButtons providers={['google', 'facebook']} />);
    expect(screen.getByTestId('social-btn-google')).toBeInTheDocument();
    expect(screen.getByTestId('social-btn-facebook')).toBeInTheDocument();
  });

  it('shows "no providers" message when list is empty', () => {
    queryDataMock.mockReturnValue(makeProviderData([]));
    render(<AuthSocialButtons />);
    expect(screen.getByText(defaultAuthSocialButtonsMessages.noProvidersMessage)).toBeInTheDocument();
  });

  it('fires onMessage({ kind: "info", key: "noProviders" }) when provider list is empty', async () => {
    const onMessage = vi.fn();
    queryDataMock.mockReturnValue(makeProviderData([]));
    render(<AuthSocialButtons onMessage={onMessage} />);
    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'info', key: 'noProviders' })
      );
    });
  });

  it('uses sign-up label when mode="sign-up"', () => {
    render(<AuthSocialButtons providers={['google']} mode="sign-up" />);
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });

  it('uses sign-in label when mode="sign-in"', () => {
    render(<AuthSocialButtons providers={['google']} mode="sign-in" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('hides divider when showDivider=false', () => {
    render(<AuthSocialButtons providers={['google']} showDivider={false} />);
    expect(screen.queryByText(defaultAuthSocialButtonsMessages.dividerText)).not.toBeInTheDocument();
  });

  it('shows divider by default', () => {
    render(<AuthSocialButtons providers={['google']} />);
    expect(screen.getByText(defaultAuthSocialButtonsMessages.dividerText)).toBeInTheDocument();
  });

  it('calls onProviderClick with provider and URL when a button is clicked', async () => {
    const user = userEvent.setup();
    const onProviderClick = vi.fn().mockReturnValue(false); // return false to cancel navigation
    render(
      <AuthSocialButtons
        providers={['github']}
        baseOAuthPath="/auth"
        returnTo="/dashboard"
        onProviderClick={onProviderClick}
      />
    );
    await user.click(screen.getByTestId('social-btn-github'));
    expect(onProviderClick).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'github' }),
      '/auth/github?return_to=%2Fdashboard'
    );
  });

  it('does not navigate when onProviderClick returns false', async () => {
    const user = userEvent.setup();
    const onProviderClick = vi.fn().mockReturnValue(false);
    // window.location.href should not be set — no error thrown
    render(<AuthSocialButtons providers={['google']} onProviderClick={onProviderClick} returnTo="/" />);
    await user.click(screen.getByTestId('social-btn-google'));
    expect(onProviderClick).toHaveBeenCalledTimes(1);
  });

  it('fires onError and onMessage when the query errors', async () => {
    const onError = vi.fn();
    const onMessage = vi.fn();
    const err = Object.assign(new Error('Network failure'), { extensions: { code: 'UNKNOWN_ERROR' } });
    queryErrorMock.mockReturnValue(err);
    render(<AuthSocialButtons onError={onError} onMessage={onMessage} />);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(err);
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
      );
    });
  });

  it('passes the actual error code from GraphQL extensions in onMessage key (M1)', async () => {
    // M1: onMessage key must reflect the actual GraphQL error code returned by
    // parseGraphQLError, not a hardcoded 'UNKNOWN_ERROR' fallback.
    // INVALID_CREDENTIALS is a known code so parseGraphQLError returns it in `code`.
    const onMessage = vi.fn();
    const err = Object.assign(new Error('Invalid email or password.'), {
      extensions: { code: 'INVALID_CREDENTIALS' }
    });
    queryErrorMock.mockReturnValue(err);
    render(<AuthSocialButtons onMessage={onMessage} />);
    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', key: 'INVALID_CREDENTIALS' })
      );
    });
  });

  it('applies a custom error message override for UNKNOWN_ERROR', async () => {
    const err = Object.assign(new Error('fail'), { extensions: { code: 'UNKNOWN_ERROR' } });
    queryErrorMock.mockReturnValue(err);
    render(
      <AuthSocialButtons messages={{ errors: { UNKNOWN_ERROR: 'Custom fetch error.' } }} />
    );
    expect(await screen.findByText('Custom fetch error.')).toBeInTheDocument();
  });

  it('renders with custom renderButton override', async () => {
    queryDataMock.mockReturnValue(makeProviderData([{ slug: 'google' }]));
    render(
      <AuthSocialButtons
        renderButton={(p) => (
          <button key={p.slug} data-testid={`custom-${p.slug}`}>
            Custom {p.displayName}
          </button>
        )}
      />
    );
    expect(screen.getByTestId('custom-google')).toBeInTheDocument();
    expect(screen.queryByTestId('social-btn-google')).not.toBeInTheDocument();
  });

  it('renders icon-only buttons in icon-only layout', () => {
    render(<AuthSocialButtons providers={['google']} layout="icon-only" />);
    const btn = screen.getByTestId('social-btn-google');
    expect(btn).toBeInTheDocument();
    // In icon-only, button has aria-label but no text child
    expect(btn).toHaveAttribute('aria-label');
    // The label text should NOT appear as visible text (icon-only = no text)
    expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
  });

  it('renders generic icon for unknown slug', () => {
    render(<AuthSocialButtons providers={['my-custom-oauth']} />);
    expect(screen.getByTestId('social-btn-my-custom-oauth')).toBeInTheDocument();
  });

  it('sorts built-in providers before custom ones', () => {
    queryDataMock.mockReturnValue(makeProviderData([
      { slug: 'my-custom' },
      { slug: 'google' },
      { slug: 'github' }
    ]));
    render(<AuthSocialButtons />);
    const buttons = screen.getAllByTestId(/^social-btn-/);
    const slugs = buttons.map((b) => b.getAttribute('data-testid')?.replace('social-btn-', ''));
    // github and google come before my-custom
    expect(slugs.indexOf('github')).toBeLessThan(slugs.indexOf('my-custom'));
    expect(slugs.indexOf('google')).toBeLessThan(slugs.indexOf('my-custom'));
  });

  it('accepts message overrides for copy labels', () => {
    render(
      <AuthSocialButtons
        providers={['google']}
        messages={{ signInWith: 'Log in with {{provider}}' }}
        mode="sign-in"
      />
    );
    expect(screen.getByText('Log in with Google')).toBeInTheDocument();
  });

  it('still renders divider while providers are loading (showDivider=true)', () => {
    queryPendingMock.mockReturnValue(true);
    render(<AuthSocialButtons showDivider={true} />);
    // Divider text "or" should still appear (divider renders above skeleton)
    expect(screen.getByText(defaultAuthSocialButtonsMessages.dividerText)).toBeInTheDocument();
  });
});
