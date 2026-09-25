import type { Metadata } from 'next';

import { ApplicationBlockDocsPage } from '@/components/application-block-showcase/application-block-docs-page';
import { getApplicationBlock } from '@/lib/application-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

const block = getApplicationBlock('billing-account')!;

export default function BillingAccountPage() {
  return <ApplicationBlockDocsPage block={block} />;
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/billing/account') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/billing/account'),
    images: [OG_IMAGE],
  },
};
