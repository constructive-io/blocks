import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function DashboardTilesPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Dashboard Tiles live preview</h1>
      <ApplicationBlockShowcaseCanvas name="dashboard-tiles" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/dashboard-tiles') },
  robots: { follow: false, index: false },
};
