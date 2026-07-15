'use client';

/**
 * shell-account-menu demo — docs-only live preview.
 *
 * Strategy: query-fixture.
 * The block reads the current user from useCurrentUserQuery; no user prop seam
 * exists. The manager seeds the docs mock adapter with the previewCurrentUser
 * fixture so the trigger renders with a real name + avatar fallback.
 * onSignOutSuccess intercepts the post-sign-out window.location navigation so
 * the preview stays mounted.
 */

import { useState } from 'react';

import { ShellAccountMenu } from '@/blocks/shell/account-menu/account-menu';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [signedOut, setSignedOut] = useState(false);

  if (signedOut) {
    return (
      <Demo>
        <p className="text-sm text-muted-foreground">
          Signed out — reset the preview to reload.
        </p>
      </Demo>
    );
  }

  return (
    <Demo>
      <div className="w-64">
        <ShellAccountMenu
          accountSettingsHref="#"
          signOutRedirectHref="#"
          showActiveContext
          onSignOutSuccess={() => setSignedOut(true)}
        />
      </div>
    </Demo>
  );
}
