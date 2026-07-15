'use client';

import { useState } from 'react';

import { AccountDeletionConfirmPage } from '@/blocks/auth/account-deletion-confirm-page/account-deletion-confirm-page';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

/**
 * Demo for auth-account-deletion-confirm-page.
 *
 * The block calls onSubmit once on mount (guarded by calledRef) and transitions
 * through: pending → success | expired | invalid/error.
 *
 * Strategy: key the block on the selected state so each toggle remounts it,
 * letting calledRef reset and allowing onSubmit to resolve to a fresh outcome.
 * No URL params needed — token and userId are explicit props here.
 *
 *   true        → success (redirects after 2 s — suppressed by redirectTo="#")
 *   false/null  → invalid (block returns null → treats as invalid/already-used)
 *   throw with DELETION_TOKEN_EXPIRED code → expired state
 */

type State = 'success' | 'expired' | 'invalid';
const STATES: readonly State[] = ['success', 'expired', 'invalid'];

export function BlockDemo() {
  const [state, setState] = useState<State>('success');
  const [mountKey, setMountKey] = useState(0);

  function handleChange(next: State) {
    setState(next);
    setMountKey((k) => k + 1);
  }

  async function onSubmit(_vars: { userId: string; token: string }): Promise<boolean | null> {
    if (state === 'success') return true;
    if (state === 'invalid') return false;
    // expired: throw with a recognisable extensions.code
    const err = Object.assign(new Error('Deletion link has expired'), {
      extensions: { code: 'DELETION_TOKEN_EXPIRED' },
    });
    throw err;
  }

  return (
    <Demo>
      <Segmented label="State" value={state} options={STATES} onChange={handleChange} />
      <AccountDeletionConfirmPage
        key={mountKey}
        token="tok_demo_abc123"
        userId="usr_demo_00000000"
        redirectTo="#"
        accountSettingsHref="#"
        onSubmit={onSubmit}
        className="min-h-0 py-0 px-0"
      />
    </Demo>
  );
}
