'use client';

import { useState } from 'react';

import { EmailOtpRequestCard } from '@/blocks/auth/email-otp-request-card/email-otp-request-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <EmailOtpRequestCard
        otpType="sign_in"
        signInHref="#"
        showOtpInputInline={false}
        onSubmit={async () => {
          if (outcome === 'error') throw new Error('RATE_LIMITED');
          // success: resolves void → block transitions to code-sent state
        }}
      />
    </Demo>
  );
}
