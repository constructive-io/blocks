'use client';

import { useState } from 'react';

import { PasskeyManagementList, type PasskeyManagementListProps } from '@/blocks/auth/passkey-management-list/passkey-management-list';
import { type WebAuthnCredential } from '@/blocks/auth/passkey-management-list/hooks/use-passkey-management';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_CREDENTIALS: WebAuthnCredential[] = [
  {
    id: 'cred_01_face',
    name: 'iPhone Face ID',
    transports: ['internal'],
    credentialDeviceType: 'platform',
    backupEligible: true,
    backupState: true,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 min ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'cred_02_usb',
    name: 'YubiKey 5',
    transports: ['usb', 'nfc'],
    credentialDeviceType: 'cross-platform',
    backupEligible: false,
    backupState: false,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'cred_03_touch',
    name: 'MacBook Touch ID',
    transports: ['internal'],
    credentialDeviceType: 'platform',
    backupEligible: false,
    backupState: false,
    lastUsedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>(MOCK_CREDENTIALS);

  const onRename: PasskeyManagementListProps['onRename'] = async ({ credentialId, name }) => {
    if (outcome === 'error') {
      throw Object.assign(new Error('Rename failed'), {
        graphQLErrors: [{ extensions: { code: 'RENAME_FAILED' } }],
      });
    }
    setCredentials((prev) =>
      prev.map((c) => (c.id === credentialId ? { ...c, name } : c))
    );
  };

  const onDelete: PasskeyManagementListProps['onDelete'] = async ({ credentialId }) => {
    if (outcome === 'error') {
      throw Object.assign(new Error('Delete failed'), {
        graphQLErrors: [{ extensions: { code: 'DELETE_FAILED' } }],
      });
    }
    setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
  };

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <PasskeyManagementList
        className="max-w-2xl"
        queryCredentials={async () => credentials}
        onRename={onRename}
        onDelete={onDelete}
      />
    </Demo>
  );
}
