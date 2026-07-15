'use client';

import { useState } from 'react';

import { InvitationAcceptanceCard } from '@/blocks/auth/invitation-acceptance-card/invitation-acceptance-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

type Kind = 'app' | 'org';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [kind, setKind] = useState<Kind>('org');

  const org =
    kind === 'org'
      ? { id: 'org_1', type: 'organization' as const, displayName: 'Acme Corp', username: 'acme', profilePicture: null }
      : null;

  const inviter =
    kind === 'org'
      ? { id: 'usr_1', type: 'person' as const, displayName: 'Ada Lovelace', username: 'ada', profilePicture: null }
      : null;

  return (
    <Demo>
      <div className="mb-5 flex flex-wrap gap-2">
        <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
        <Segmented label="Kind" value={kind} options={['app', 'org'] as const} onChange={setKind} />
      </div>
      <InvitationAcceptanceCard
        token="tok_demo_invite_abc123"
        kind={kind}
        inviter={inviter}
        org={org}
        role={kind === 'org' ? 'Member' : null}
        onSubmit={async ({ token: _token, kind: k }) => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Invite not found'), {
              graphQLErrors: [{ extensions: { code: 'INVITE_NOT_FOUND' } }],
            });
          }
          return {
            kind: k,
            org:
              k === 'org' && org
                ? { id: org.id, displayName: org.displayName }
                : undefined,
          };
        }}
      />
    </Demo>
  );
}
