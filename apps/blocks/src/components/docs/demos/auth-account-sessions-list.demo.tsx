'use client';

import { useState } from 'react';

import { AccountSessionsList, type SessionRow } from '@/blocks/auth/account-sessions-list/account-sessions-list';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_SESSIONS: SessionRow[] = [
  {
    id: 'sess_current_001',
    isCurrent: true,
    authMethod: 'password',
    userAgent: null,
    parsedDevice: { browser: 'Chrome', os: 'macOS', deviceType: 'desktop' },
    ip: '192.168.1.42',
    origin: 'https://app.example.com',
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 min ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28).toISOString(),
  },
  {
    id: 'sess_mobile_002',
    isCurrent: false,
    authMethod: 'magic_link',
    userAgent: null,
    parsedDevice: { browser: 'Safari', os: 'iOS', deviceType: 'mobile' },
    ip: '10.0.0.88',
    origin: 'https://app.example.com',
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hr ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
  },
  {
    id: 'sess_unknown_003',
    isCurrent: false,
    authMethod: 'password',
    userAgent: null,
    parsedDevice: { browser: 'Firefox', os: 'Windows', deviceType: 'desktop' },
    ip: null,
    origin: null,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18).toISOString(),
  },
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [sessions, setSessions] = useState<SessionRow[]>(MOCK_SESSIONS);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <AccountSessionsList
        className="max-w-2xl"
        sessions={sessions}
        onRevokeSubmit={async ({ sessionId }) => {
          if (outcome === 'error') throw new Error('Revoke failed (demo)');
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          return { result: true };
        }}
        onAllOtherSessionsRevoked={() => {
          setSessions((prev) => prev.filter((s) => s.isCurrent));
        }}
      />
    </Demo>
  );
}
