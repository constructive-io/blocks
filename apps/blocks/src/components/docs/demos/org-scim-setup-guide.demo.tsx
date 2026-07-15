'use client';

import { OrgScimSetupGuide } from '@/blocks/org/scim-setup-guide/scim-setup-guide';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <OrgScimSetupGuide
        className="max-w-2xl"
        orgId="org_demo"
        provider="okta"
        scimBaseUrl="https://auth.example.com"
      />
    </Demo>
  );
}
