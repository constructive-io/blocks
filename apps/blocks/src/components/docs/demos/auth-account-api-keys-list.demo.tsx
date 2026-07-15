'use client';

import { useState } from 'react';

import { AccountApiKeysList, type ApiKeyRow } from '@/blocks/auth/account-api-keys-list/account-api-keys-list';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_KEYS: ApiKeyRow[] = [
  {
    id: 'key_01j9abc',
    name: 'CI / CD pipeline',
    keyPrefix: 'cnc_live_a3fk',
    accessLevel: 'read:write',
    mfaLevel: 'none',
    lastUsedAt: '2026-05-28T10:00:00.000Z',
    expiresAt: null,
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'key_02j9def',
    name: 'Local dev',
    keyPrefix: 'cnc_live_b7qx',
    accessLevel: 'read:write',
    mfaLevel: 'none',
    lastUsedAt: '2026-05-27T14:30:00.000Z',
    expiresAt: '2025-12-31T23:59:59.000Z',
    createdAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'key_03j9ghi',
    name: 'Analytics read-only',
    keyPrefix: 'cnc_live_c2mz',
    accessLevel: 'read',
    mfaLevel: 'none',
    lastUsedAt: null,
    expiresAt: '2027-01-01T00:00:00.000Z',
    createdAt: '2026-03-10T12:00:00.000Z',
  },
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [keys, setKeys] = useState<ApiKeyRow[]>(MOCK_KEYS);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <AccountApiKeysList
        className="max-w-2xl"
        keys={keys}
        maxKeys={10}
        onRevokeSubmit={async ({ keyId }) => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Revocation failed'), {
              graphQLErrors: [{ extensions: { code: 'UNKNOWN_ERROR' } }],
            });
          }
          setKeys((prev) => prev.filter((k) => k.id !== keyId));
          return { result: true };
        }}
      />
    </Demo>
  );
}
