import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mock `next/navigation` — the page reads ?tab= and pushes on tab change.
// ---------------------------------------------------------------------------
const replaceMock = vi.fn();
const searchParamsToStringMock = vi.fn(() => '');
const searchParamsGetMock = vi.fn(() => null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({
    get: searchParamsGetMock,
    toString: searchParamsToStringMock
  })
}));

// ---------------------------------------------------------------------------
// Mock `@/generated/auth` — the page calls useCurrentUserQuery once at mount.
// Default: not loading, user present.
// ---------------------------------------------------------------------------
const { currentUserQueryMock } = vi.hoisted(() => ({
  currentUserQueryMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useCurrentUserQuery: currentUserQueryMock
}));

// ---------------------------------------------------------------------------
// Mock every child card so no generated hooks are invoked.
// The page's responsibility is routing/composition, not re-testing each card.
// We capture props so assertions can verify pass-through behaviour.
// ---------------------------------------------------------------------------
let capturedProfileProps: Record<string, unknown> = {};
let capturedEmailsProps: Record<string, unknown> = {};
let capturedSecurityProps: Record<string, unknown> = {};
let capturedSessionsProps: Record<string, unknown> = {};
let capturedApiKeysProps: Record<string, unknown> = {};
let capturedConnectedProps: Record<string, unknown> = {};
let capturedPhonesProps: Record<string, unknown> = {};
let capturedDangerProps: Record<string, unknown> = {};

vi.mock('@/blocks/auth/account-profile-card/account-profile-card', () => ({
  AccountProfileCard: (props: Record<string, unknown>) => {
    capturedProfileProps = props;
    return <div data-testid="account-profile-card-mock">ProfileCard</div>;
  }
}));

vi.mock('@/blocks/auth/account-emails-list/account-emails-list', () => ({
  AccountEmailsList: (props: Record<string, unknown>) => {
    capturedEmailsProps = props;
    return <div data-testid="account-emails-list-mock">EmailsList</div>;
  }
}));

vi.mock('@/blocks/auth/account-security-card/account-security-card', () => ({
  AccountSecurityCard: (props: Record<string, unknown>) => {
    capturedSecurityProps = props;
    return <div data-testid="account-security-card-mock">SecurityCard</div>;
  }
}));

vi.mock('@/blocks/auth/account-sessions-list/account-sessions-list', () => ({
  AccountSessionsList: (props: Record<string, unknown>) => {
    capturedSessionsProps = props;
    return <div data-testid="account-sessions-list-mock">SessionsList</div>;
  }
}));

vi.mock('@/blocks/auth/account-api-keys-list/account-api-keys-list', () => ({
  AccountApiKeysList: (props: Record<string, unknown>) => {
    capturedApiKeysProps = props;
    return <div data-testid="account-api-keys-list-mock">ApiKeysList</div>;
  }
}));

vi.mock('@/blocks/auth/account-connected-accounts/account-connected-accounts', () => ({
  AccountConnectedAccounts: (props: Record<string, unknown>) => {
    capturedConnectedProps = props;
    return <div data-testid="account-connected-accounts-mock">ConnectedAccounts</div>;
  }
}));

vi.mock('@/blocks/auth/account-phones-list/account-phones-list', () => ({
  AccountPhonesList: (props: Record<string, unknown>) => {
    capturedPhonesProps = props;
    return <div data-testid="account-phones-list-mock">PhonesList</div>;
  }
}));

vi.mock('@/blocks/auth/account-danger-card/account-danger-card', () => ({
  AccountDangerCard: (props: Record<string, unknown>) => {
    capturedDangerProps = props;
    return <div data-testid="account-danger-card-mock">DangerCard</div>;
  }
}));

import AccountSettingsPage from './account-settings-page';
import { defaultAccountSettingsPageMessages } from './messages';

