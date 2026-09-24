import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function AgentsBuilderPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Agents Builder live preview</h1>
      <ApplicationBlockShowcaseCanvas name="agents-builder" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/agents-builder') },
  robots: { follow: false, index: false },
};
