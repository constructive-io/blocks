import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { FeaturePackShowcaseEmbed } from '@/components/feature-pack-showcase/feature-pack-showcase-embed';
import { FEATURE_PACK_DOCS, getFeaturePackDoc } from '@/lib/feature-packs';
import { withBase } from '@/lib/site';

type PageProps = { params: Promise<{ pack: string }> };

export default async function FeaturePackPreviewPage({ params }: PageProps) {
  const { pack: packId } = await params;
  const block = getFeaturePackDoc(packId);
  if (!block) return notFound();

  return (
    <Suspense fallback={<div aria-label="Loading live preview…" className="min-h-dvh bg-background" role="status" />}>
      <FeaturePackShowcaseEmbed pack={block.id} />
    </Suspense>
  );
}

export function generateStaticParams() {
  return FEATURE_PACK_DOCS.map(({ id: pack }) => ({ pack }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pack: packId } = await params;
  const block = getFeaturePackDoc(packId);

  return {
    alternates: block ? { canonical: withBase(`/blocks/features/${block.id}`) } : undefined,
    robots: { follow: false, index: false },
  };
}
