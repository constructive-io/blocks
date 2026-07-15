'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { MfaTotpDisableConfirm } from '@/blocks/auth/mfa-totp-disable-confirm/mfa-totp-disable-confirm';
import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <StepUpProvider>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Disable two-factor authentication
        </Button>
        {status ? <p className="mt-4 text-sm text-muted-foreground">{status}</p> : null}
        <MfaTotpDisableConfirm
          open={open}
          onOpenChange={setOpen}
          onSubmit={async () => {
            if (outcome === 'error') {
              throw Object.assign(new Error('Unexpected error'), {
                graphQLErrors: [{ extensions: { code: 'UNKNOWN_ERROR' } }],
              });
            }
            // success: resolves void → block fires onSuccess and closes
          }}
          onSuccess={() => setStatus('Two-factor authentication disabled.')}
          onError={({ message }) => setStatus(`Error: ${message}`)}
        />
      </StepUpProvider>
    </Demo>
  );
}
