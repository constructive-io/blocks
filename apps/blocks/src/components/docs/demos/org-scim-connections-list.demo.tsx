'use client';

import { OrgScimConnectionsList } from '@/blocks/org/scim-connections-list/scim-connections-list';
import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <OrgScimConnectionsList
        className="max-w-2xl"
        orgId="org_demo_acme"
        scimBaseUrl="https://api.acme.example.com"
      />
    </Demo>
  );
}
