'use client';

import { useState } from 'react';

import { MagicLinkRequestCard } from '@/blocks/auth/magic-link-request-card/magic-link-request-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <MagicLinkRequestCard
        defaultEmail="ada@example.com"
        signInHref="#"
        onSubmit={async () => {
          if (outcome === 'error') throw new Error('RATE_LIMITED');
          // success: block transitions internally to the confirmation panel
        }}
      />
    </Demo>
  );
}
