'use client';

/**
 * auth-account-profile-card demo — docs-only live preview.
 *
 * Strategy: mutation block driven via the onSubmit seam.
 * The `user` prop is supplied so the block never calls useCurrentUserQuery.
 * An outcome toggle drives the success vs error path through onSubmit.
 *
 * Success: resolves to an UpdateProfileResult with the updated display name.
 * Error:   throws so the block surfaces a generic error alert.
 */

import { useState } from 'react';

import { AccountProfileCard } from '@/blocks/auth/account-profile-card/account-profile-card';
import type { UpdateProfileInput, UpdateProfileResult } from '@/blocks/auth/account-profile-card/account-profile-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const DEMO_USER = {
  id: 'usr_demo_00000001',
  type: 'person' as const,
  displayName: 'Ada Lovelace',
  profilePicture: null,
};

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  async function onSubmit(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    if (outcome === 'error') {
      throw new Error('An unexpected error occurred. Please try again.');
    }
    return {
      user: {
        id: input.id,
        type: 'person',
        displayName: input.displayName ?? DEMO_USER.displayName,
        profilePicture: input.profilePicture ?? null,
      },
    };
  }

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <AccountProfileCard
        user={DEMO_USER}
        defaultValues={{ displayName: DEMO_USER.displayName }}
        onSubmit={onSubmit}
      />
    </Demo>
  );
}
