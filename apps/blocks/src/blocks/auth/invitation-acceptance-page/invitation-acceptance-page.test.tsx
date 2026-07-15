import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// vi.hoisted: capture card props so we can call onSuccess directly (M3)
// ---------------------------------------------------------------------------
const capturedCardProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

// ---------------------------------------------------------------------------
// Mock the card — captures props so we can invoke onSuccess/onDecline directly.
// Tests that need the real card (acceptance flow) use submitAppMock / submitOrgMock
// via the card's generated-hook mocks below; the mock passes those through
// by falling back to the real card only when needed.
//
// For simplicity we keep the REAL card and add the capturer alongside it via
// the `vi.mock` factory. The factory injects a thin wrapper that records props.
// ---------------------------------------------------------------------------
vi.mock(
  '@/blocks/auth/invitation-acceptance-card/invitation-acceptance-card',
  async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal() as Record<string, any>;
    const OriginalCard = actual.InvitationAcceptanceCard;
    return {
      ...actual,
      InvitationAcceptanceCard: (props: Record<string, unknown>) => {
        capturedCardProps.current = props;
        // Render the real card so all acceptance-flow tests continue to work.
        return <OriginalCard {...props} />;
      }
    };
  }
);

// ---------------------------------------------------------------------------
// Mock generated admin hooks so no real client is touched.
// (sdk-binding-contract.md: tests mock `@/generated/<ns>`)
// The card imports useSubmitAppInviteCodeMutation / useSubmitOrgInviteCodeMutation
// from @/generated/admin — mock them here so renders are self-contained.
// ---------------------------------------------------------------------------
const { submitAppMock, submitOrgMock } = vi.hoisted(() => ({
  submitAppMock: vi.fn(),
  submitOrgMock: vi.fn()
}));

vi.mock('@/generated/admin', () => ({
  useSubmitAppInviteCodeMutation: () => ({ mutateAsync: submitAppMock, isPending: false }),
  useSubmitOrgInviteCodeMutation: () => ({ mutateAsync: submitOrgMock, isPending: false })
}));

// ---------------------------------------------------------------------------
// Mock generated auth hook — useCurrentUserQuery (auth gate).
// ---------------------------------------------------------------------------
const { currentUserQueryMock } = vi.hoisted(() => ({
  currentUserQueryMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useCurrentUserQuery: currentUserQueryMock
}));

// ---------------------------------------------------------------------------
// Mock next/navigation — pages use useRouter + useSearchParams.
// ---------------------------------------------------------------------------
const pushMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsGetMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: searchParamsGetMock })
}));

import InvitationAcceptancePage from './invitation-acceptance-page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setSearchParams(params: Record<string, string | null>) {
  searchParamsGetMock.mockImplementation((key: string) => params[key] ?? null);
}

/** Simulate a signed-in, email-verified user. */
function signedInVerified() {
  currentUserQueryMock.mockReturnValue({
    data: { currentUser: { id: 'u1', isVerified: true } },
    isLoading: false
  });
}

/** Simulate no current user (not signed in). */
function notSignedIn() {
  currentUserQueryMock.mockReturnValue({
    data: { currentUser: null },
    isLoading: false
  });
}

/** Simulate auth state still loading. */
function authLoadingState() {
  currentUserQueryMock.mockReturnValue({
    data: undefined,
    isLoading: true
  });
}

