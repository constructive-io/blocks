'use client';

import { useState } from 'react';

import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';

import { Demo, Segmented, type Outcome } from '../showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <SignInCard
        forgotPasswordHref="#"
        signUpHref="#"
        onSubmit={async () =>
          outcome === 'success'
            ? {
                id: 'usr_demo',
                userId: 'usr_demo',
                accessToken: 'demo.jwt.token',
                accessTokenExpiresAt: null,
                isVerified: true,
                totpEnabled: false,
                mfaRequired: false,
                mfaChallengeToken: null,
              }
            : // null → the block surfaces an invalid-credentials error.
              null
        }
      />
    </Demo>
  );
}
