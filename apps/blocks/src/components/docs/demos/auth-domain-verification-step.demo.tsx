'use client';

import { AuthDomainVerificationStep } from '@/blocks/auth/domain-verification-step/domain-verification-step';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <AuthDomainVerificationStep
        className="max-w-2xl"
        ssoProviderId="sso_demo_acme_corp"
        domain="acme.com"
      />
    </Demo>
  );
}
