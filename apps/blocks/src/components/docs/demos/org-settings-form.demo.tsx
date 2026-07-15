'use client';

/**
 * org-settings-form demo — docs-only live preview.
 *
 * useUserQuery(orgId) resolves against the docs mock adapter's `user` handler
 * (seeded with a demo org), so the name + slug fields render populated. Save and
 * delete run through the onSubmit / onDeleteSubmit seams (no backend); delete is
 * step-up gated, so the form is wrapped in StepUpProvider.
 */

import { useState } from 'react';

import { OrgSettingsForm } from '@/blocks/org/settings-form/settings-form';
import type { OrgSettingsInput, OrgSettingsResult } from '@/blocks/org/settings-form/settings-form';
import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

const DEMO_ORG_ID = 'org_demo_00000001';

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  async function onSubmit(input: OrgSettingsInput): Promise<OrgSettingsResult> {
    if (outcome === 'error') {
      throw Object.assign(new Error('That slug is already taken.'), {
        graphQLErrors: [{ extensions: { code: 'USERNAME_TAKEN' } }],
      });
    }
    return { id: DEMO_ORG_ID, displayName: input.displayName, username: input.username, profilePicture: null };
  }

  async function onDeleteSubmit(_orgId: string): Promise<void> {
    if (outcome === 'error') {
      throw Object.assign(new Error('Organization not found.'), {
        graphQLErrors: [{ extensions: { code: 'ORG_NOT_FOUND' } }],
      });
    }
  }

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <StepUpProvider>
        <OrgSettingsForm
          className="max-w-2xl"
          orgId={DEMO_ORG_ID}
          onSubmit={onSubmit}
          onDeleteSubmit={onDeleteSubmit}
          onSaveSuccess={() => {}}
          onDeleteSuccess={() => {}}
        />
      </StepUpProvider>
    </Demo>
  );
}
