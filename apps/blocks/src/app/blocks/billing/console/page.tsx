import type { Metadata } from 'next';

import { ApplicationBlockDocsPage } from '@/components/application-block-showcase/application-block-docs-page';
import { getApplicationBlock } from '@/lib/application-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

const block = getApplicationBlock('billing-console')!;

export default function BillingConsolePage() {
  return <ApplicationBlockDocsPage block={block} />;
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/billing/console') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/billing/console'),
    images: [OG_IMAGE],
  },
};
