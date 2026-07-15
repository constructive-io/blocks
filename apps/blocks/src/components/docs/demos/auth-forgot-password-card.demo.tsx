'use client';

import { useState } from 'react';

import { ForgotPasswordCard } from '@/blocks/auth/forgot-password-card/forgot-password-card';

import { Demo, Segmented, type Outcome } from '../showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <ForgotPasswordCard
        signInHref="#"
        onSubmit={async () => {
          // Success resolves into the block's "check your inbox" panel.
          if (outcome === 'error') throw new Error('rate-limited');
        }}
      />
    </Demo>
  );
}
