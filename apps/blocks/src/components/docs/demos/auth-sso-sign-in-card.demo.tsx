'use client';

import { useState } from 'react';

import { AuthSsoSignInCard } from '@/blocks/auth/sso-sign-in-card/sso-sign-in-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <AuthSsoSignInCard
        defaultEmail="ada@acme.com"
        signInHref="#"
        onDomainSubmit={async (_email) => {
          if (outcome === 'error') {
            throw { extensions: { code: 'SSO_NOT_CONFIGURED' } };
          }
          return { ssoProviderId: 'sso_acme_demo', orgName: 'Acme Corp' };
        }}
        onSsoDetected={() => {}}
      />
    </Demo>
  );
}
