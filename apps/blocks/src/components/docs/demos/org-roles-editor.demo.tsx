'use client';

import { useState } from 'react';

import { OrgRolesEditor, type OrgProfileResult } from '@/blocks/org/roles-editor/roles-editor';

import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <OrgRolesEditor
        className="max-w-2xl"
        orgId="org_demo_001"
        onSubmit={async (vars): Promise<OrgProfileResult | null> => {
          if (outcome === 'error') throw new Error('Permission denied (demo)');
          return {
            id: vars.id ?? `role_${Date.now()}`,
            name: vars.name,
            slug: vars.slug,
            description: vars.description ?? null,
            entityId: vars.entityId,
            isSystem: false,
            isDefault: false,
          };
        }}
        onDelete={async (_id) => {
          if (outcome === 'error') throw new Error('Role in use (demo)');
        }}
      />
    </Demo>
  );
}
