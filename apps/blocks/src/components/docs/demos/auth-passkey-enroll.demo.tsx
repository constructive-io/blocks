'use client';

import { useState } from 'react';

import { PasskeyEnroll } from '@/blocks/auth/passkey-enroll/passkey-enroll';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <PasskeyEnroll
        userId="usr_demo"
        enabled={true}
        onSubmit={async (input) => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Registration failed'), {
              graphQLErrors: [{ extensions: { code: 'UNKNOWN_ERROR' } }],
            });
          }
          return {
            credentialId: 'cred_demo_abc123',
            credentialName: input.credentialName,
          };
        }}
      />
    </Demo>
  );
}
