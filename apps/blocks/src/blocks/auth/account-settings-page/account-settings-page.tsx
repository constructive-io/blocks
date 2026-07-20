'use client';

/**
 * account-settings-page  (registry: auth-account-settings-page)
 *
 * THE CONVERGENCE PAGE. Composes all account-settings section cards into a
 * single tabbed layout. Installing this page automatically pulls in every
 * section card via registryDependencies.
 *
 * DATA PATH: calls `useCurrentUserQuery` from `@/generated/auth` once at
 * mount to read the current user's `id` and `type`. The result is used to
 * gate the api-keys tab behind the `allowApiKeys` prop (feature flag) and
 * provide a loading skeleton while the query resolves.
 *
 * Tab routing: reads `?tab=<slug>` from the URL via `useSearchParams()` and
 * activates the matching tab. Changing tabs updates the URL for deep-linking.
 *
 * Pages MAY use `next/navigation`; Cards MUST NOT (block-contract.md §6).
 * Ships `auth-account-settings-page.requires.json` per sdk-binding-contract §7.
 *
 * The Suspense boundary is required by Next.js 15 when `useSearchParams` is
 * used anywhere in the component tree below a Client Component boundary.
 *
 * section cards composed:
 *   auth-account-profile-card, auth-account-emails-list,
 *   auth-account-security-card, auth-account-sessions-list,
 *   auth-account-api-keys-list, auth-account-connected-accounts,
 *   auth-account-phones-list, auth-account-danger-card
 */

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { cn } from '@/lib/utils';
import { useCurrentUserQuery } from '@/generated/auth';

import { AccountProfileCard } from '@/blocks/auth/account-profile-card/account-profile-card';
import { AccountEmailsList } from '@/blocks/auth/account-emails-list/account-emails-list';
import { AccountSecurityCard } from '@/blocks/auth/account-security-card/account-security-card';
import { AccountSessionsList } from '@/blocks/auth/account-sessions-list/account-sessions-list';
import { AccountApiKeysList } from '@/blocks/auth/account-api-keys-list/account-api-keys-list';
import { AccountConnectedAccounts } from '@/blocks/auth/account-connected-accounts/account-connected-accounts';
import { AccountPhonesList } from '@/blocks/auth/account-phones-list/account-phones-list';
import { AccountDangerCard } from '@/blocks/auth/account-danger-card/account-danger-card';

import {
  defaultAccountSettingsPageMessages,
  type AccountSettingsPageMessages
} from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountSettingsSection =
  | 'profile'
  | 'emails'
  | 'security'
  | 'sessions'
  | 'api-keys'
  | 'connected-accounts'
  | 'phones'
  | 'danger';

const ALL_SECTIONS: AccountSettingsSection[] = [
  'profile',
  'emails',
  'security',
  'sessions',
  'api-keys',
  'connected-accounts',
  'phones',
  'danger'
];

const DEFAULT_TAB: AccountSettingsSection = 'profile';

export type AccountSettingsPageMessageOverrides = Partial<AccountSettingsPageMessages>;

export type AccountSettingsPageProps = {
  /**
   * Which sections to render. Defaults to all sections.
   * Consumers can hide sections they don't need without forking the page.
   */
  sections?: AccountSettingsSection[];
  messages?: AccountSettingsPageMessageOverrides;
  /**
   * Route to push after account deletion email is sent.
   * Passed through to `auth-account-danger-card`.
   */
  onDeletionEmailSent?: () => void;
  /**
   * Route to use for change-password action.
   * Passed through to `auth-account-security-card`.
   */
  onChangePassword?: () => void;
  /**
   * Route to use for manage-passkeys action.
   * Passed through to `auth-account-security-card`.
   */
  onManagePasskeys?: () => void;
  /**
   * Route to use for manage-MFA action. When undefined, the security card
   * will hide the MFA management CTA (backend-pending in v1).
   * Passed through to `auth-account-security-card`.
   */
  onManageMfa?: () => void;
  /**
   * Feature flag: whether the host app has API keys enabled
   * (`app_settings_auth.allow_api_keys`). Defaults to `true`.
   * When `false`, the API keys tab is omitted from the tab list.
   */
  allowApiKeys?: boolean;
  className?: string;
};

// ---------------------------------------------------------------------------
// Inner content component — must be inside <Suspense> because it calls
// useSearchParams() (Next.js 15 requirement).
// ---------------------------------------------------------------------------

type AccountSettingsPageContentProps = Omit<AccountSettingsPageProps, 'className'> & {
  merged: AccountSettingsPageMessages;
  effectiveSections: AccountSettingsSection[];
};

