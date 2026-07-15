'use client';

import { useState } from 'react';

import { PasskeySignIn } from '@/blocks/auth/passkey-sign-in/passkey-sign-in';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [variant, setVariant] = useState<'button' | 'icon'>('button');

  return (
    <Demo>
      <div className="mb-5 flex flex-wrap gap-2 justify-center">
        <Segmented
          label="Outcome"
          value={outcome}
          options={['success', 'error'] as const}
          onChange={setOutcome}
        />
        <Segmented
          label="Variant"
          value={variant}
          options={['button', 'icon'] as const}
          onChange={setVariant}
        />
      </div>
      <PasskeySignIn
        variant={variant}
        onSubmit={async () => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Passkey sign-in failed'), {
              graphQLErrors: [{ extensions: { code: 'CHALLENGE_FAILED' } }],
            });
          }
          return {
            session: {
              id: 'ses_demo_abc123',
              accessToken: 'demo.jwt.token',
              expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            },
            user: { id: 'usr_demo_abc123' },
          };
        }}
      />
    </Demo>
  );
}
