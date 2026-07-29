import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function OrgChartPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Org Chart live preview</h1>
      <ApplicationBlockShowcaseCanvas name="org-chart" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/org-chart') },
  robots: { follow: false, index: false },
};
