import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function DataRoomsPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Data Rooms live preview</h1>
      <ApplicationBlockShowcaseCanvas name="data-rooms" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/data-rooms') },
  robots: { follow: false, index: false },
};
