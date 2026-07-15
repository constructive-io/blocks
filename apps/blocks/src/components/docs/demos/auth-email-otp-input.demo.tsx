'use client';

import { useState } from 'react';

import { EmailOtpInput, type EmailOtpVerifyResult } from '@/blocks/auth/email-otp-input/email-otp-input';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <EmailOtpInput
        email="user@example.com"
        onVerify={async (_email: string, _code: string): Promise<EmailOtpVerifyResult> => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Invalid OTP'), {
              graphQLErrors: [{ extensions: { code: 'INVALID_OTP' } }],
            });
          }
          return {
            id: 'ses_demo_abc123',
            userId: 'usr_demo_abc123',
            accessToken: 'demo.jwt.token',
            accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
            isVerified: true,
            mfaRequired: false,
            mfaChallengeToken: null,
          };
        }}
        onResend={async (_email: string): Promise<void> => {
          if (outcome === 'error') throw new Error('RATE_LIMITED');
          // success: resolves void → block shows resend-success message
        }}
      />
    </Demo>
  );
}
