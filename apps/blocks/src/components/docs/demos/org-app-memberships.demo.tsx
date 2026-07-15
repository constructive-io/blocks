'use client';

import { useState } from 'react';

import { OrgAppMemberships, type UpdateAppMembershipVars, type DeleteAppMembershipVars, type OrgAppMembership } from '@/blocks/org/app-memberships/app-memberships';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_ORG_ID = 'org_demo_001';

const MOCK_PROFILES = [
  { id: 'prof_viewer', label: 'Viewer' },
  { id: 'prof_editor', label: 'Editor' },
  { id: 'prof_admin', label: 'Admin' },
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <OrgAppMemberships
        className="max-w-3xl"
        orgId={MOCK_ORG_ID}
        membershipProfiles={MOCK_PROFILES}
        onSubmit={async (vars: UpdateAppMembershipVars): Promise<OrgAppMembership | null> => {
          if (outcome === 'error') throw new Error('Update failed (demo)');
          return {
            id: vars.id,
            actorId: MOCK_ORG_ID,
            isApproved: vars.appMembershipPatch.isApproved ?? true,
            isVerified: true,
            profileId: vars.appMembershipPatch.profileId ?? null,
            createdAt: '2026-01-15T10:00:00.000Z',
          };
        }}
        onRevoke={async (vars: DeleteAppMembershipVars): Promise<OrgAppMembership | null> => {
          if (outcome === 'error') throw new Error('Revoke failed (demo)');
          return {
            id: vars.id,
            actorId: MOCK_ORG_ID,
            isApproved: true,
            isVerified: true,
            profileId: null,
            createdAt: '2026-01-15T10:00:00.000Z',
          };
        }}
      />
    </Demo>
  );
}
