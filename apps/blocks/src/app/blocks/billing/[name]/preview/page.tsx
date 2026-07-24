import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BillingShowcaseEmbed } from '@/components/billing-showcase/billing-showcase-embed';
import { BILLING_BLOCKS, getBillingBlock } from '@/lib/billing-blocks';
import { withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

export default async function BillingBlockPreviewPage({ params }: PageProps) {
  const { name } = await params;
  const block = getBillingBlock(name);
  if (!block) return notFound();

  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading live preview…"
          className="min-h-dvh bg-background"
          role="status"
        />
      }
    >
      <BillingShowcaseEmbed name={block.name} />
    </Suspense>
  );
}

export function generateStaticParams() {
  return BILLING_BLOCKS.map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const block = getBillingBlock(name);

  return {
    alternates: block
      ? { canonical: withBase(`/blocks/billing/${block.name}`) }
      : undefined,
    robots: { follow: false, index: false }
  };
}
