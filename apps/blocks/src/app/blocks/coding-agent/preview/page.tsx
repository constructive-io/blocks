import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function CodingAgentPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Coding Agent live preview</h1>
      {/* The preview reads its example from the query string, which only exists in the browser. */}
      <Suspense fallback={<div className="h-dvh bg-background" />}>
        <ApplicationBlockShowcaseCanvas name="coding-agent" />
      </Suspense>
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/coding-agent') },
  robots: { follow: false, index: false },
};
