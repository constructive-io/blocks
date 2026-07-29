import type { Metadata } from 'next';

import { ApplicationBlockDocsPage } from '@/components/application-block-showcase/application-block-docs-page';
import {
  APPLICATION_BLOCKS,
  getApplicationBlock,
} from '@/lib/application-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

const block = getApplicationBlock('org-chart')!;

export default function OrgChartPage() {
  return (
    <ApplicationBlockDocsPage
      block={block}
      next={APPLICATION_BLOCKS[1]}
    />
  );
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/org-chart') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/org-chart'),
    images: [OG_IMAGE],
  },
};
