import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FeaturePackDocsPage } from '@/components/feature-pack-showcase/feature-pack-docs-page';
import { FEATURE_PACK_DOCS, getFeaturePackDoc } from '@/lib/feature-packs';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ pack: string }> };

export default async function FeaturePackPage({ params }: PageProps) {
  const { pack: packId } = await params;
  const block = getFeaturePackDoc(packId);
  if (!block) return notFound();

  const index = FEATURE_PACK_DOCS.findIndex((item) => item.id === block.id);
  const previous = index > 0 ? FEATURE_PACK_DOCS[index - 1] : undefined;
  const next = index < FEATURE_PACK_DOCS.length - 1 ? FEATURE_PACK_DOCS[index + 1] : undefined;

  return <FeaturePackDocsPage block={block} next={next} previous={previous} />;
}

export function generateStaticParams() {
  return FEATURE_PACK_DOCS.map(({ id: pack }) => ({ pack }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pack: packId } = await params;
  const block = getFeaturePackDoc(packId);
  if (!block) return {};

  const title = `${block.title} feature pack`;
  const url = withBase(`/blocks/features/${block.id}`);
  return {
    title,
    description: block.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: block.description,
      url,
      images: [OG_IMAGE],
    },
  };
}
