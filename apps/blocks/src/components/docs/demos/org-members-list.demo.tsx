'use client';

import { useState } from 'react';

import { MembersList, type OrgMember } from '@/blocks/org/members-list/members-list';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_MEMBERS: OrgMember[] = [
  {
    membershipId: 'mem_owner_001',
    userId: 'usr_001',
    displayName: 'Ada Lovelace',
    username: 'ada',
    profilePicture: null,
    isOwner: true,
    isAdmin: false,
    isApproved: true,
    profileId: null,
    roleLabel: 'Owner',
  },
  {
    membershipId: 'mem_admin_002',
    userId: 'usr_002',
    displayName: 'Grace Hopper',
    username: 'grace',
    profilePicture: null,
    isOwner: false,
    isAdmin: true,
    isApproved: true,
    profileId: null,
    roleLabel: 'Admin',
  },
  {
    membershipId: 'mem_member_003',
    userId: 'usr_003',
    displayName: 'Margaret Hamilton',
    username: 'margaret',
    profilePicture: null,
    isOwner: false,
    isAdmin: false,
    isApproved: true,
    profileId: null,
    roleLabel: 'Member',
  },
  {
    membershipId: 'mem_pending_004',
    userId: 'usr_004',
    displayName: 'Katherine Johnson',
    username: null,
    profilePicture: null,
    isOwner: false,
    isAdmin: false,
    isApproved: false,
    profileId: null,
    roleLabel: 'Member',
  },
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [members, setMembers] = useState<OrgMember[]>(MOCK_MEMBERS);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <MembersList
        className="max-w-2xl"
        orgId="org_demo_001"
        viewerIsOwner={true}
        viewerIsAdmin={false}
        adapter={() => ({ members, isLoading: false, error: null })}
        onRemoveMember={async (membershipId) => {
          if (outcome === 'error') throw new Error('Remove failed (demo)');
          setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId));
        }}
        onRoleChange={async (membershipId, profileId) => {
          if (outcome === 'error') throw new Error('Role change failed (demo)');
          setMembers((prev) =>
            prev.map((m) =>
              m.membershipId === membershipId ? { ...m, profileId: profileId ?? null } : m
            )
          );
        }}
        onTransferOwnership={async (membershipId) => {
          if (outcome === 'error') throw new Error('Transfer failed (demo)');
          setMembers((prev) =>
            prev.map((m) => ({
              ...m,
              isOwner: m.membershipId === membershipId,
              isAdmin: m.membershipId !== membershipId && m.isAdmin,
              roleLabel:
                m.membershipId === membershipId
                  ? 'Owner'
                  : m.membershipId === 'mem_owner_001'
                  ? 'Admin'
                  : m.roleLabel,
            }))
          );
        }}
      />
    </Demo>
  );
}
