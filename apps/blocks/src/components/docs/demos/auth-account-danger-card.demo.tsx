'use client';

import { useState } from 'react';

import { AccountDangerCard } from '@/blocks/auth/account-danger-card/account-danger-card';
import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <StepUpProvider>
        <AccountDangerCard
          onSubmit={async () => {
            if (outcome === 'error') {
              throw Object.assign(new Error('Unexpected error'), {
                graphQLErrors: [{ extensions: { code: 'UNKNOWN_ERROR' } }],
              });
            }
            // success: resolves void → block transitions to "email sent" state
          }}
        />
      </StepUpProvider>
    </Demo>
  );
}
