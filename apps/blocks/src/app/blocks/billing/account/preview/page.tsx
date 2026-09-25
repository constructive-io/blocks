import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function BillingAccountPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Billing Account live preview</h1>
      <ApplicationBlockShowcaseCanvas name="billing-account" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/billing/account') },
  robots: { follow: false, index: false },
};
