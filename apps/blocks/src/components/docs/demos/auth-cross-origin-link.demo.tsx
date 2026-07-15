'use client';

import { useState } from 'react';

import { CrossOriginLink } from '@/blocks/auth/cross-origin-link/cross-origin-link';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [status, setStatus] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <CrossOriginLink
        email="demo@example.com"
        password="hunter2"
        destinationOrigin="https://app.example.com"
        destinationPath="/auth/cross-origin"
        rememberMe={false}
        onSubmit={async () => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Invalid email or password.'), {
              extensions: { code: 'INVALID_CREDENTIALS' },
            });
          }
          return 'demo-token-abc123';
        }}
        onSuccess={(_token, url) => {
          setStatus(`Redirecting to: ${url}`);
        }}
        onError={(err) => {
          setStatus(`Error (${err.code}): ${err.message}`);
        }}
      />
      {status ? <p className="text-pretty mt-4 text-xs text-muted-foreground">{status}</p> : null}
    </Demo>
  );
}
