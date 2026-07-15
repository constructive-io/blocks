'use client';

/**
 * org-create-card demo — docs-only live preview.
 *
 * Strategy: mutation block driven via the onSubmit seam.
 * The block owns multi-step state, validation, and slug availability UI;
 * only the final "Create organization" action is intercepted here.
 *
 * Success: resolves to an OrgCreateResult with a mock org User.
 * Error:   throws so the block surfaces an error alert in step 3.
 *
 * showLogoStep=false keeps the wizard to two steps for a compact preview.
 */

import { useState } from 'react';

import { OrgCreateCard } from '@/blocks/org/create-card/create-card';
import type { OrgCreateInput, OrgCreateResult } from '@/blocks/org/create-card/create-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  async function onSubmit(input: OrgCreateInput): Promise<OrgCreateResult> {
    if (outcome === 'error') {
      throw new Error('You don\'t have permission to create organizations.');
    }
    return {
      org: {
        id: 'usr_org_demo_00001',
        type: 'organization',
        displayName: input.displayName,
        username: input.username,
        profilePicture: null,
      },
    };
  }

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <OrgCreateCard
        defaultName="Acme Corp"
        showLogoStep={false}
        onSubmit={onSubmit}
      />
    </Demo>
  );
}
