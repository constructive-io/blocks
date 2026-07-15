'use client';

import { useState } from 'react';

import { AnonymousSignInButton } from '@/blocks/auth/anonymous-sign-in-button/anonymous-sign-in-button';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [status, setStatus] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <AnonymousSignInButton
        onSubmit={async () => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Guest access is not available.'), {
              extensions: { code: 'ANONYMOUS_DISABLED' },
            });
          }
          return {
            id: 'sess_demo',
            userId: 'usr_anon_demo',
            accessToken: 'demo.anon.jwt.token',
            accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
            isAnonymous: true as const,
          };
        }}
        onSuccess={(result) => {
          setStatus(`Guest session started — user: ${result.userId}`);
        }}
        onError={(err) => {
          setStatus(`Error (${err.code}): ${err.message}`);
        }}
      />
      {status ? <p className="text-pretty mt-4 text-xs text-muted-foreground">{status}</p> : null}
    </Demo>
  );
}
