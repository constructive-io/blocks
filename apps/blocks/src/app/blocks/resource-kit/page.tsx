import type { Metadata } from 'next';

import { ApplicationBlockDocsPage } from '@/components/application-block-showcase/application-block-docs-page';
import { getApplicationBlock } from '@/lib/application-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

const block = getApplicationBlock('resource-kit')!;

export default function ResourceKitPage() {
  return <ApplicationBlockDocsPage block={block} />;
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/resource-kit') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/resource-kit'),
    images: [OG_IMAGE],
  },
};
