import type { Metadata } from 'next';

import { ThemePreviewDocument } from '@/components/theme-playground/preview-document';
import { withBase } from '@/lib/site';

export default function CreatePreviewPage() {
  return (
    <>
      <h1 className="sr-only">Theme playground live preview</h1>
      <ThemePreviewDocument />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/create') },
  robots: { follow: false, index: false },
};
