'use client';

import { useState } from 'react';

import { UserContextSwitcher } from '@/blocks/user/context-switcher/context-switcher';
import type { UserContextMembership } from '@/blocks/user/context-switcher/context-switcher';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const MOCK_CURRENT_USER: UserContextMembership['user'] = {
  id: 'usr_ada_001',
  type: 'person',
  displayName: 'Ada Lovelace',
  username: 'ada',
  profilePicture: null,
};

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [activeContextId, setActiveContextId] = useState<string>(MOCK_CURRENT_USER.id);

  return (
    <Demo>
      <Segmented
        label="Switch outcome"
        value={outcome}
        options={['success', 'error'] as const}
        onChange={setOutcome}
      />
      <UserContextSwitcher
        currentUser={MOCK_CURRENT_USER}
        activeContextId={activeContextId}
        onSwitchSubmit={async (_orgId) => {
          if (outcome === 'error') throw new Error('Context switch failed (demo)');
        }}
        onContextSwitch={(user) => {
          setActiveContextId(user.id);
        }}
        showCreateOrgLink
        onCreateOrgClick={() => {/* demo: no-op */}}
      />
    </Demo>
  );
}
