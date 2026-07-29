import type { Metadata } from 'next';

import { SourceBlockDocsPage } from '@/components/source-block-showcase/source-block-docs-page';
import { OG_IMAGE, withBase } from '@/lib/site';
import { getSourceBlock } from '@/lib/source-blocks';

const block = getSourceBlock('schema-builder')!;

export default function SchemaBuilderPage() {
  return <SourceBlockDocsPage block={block} />;
}

export const metadata: Metadata = {
  title: block.title,
  description: block.description,
  alternates: { canonical: withBase('/blocks/schema-builder') },
  openGraph: {
    title: block.title,
    description: block.description,
    url: withBase('/blocks/schema-builder'),
    images: [OG_IMAGE],
  },
};
