import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function BillingConsolePreviewPage() {
  return (
    <>
      <h1 className="sr-only">Billing Console live preview</h1>
      <ApplicationBlockShowcaseCanvas name="billing-console" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/billing/console') },
  robots: { follow: false, index: false },
};
