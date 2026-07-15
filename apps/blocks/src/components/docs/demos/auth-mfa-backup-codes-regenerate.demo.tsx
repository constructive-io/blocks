'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { MfaBackupCodesRegenerate } from '@/blocks/auth/mfa-backup-codes-regenerate/mfa-backup-codes-regenerate';
import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <Button variant="outline" onClick={() => setOpen(true)}>
        Regenerate backup codes
      </Button>
      {lastResult ? (
        <p className="text-pretty mt-4 text-sm text-muted-foreground">{lastResult}</p>
      ) : null}
      <StepUpProvider>
        <MfaBackupCodesRegenerate
          open={open}
          onOpenChange={setOpen}
          onSubmit={async () => {
            if (outcome === 'error') {
              throw Object.assign(new Error('Something went wrong'), {
                graphQLErrors: [{ extensions: { code: 'UNKNOWN_ERROR' } }],
              });
            }
            return {
              codes: [
                'ABCD-1234',
                'EFGH-5678',
                'IJKL-9012',
                'MNOP-3456',
                'QRST-7890',
                'UVWX-1234',
                'YZAB-5678',
                'CDEF-9012',
              ],
            };
          }}
          onSuccess={(result) => {
            setLastResult(`${result.codes.length} new codes generated`);
          }}
          onError={(err) => {
            setLastResult(`Error: ${err.message}`);
          }}
        />
      </StepUpProvider>
    </Demo>
  );
}
