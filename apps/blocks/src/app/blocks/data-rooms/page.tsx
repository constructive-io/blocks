import type { Metadata } from 'next';

import { ApplicationBlockDocsPage } from '@/components/application-block-showcase/application-block-docs-page';
import { getApplicationBlock } from '@/lib/application-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

const block = getApplicationBlock('data-rooms')!;

export default function DataRoomsPage() {
  return <ApplicationBlockDocsPage block={block} />;
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/data-rooms') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/data-rooms'),
    images: [OG_IMAGE],
  },
};
