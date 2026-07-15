'use client';

/**
 * auth-invitation-acceptance-page demo — docs-only live preview.
 *
 * The page is a thin wrapper: it gates on the current-user query, reads
 * ?token=/?kind= from the URL, composes InvitationAcceptanceCard inside a
 * centered full-viewport layout, then routes on accept/decline. The auth gate +
 * routing are Next.js-only and would redirect inside the docs harness, so this
 * preview renders the composed card directly — the same UI the page shows once
 * the gate passes — driven by the card's onSubmit seam (no backend, no nav).
 */

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
      {/* The page composes this card in a centered layout behind an auth gate. */}
      <div className="flex w-full justify-center">
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
              org: k === 'org' && org ? { id: org.id, displayName: org.displayName } : undefined,
            };
          }}
        />
      </div>
    </Demo>
  );
}