// ---------------------------------------------------------------------------
// Reset captured props + mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  replaceMock.mockReset();
  searchParamsGetMock.mockReset();
  searchParamsToStringMock.mockReset();
  searchParamsGetMock.mockReturnValue(null);
  searchParamsToStringMock.mockReturnValue('');
  capturedProfileProps = {};
  capturedEmailsProps = {};
  capturedSecurityProps = {};
  capturedSessionsProps = {};
  capturedApiKeysProps = {};
  capturedConnectedProps = {};
  capturedPhonesProps = {};
  capturedDangerProps = {};
  // Default: query resolved, not loading
  currentUserQueryMock.mockReturnValue({ isLoading: false, data: { currentUser: { id: 'u1', type: 1 } } });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountSettingsPage', () => {
  it('renders with correct data-slot and page title', () => {
    render(<AccountSettingsPage />);
    expect(document.querySelector('[data-slot="account-settings-page"]')).not.toBeNull();
    expect(screen.getByText(defaultAccountSettingsPageMessages.pageTitle)).toBeInTheDocument();
  });

  it('renders all tab labels by default', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByText(defaultAccountSettingsPageMessages.profileTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.emailsTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.securityTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.sessionsTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.apiKeysTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.connectedAccountsTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.phonesTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.dangerTabLabel)).toBeInTheDocument();
  });

  it('shows the profile card by default (first section active)', () => {
    render(<AccountSettingsPage />);
    // Profile tab is first and active by default
    expect(screen.getByTestId('account-profile-card-mock')).toBeInTheDocument();
  });

  it('hides sections not listed in the sections prop', () => {
    render(<AccountSettingsPage sections={['profile', 'security']} />);
    expect(screen.getByText(defaultAccountSettingsPageMessages.profileTabLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSettingsPageMessages.securityTabLabel)).toBeInTheDocument();
    // Emails tab should not appear
    expect(screen.queryByText(defaultAccountSettingsPageMessages.emailsTabLabel)).toBeNull();
    expect(screen.queryByText(defaultAccountSettingsPageMessages.dangerTabLabel)).toBeNull();
  });

  it('activates the tab matching ?tab= from searchParams', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchParamsGetMock.mockReturnValue('security' as any);
    render(<AccountSettingsPage />);
    // Security card should be rendered (active tab = security)
    expect(screen.getByTestId('account-security-card-mock')).toBeInTheDocument();
  });

  it('ignores an unknown ?tab= value and falls back to first section', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchParamsGetMock.mockReturnValue('not-a-real-tab' as any);
    render(<AccountSettingsPage />);
    // Falls back to profile (first section)
    expect(screen.getByTestId('account-profile-card-mock')).toBeInTheDocument();
  });

  it('calls router.replace with updated ?tab= param when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountSettingsPage />);

    await user.click(screen.getByText(defaultAccountSettingsPageMessages.emailsTabLabel));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    const [url] = replaceMock.mock.calls[0];
    expect(url).toContain('tab=emails');
  });

  it('passes onDeletionEmailSent through to AccountDangerCard (danger tab active)', () => {
    // Activate the danger tab so the card is rendered and props captured.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchParamsGetMock.mockReturnValue('danger' as any);
    const onDeletionEmailSent = vi.fn();
    render(<AccountSettingsPage onDeletionEmailSent={onDeletionEmailSent} />);
    expect(capturedDangerProps.onDeletionEmailSent).toBe(onDeletionEmailSent);
  });

  it('passes onChangePassword through to AccountSecurityCard (security tab active)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchParamsGetMock.mockReturnValue('security' as any);
    const onChangePassword = vi.fn();
    render(<AccountSettingsPage onChangePassword={onChangePassword} />);
    expect(capturedSecurityProps.onChangePassword).toBe(onChangePassword);
  });

  it('passes onManagePasskeys through to AccountSecurityCard (security tab active)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchParamsGetMock.mockReturnValue('security' as any);
    const onManagePasskeys = vi.fn();
    render(<AccountSettingsPage onManagePasskeys={onManagePasskeys} />);
    expect(capturedSecurityProps.onManagePasskeys).toBe(onManagePasskeys);
  });

  it('passes onManageMfa through to AccountSecurityCard (security tab active)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchParamsGetMock.mockReturnValue('security' as any);
    const onManageMfa = vi.fn();
    render(<AccountSettingsPage onManageMfa={onManageMfa} />);
    expect(capturedSecurityProps.onManageMfa).toBe(onManageMfa);
  });

  it('applies a custom className on the root element', () => {
    render(<AccountSettingsPage className="my-custom-class" />);
    const root = document.querySelector('[data-slot="account-settings-page"]');
    expect(root?.classList.contains('my-custom-class')).toBe(true);
  });

  it('supports message overrides for tab labels', () => {
    render(<AccountSettingsPage messages={{ profileTabLabel: 'Your profile' }} />);
    expect(screen.getByText('Your profile')).toBeInTheDocument();
    // Other labels remain default
    expect(screen.getByText(defaultAccountSettingsPageMessages.emailsTabLabel)).toBeInTheDocument();
  });

  it('renders the skip-to-content link for screen readers', () => {
    render(<AccountSettingsPage />);
    const skipLink = document.querySelector('a[href="#account-settings-main"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent).toBe(defaultAccountSettingsPageMessages.skipToContentLabel);
  });

  it('renders profile card with no extra props beyond className (no data seeding from page)', () => {
    render(<AccountSettingsPage />);
    // The page does NOT pass user data to the profile card — each card owns its data
    const profileKeys = Object.keys(capturedProfileProps);
    // Only className (or nothing at all) should be passed — no user, no onSubmit from page
    expect(profileKeys.filter((k) => k !== 'className')).toHaveLength(0);
  });

  it('uses the first section as default tab when ?tab= is absent', () => {
    searchParamsGetMock.mockReturnValue(null);
    render(<AccountSettingsPage sections={['danger', 'profile']} />);
    // First section is 'danger', so danger card should be active
    expect(screen.getByTestId('account-danger-card-mock')).toBeInTheDocument();
  });

  it('shows a loading skeleton while useCurrentUserQuery is resolving', () => {
    currentUserQueryMock.mockReturnValue({ isLoading: true, data: undefined });
    render(<AccountSettingsPage />);
    expect(screen.getByTestId('account-settings-skeleton')).toBeInTheDocument();
    // Tabs should not be rendered yet
    expect(screen.queryByText(defaultAccountSettingsPageMessages.profileTabLabel)).toBeNull();
  });

  it('omits the api-keys tab when allowApiKeys=false', () => {
    render(<AccountSettingsPage allowApiKeys={false} />);
    expect(screen.queryByText(defaultAccountSettingsPageMessages.apiKeysTabLabel)).toBeNull();
    // Other tabs still present
    expect(screen.getByText(defaultAccountSettingsPageMessages.profileTabLabel)).toBeInTheDocument();
  });

  it('shows the api-keys tab when allowApiKeys=true (default)', () => {
    render(<AccountSettingsPage />);
    expect(screen.getByText(defaultAccountSettingsPageMessages.apiKeysTabLabel)).toBeInTheDocument();
  });
});
