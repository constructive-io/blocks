'use client';

import { useState } from 'react';

import { AccountConnectedAccounts } from '@/blocks/auth/account-connected-accounts/account-connected-accounts';
import type { ConnectedAccountRow, IdentityProvider } from '@/blocks/auth/account-connected-accounts/account-connected-accounts';
import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_PROVIDERS: IdentityProvider[] = [
  { id: 'p-google', slug: 'google', displayName: 'Google', kind: 'oidc', enabled: true },
  { id: 'p-github', slug: 'github', displayName: 'GitHub', kind: 'oauth2', enabled: true },
  { id: 'p-microsoft', slug: 'microsoft', displayName: 'Microsoft', kind: 'oidc', enabled: true },
];

const MOCK_CONNECTED: ConnectedAccountRow[] = [
  {
    id: 'acc-1',
    service: 'google',
    identifier: 'ada@example.com',
    isVerified: true,
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'acc-2',
    service: 'github',
    identifier: 'ada-lovelace',
    isVerified: false,
    createdAt: '2024-03-20T14:30:00Z',
  },
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [connected, setConnected] = useState<ConnectedAccountRow[]>(MOCK_CONNECTED);

  return (
    <Demo>
      <Segmented
        label="Disconnect outcome"
        value={outcome}
        options={['success', 'error'] as const}
        onChange={setOutcome}
      />
      <StepUpProvider>
        <AccountConnectedAccounts
          className="max-w-2xl"
          connectedAccounts={connected}
          providers={MOCK_PROVIDERS}
          oauthRedirectBase="#"
          onSubmitDisconnect={async (vars) => {
            if (outcome === 'error') {
              throw Object.assign(new Error('Disconnect failed'), {
                extensions: { code: 'LAST_AUTH_METHOD' },
              });
            }
            setConnected((prev) => prev.filter((a) => a.id !== vars.accountId));
            return { success: true };
          }}
        />
      </StepUpProvider>
    </Demo>
  );
}
