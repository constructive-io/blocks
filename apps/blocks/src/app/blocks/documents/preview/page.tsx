import type { Metadata } from 'next';

import { DocumentFormDemo } from '@/components/documents-showcase/document-form-demo';
import { withBase } from '@/lib/site';

export default function DocumentsPreviewPage() {
  return (
    <div className="min-h-dvh bg-background p-3 sm:p-5">
      <h1 className="sr-only">JSON documents live preview</h1>
      <DocumentFormDemo />
    </div>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/documents') },
  robots: { follow: false, index: false },
};
