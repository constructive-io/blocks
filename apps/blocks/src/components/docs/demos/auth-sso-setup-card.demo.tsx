'use client';

import { SsoSetupCard } from '@/blocks/auth/sso-setup-card/sso-setup-card';
import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <SsoSetupCard orgId="org_demo" />
    </Demo>
  );
}
