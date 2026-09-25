import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function StorageBrowserPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Storage Browser live preview</h1>
      <ApplicationBlockShowcaseCanvas name="storage-browser" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/storage-browser') },
  robots: { follow: false, index: false },
};
