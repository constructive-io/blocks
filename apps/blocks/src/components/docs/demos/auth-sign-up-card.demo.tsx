'use client';

import { useState } from 'react';

import { SignUpCard } from '@/blocks/auth/sign-up-card/sign-up-card';

import { Demo, Segmented, type Outcome } from '../showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <SignUpCard
        signInHref="#"
        onSubmit={async () =>
          outcome === 'success'
            ? {
                id: 'usr_demo',
                userId: 'usr_demo',
                accessToken: 'demo.jwt.token',
                accessTokenExpiresAt: null,
                isVerified: false,
                totpEnabled: false,
              }
            : null
        }
      />
    </Demo>
  );
}
