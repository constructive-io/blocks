import type { Metadata } from 'next';

import { ApplicationBlockShowcaseCanvas } from '@/components/application-block-showcase/application-block-showcase-canvas';
import { withBase } from '@/lib/site';

export default function AuthPagesPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Auth Pages live preview</h1>
      <ApplicationBlockShowcaseCanvas name="auth-pages" />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: withBase('/blocks/auth-pages') },
  robots: { follow: false, index: false },
};
