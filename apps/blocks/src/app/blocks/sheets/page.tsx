import type { Metadata } from 'next';

import { SourceBlockDocsPage } from '@/components/source-block-showcase/source-block-docs-page';
import { OG_IMAGE, withBase } from '@/lib/site';
import { getSourceBlock } from '@/lib/source-blocks';

const block = getSourceBlock('sheets')!;

export default function SheetsPage() {
  return <SourceBlockDocsPage block={block} />;
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/sheets') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/sheets'),
    images: [OG_IMAGE],
  },
};
