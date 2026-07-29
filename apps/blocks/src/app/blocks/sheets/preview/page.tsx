import type { Metadata } from 'next';

import { SourceBlockShowcaseCanvas } from '@/components/source-block-showcase/source-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function SheetsPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Sheets live preview</h1>
      <SourceBlockShowcaseCanvas name="sheets" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/sheets') },
  robots: { follow: false, index: false },
};
