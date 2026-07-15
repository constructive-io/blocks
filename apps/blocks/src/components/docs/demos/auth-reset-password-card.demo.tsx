'use client';

import { useState } from 'react';

import { ResetPasswordCard } from '@/blocks/auth/reset-password-card/reset-password-card';

import { Demo, Segmented, type Outcome } from '../showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <ResetPasswordCard
        roleId="role_demo"
        token="tok_demo"
        signInPath="#"
        // true → success panel; false → expired/invalid-token path.
        onSubmit={async () => outcome === 'success'}
      />
    </Demo>
  );
}
