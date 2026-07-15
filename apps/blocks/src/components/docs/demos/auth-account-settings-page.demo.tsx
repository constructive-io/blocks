'use client';

/**
 * auth-account-settings-page demo — docs-only live preview.
 *
 * AccountSettingsPage is the convergence page: it composes all account-settings
 * section cards into a tabbed layout. It calls `useCurrentUserQuery` once on
 * mount and reads `useSearchParams()` for tab routing.
 *
 * Strategy (PAGE): render the full page with a tab-selector toggle so the
 * preview shows the realistic multi-tab composition. The mock adapter resolves
 * `currentUser` to an empty object (unmatched query → {}), which means
 * `isLoading` is false and the full Tabs UI renders immediately.
 *
 * Navigation seams are wired to no-ops so the security card's action buttons
 * never trigger real router navigation. The `allowApiKeys` toggle is wired to
 * a Segmented control so the reviewer can see the api-keys tab appearing or
 * disappearing.
 *
 * Suspense is not needed here: AccountSettingsPage already wraps its inner
 * content (which calls useSearchParams) in its own <Suspense> boundary.
 */

import { useState } from 'react';

import AccountSettingsPage from '@/blocks/auth/account-settings-page/account-settings-page';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [apiKeys, setApiKeys] = useState<'enabled' | 'disabled'>('enabled');

  return (
    <Demo>
      <Segmented
        label="API keys tab"
        value={apiKeys}
        options={['enabled', 'disabled'] as const}
        onChange={setApiKeys}
      />
      <div className="w-full max-w-2xl">
        <AccountSettingsPage
          allowApiKeys={apiKeys === 'enabled'}
          onChangePassword={() => {}}
          onManagePasskeys={() => {}}
          onManageMfa={undefined}
          onDeletionEmailSent={() => {}}
          className="px-0 py-4"
        />
      </div>
    </Demo>
  );
}