function AccountSettingsPageContent({
  merged,
  effectiveSections,
  onDeletionEmailSent,
  onChangePassword,
  onManagePasskeys,
  onManageMfa
}: AccountSettingsPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab from URL `?tab=<slug>`, falling back to the first visible section.
  const rawTab = searchParams.get('tab') as AccountSettingsSection | null;
  const firstSection = effectiveSections[0] ?? DEFAULT_TAB;
  const activeTab: AccountSettingsSection =
    rawTab && effectiveSections.includes(rawTab) ? rawTab : firstSection;

  const handleTabChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any) => {
      if (!value || typeof value !== 'string') return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const show = (section: AccountSettingsSection) => effectiveSections.includes(section);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      id="account-settings-main"
    >
      <TabsList className="mb-6 flex-wrap h-auto gap-1">
        {show('profile') && (
          <TabsTrigger value="profile">{merged.profileTabLabel}</TabsTrigger>
        )}
        {show('emails') && (
          <TabsTrigger value="emails">{merged.emailsTabLabel}</TabsTrigger>
        )}
        {show('security') && (
          <TabsTrigger value="security">{merged.securityTabLabel}</TabsTrigger>
        )}
        {show('sessions') && (
          <TabsTrigger value="sessions">{merged.sessionsTabLabel}</TabsTrigger>
        )}
        {show('api-keys') && (
          <TabsTrigger value="api-keys">{merged.apiKeysTabLabel}</TabsTrigger>
        )}
        {show('connected-accounts') && (
          <TabsTrigger value="connected-accounts">
            {merged.connectedAccountsTabLabel}
          </TabsTrigger>
        )}
        {show('phones') && (
          <TabsTrigger value="phones">{merged.phonesTabLabel}</TabsTrigger>
        )}
        {show('danger') && (
          <TabsTrigger value="danger">{merged.dangerTabLabel}</TabsTrigger>
        )}
      </TabsList>

      {show('profile') && (
        <TabsContent value="profile">
          <AccountProfileCard />
        </TabsContent>
      )}

      {show('emails') && (
        <TabsContent value="emails">
          <AccountEmailsList />
        </TabsContent>
      )}

      {show('security') && (
        <TabsContent value="security">
          <AccountSecurityCard
            onChangePassword={onChangePassword}
            onManagePasskeys={onManagePasskeys}
            onManageMfa={onManageMfa}
          />
        </TabsContent>
      )}

      {show('sessions') && (
        <TabsContent value="sessions">
          <AccountSessionsList />
        </TabsContent>
      )}

      {show('api-keys') && (
        <TabsContent value="api-keys">
          <AccountApiKeysList />
        </TabsContent>
      )}

      {show('connected-accounts') && (
        <TabsContent value="connected-accounts">
          <AccountConnectedAccounts />
        </TabsContent>
      )}

      {show('phones') && (
        <TabsContent value="phones">
          <AccountPhonesList />
        </TabsContent>
      )}

      {show('danger') && (
        <TabsContent value="danger">
          <AccountDangerCard onDeletionEmailSent={onDeletionEmailSent} />
        </TabsContent>
      )}
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Default export — drop this file at `app/auth/account/page.tsx`.
 * The `Suspense` boundary is required by Next.js 15 when `useSearchParams` is
 * used anywhere in the component tree below a Client Component boundary.
 *
 * Calls `useCurrentUserQuery` once to read the current user. Uses the result
 * to gate the API keys tab behind the `allowApiKeys` prop.
 */
export default function AccountSettingsPage({
  sections = ALL_SECTIONS,
  messages: messageOverrides,
  onDeletionEmailSent,
  onChangePassword,
  onManagePasskeys,
  onManageMfa,
  allowApiKeys = true,
  className
}: AccountSettingsPageProps) {
  const merged: AccountSettingsPageMessages = {
    ...defaultAccountSettingsPageMessages,
    ...messageOverrides
  };

  // Single top-level query — avoids N+1 loading on mount.
  // Reads id + type; totpEnabled is not yet on UserSelect (backend pending).
  const { isLoading: currentUserLoading } = useCurrentUserQuery({
    selection: { fields: { id: true, type: true } }
  });

  // Gate api-keys tab: omit when allowApiKeys flag is off.
  const effectiveSections: AccountSettingsSection[] = allowApiKeys
    ? sections
    : sections.filter((s) => s !== 'api-keys');

  return (
    <div
      data-slot="account-settings-page"
      className={cn('relative w-full max-w-4xl mx-auto px-4 py-8', className)}
    >
      {/* Skip-to-content for screen readers.
          `sr-only` makes the anchor `position: absolute` without setting
          `left`/`top`, so it would keep its static position and can extend the
          page's horizontal scroll bounds at narrow viewports; `relative` on the
          page wrapper + `left-0 top-0` pin it to the block's corner (which is
          also where it should surface when focus reveals it). */}
      <a
        href="#account-settings-main"
        className="sr-only left-0 top-0 focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        {merged.skipToContentLabel}
      </a>

      <h1 className="mb-6 text-balance text-2xl font-semibold tracking-tight">{merged.pageTitle}</h1>

      {currentUserLoading ? (
        <div
          data-testid="account-settings-skeleton"
          className="space-y-4 animate-pulse"
          aria-label="Loading"
        >
          <div className="h-9 bg-muted rounded w-2/3" />
          <div className="h-48 bg-muted rounded w-full" />
        </div>
      ) : (
        <Suspense>
          <AccountSettingsPageContent
            merged={merged}
            effectiveSections={effectiveSections}
            onDeletionEmailSent={onDeletionEmailSent}
            onChangePassword={onChangePassword}
            onManagePasskeys={onManagePasskeys}
            onManageMfa={onManageMfa}
          />
        </Suspense>
      )}
    </div>
  );
}
