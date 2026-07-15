'use client';

import { useState } from 'react';

import { MfaTotpChallenge, type MfaChallengeResult } from '@/blocks/auth/mfa-totp-challenge/mfa-totp-challenge';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <MfaTotpChallenge
        challengeToken="mfa_challenge_demo_tok_abc123"
        onSubmit={async (): Promise<MfaChallengeResult> => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Invalid TOTP code'), {
              graphQLErrors: [{ extensions: { code: 'INVALID_TOTP' } }],
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