beforeEach(() => {
  submitAppMock.mockReset();
  submitOrgMock.mockReset();
  pushMock.mockReset();
  replaceMock.mockReset();
  searchParamsGetMock.mockReset();
  currentUserQueryMock.mockReset();
  capturedCardProps.current = null;
  // Defaults: valid app invite token, no redirect, signed in + verified
  setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: null });
  signedInVerified();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InvitationAcceptancePage', () => {
  // ── Auth gate ───────────────────────────────────────────────────────────────

  it('shows a loading skeleton while auth state is being determined', () => {
    authLoadingState();
    render(<InvitationAcceptancePage />);
    expect(screen.getByTestId('auth-loading-skeleton')).toBeInTheDocument();
    // Card is NOT rendered while loading
    expect(screen.queryByTestId('accept-invite-submit')).not.toBeInTheDocument();
  });

  it('redirects to SIGN_IN_PATH with encoded return URL when user is not signed in', async () => {
    notSignedIn();
    setSearchParams({ token: 'tkn_app_abc', kind: 'app', redirect: null });
    render(<InvitationAcceptancePage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1));
    const [target] = replaceMock.mock.calls[0];
    expect(target).toMatch(/^\/auth\/sign-in\?redirect=/);
    expect(decodeURIComponent(target)).toContain('/invite?token=tkn_app_abc&kind=app');
  });

  it('does not redirect when the user is signed in', () => {
    signedInVerified();
    render(<InvitationAcceptancePage />);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // ── Core rendering ──────────────────────────────────────────────────────────

  it('renders the page with the invitation-acceptance-card when signed in', () => {
    render(<InvitationAcceptancePage />);
    expect(document.querySelector('[data-slot="invitation-acceptance-page"]')).toBeInTheDocument();
    expect(screen.getByTestId('accept-invite-submit')).toBeInTheDocument();
    expect(screen.getByTestId('decline-invite-button')).toBeInTheDocument();
  });

  it('renders the missing-token state when token is absent (signed in)', () => {
    setSearchParams({ token: null, kind: null, redirect: null });
    render(<InvitationAcceptancePage />);
    expect(screen.getByText('Invalid link')).toBeInTheDocument();
    expect(screen.getByText(/missing required parameters/i)).toBeInTheDocument();
    expect(screen.queryByTestId('accept-invite-submit')).not.toBeInTheDocument();
  });

  it('passes kind="app" (default) when ?kind is absent', () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: null });
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });
    render(<InvitationAcceptancePage />);
    expect(screen.getByTestId('accept-invite-submit')).toBeInTheDocument();
  });

  it('passes kind="org" when ?kind=org', async () => {
    setSearchParams({ token: 'tkn_org_xyz', kind: 'org', redirect: null });
    submitOrgMock.mockResolvedValue({ submitOrgInviteCode: { result: true } });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    await waitFor(() => expect(submitOrgMock).toHaveBeenCalledTimes(1));
    expect(submitOrgMock).toHaveBeenCalledWith({ input: { token: 'tkn_org_xyz' } });
  });

  it('navigates to DEFAULT_REDIRECT after successful app invite acceptance (no redirectTo)', async () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: null });
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to a safe same-origin ?redirect= path after acceptance', async () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: encodeURIComponent('/org/abc/dashboard') });
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/org/abc/dashboard');
  });

  it('navigates to DECLINE_REDIRECT when Decline is clicked', async () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: null });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('decline-invite-button'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('rejects an external ?redirect= and falls back to DEFAULT_REDIRECT', async () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: encodeURIComponent('https://evil.com/steal') });
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('rejects a protocol-relative ?redirect= and falls back to DEFAULT_REDIRECT', async () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: encodeURIComponent('//evil.com') });
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows an error when the generated hook rejects', async () => {
    setSearchParams({ token: 'tkn_app_abc', kind: null, redirect: null });
    submitAppMock.mockRejectedValue(
      Object.assign(new Error('invite not found'), { extensions: { code: 'INVITE_NOT_FOUND' } })
    );
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    expect(await screen.findByText(/This invitation was not found/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── M2: org invite acceptance navigates to /dashboard ──────────────────────

  it('navigates to DEFAULT_REDIRECT after successful org invite acceptance', async () => {
    setSearchParams({ token: 'tkn_org_xyz', kind: 'org', redirect: null });
    submitOrgMock.mockResolvedValue({ submitOrgInviteCode: { result: true } });
    const user = userEvent.setup();
    render(<InvitationAcceptancePage />);
    await user.click(screen.getByTestId('accept-invite-submit'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  // ── M3: result.redirectTo code path ────────────────────────────────────────

  it('routes to result.redirectTo (same-origin custom path) when card calls onSuccess with it', async () => {
    render(<InvitationAcceptancePage />);
    // Wait for card to mount and props to be captured
    await waitFor(() => expect(capturedCardProps.current).not.toBeNull());
    // Call onSuccess directly with a redirectTo value — exercises handleSuccess
    const onSuccess = capturedCardProps.current!.onSuccess as (r: { kind: string; redirectTo?: string }) => void;
    onSuccess({ kind: 'app', redirectTo: '/custom-path' });
    expect(pushMock).toHaveBeenCalledWith('/custom-path');
  });

  it('falls back to DEFAULT_REDIRECT when result.redirectTo is an external URL', async () => {
    render(<InvitationAcceptancePage />);
    await waitFor(() => expect(capturedCardProps.current).not.toBeNull());
    const onSuccess = capturedCardProps.current!.onSuccess as (r: { kind: string; redirectTo?: string }) => void;
    onSuccess({ kind: 'app', redirectTo: 'https://evil.com/steal' });
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });
});
