'use client';

import { useState } from 'react';

import { AccountSecurityCard } from '@/blocks/auth/account-security-card/account-security-card';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

type PasskeyState = 'none' | 'one' | 'three';

export function BlockDemo() {
  const [passkeyState, setPasskeyState] = useState<PasskeyState>('one');

  const passkeyCount = passkeyState === 'none' ? 0 : passkeyState === 'one' ? 1 : 3;

  const adapter = { webauthnCredentials: { totalCount: passkeyCount } };

  return (
    <Demo>
      <Segmented
        label="Passkeys"
        value={passkeyState}
        options={['none', 'one', 'three'] as const}
        onChange={setPasskeyState}
      />
      <AccountSecurityCard
        adapter={adapter}
        onChangePassword={() => {}}
        onManageMfa={() => {}}
        onManagePasskeys={() => {}}
      />
    </Demo>
  );
}
