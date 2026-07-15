'use client';

import { useState } from 'react';

import { VerifyEmailBanner } from '@/blocks/auth/verify-email-banner/verify-email-banner';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [dismissed, setDismissed] = useState(false);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      {dismissed ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-md px-2 text-xs text-muted-foreground underline underline-offset-4 transition-[color,scale] duration-150 ease-out hover:text-foreground motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:min-h-10"
          onClick={() => setDismissed(false)}
        >
          Restore banner
        </button>
      ) : (
        <VerifyEmailBanner
          className="max-w-2xl"
          email="user@example.com"
          onResend={async (_email) => {
            if (outcome === 'error') {
              throw new Error('RATE_LIMITED');
            }
            return true;
          }}
          onDismiss={() => setDismissed(true)}
        />
      )}
    </Demo>
  );
}
