'use client';

import { useState } from 'react';

import { SignOutButton } from '@/blocks/auth/sign-out-button/sign-out-button';

import { Demo, Segmented, type Outcome } from '../showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [status, setStatus] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <SignOutButton
        variant="outline"
        onSubmit={async () => {
          if (outcome === 'error') throw new Error('network');
        }}
        onSuccess={() => setStatus('Signed out — query cache cleared')}
        onError={() => setStatus('Sign-out failed')}
      />
      {status ? <p className="text-pretty mt-4 text-sm text-muted-foreground">{status}</p> : null}
    </Demo>
  );
}
