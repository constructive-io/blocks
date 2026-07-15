'use client';

import { useState } from 'react';

import { ChangePasswordForm } from '@/blocks/auth/change-password-form/change-password-form';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <ChangePasswordForm
        className="max-w-md"
        requireStepUp={false}
        onSubmit={async () => {
          if (outcome === 'error') {
            // Simulate wrong current password — block maps false → INVALID_CREDENTIALS
            return false;
          }
          // true → block calls onSuccess and fires the success message
          return true;
        }}
      />
    </Demo>
  );
}
