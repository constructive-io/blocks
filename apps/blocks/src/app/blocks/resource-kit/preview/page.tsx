import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function ResourceKitPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Resource Kit live preview</h1>
      <ApplicationBlockShowcaseCanvas name="resource-kit" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/resource-kit') },
  robots: { follow: false, index: false },
};
