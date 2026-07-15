'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { InviteDialog } from '@/blocks/org/invite-dialog/invite-dialog';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <Button variant="outline" onClick={() => setOpen(true)}>
        Invite member
      </Button>
      {lastResult ? (
        <p className="mt-4 text-sm text-muted-foreground">{lastResult}</p>
      ) : null}
      <InviteDialog
        orgId="org_demo_01"
        open={open}
        onOpenChange={setOpen}
        roleProfiles={[
          { id: 'profile_admin', label: 'Admin' },
          { id: 'profile_editor', label: 'Editor' },
          { id: 'profile_viewer', label: 'Viewer' },
        ]}
        onSubmit={async (input) => {
          if (outcome === 'error') {
            throw Object.assign(new Error('PERMISSION_DENIED'), {
              errors: [{ extensions: { code: 'PERMISSION_DENIED' } }],
            });
          }
          return {
            inviteId: 'invite_demo_01',
            email: input.email,
            profileId: input.profileId,
          };
        }}
        onInviteSent={(result) => {
          setOpen(false);
          setLastResult(`Invitation sent to ${result.email}`);
        }}
        onError={(err) => {
          setLastResult(`Error: ${err.message}`);
        }}
      />
    </Demo>
  );
}
