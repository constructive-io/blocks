import type { Metadata } from 'next';

import { SourceBlockShowcaseCanvas } from '@/components/source-block-showcase/source-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function SchemaBuilderPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Schema Builder live preview</h1>
      <SourceBlockShowcaseCanvas name="schema-builder" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/schema-builder') },
  robots: { follow: false, index: false },
};
