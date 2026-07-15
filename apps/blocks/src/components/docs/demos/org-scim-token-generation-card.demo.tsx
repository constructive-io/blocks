'use client';

import { useState } from 'react';

import { OrgScimTokenGenerationCard } from '@/blocks/org/scim-token-generation-card/scim-token-generation-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <OrgScimTokenGenerationCard
        orgId="org_demo"
        onSubmit={async () => {
          if (outcome === 'error') {
            throw new Error('Something went wrong. Please try again.');
          }
          return {
            token: 'scim_tok_demo_xK9mP2nQrV4sT7wL1jA3bF6hC8uE0dY5',
            expiresAt: null,
          };
        }}
      />
    </Demo>
  );
}
