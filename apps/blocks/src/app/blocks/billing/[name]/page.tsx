import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BillingBlockDocsPage } from '@/components/billing-showcase/billing-block-docs-page';
import { BILLING_BLOCKS, getBillingBlock } from '@/lib/billing-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

export default async function BillingBlockPage({ params }: PageProps) {
  const { name } = await params;
  const block = getBillingBlock(name);
  if (!block) return notFound();

  const index = BILLING_BLOCKS.findIndex((item) => item.name === block.name);
  const previous = index > 0 ? BILLING_BLOCKS[index - 1] : undefined;
  const next =
    index < BILLING_BLOCKS.length - 1 ? BILLING_BLOCKS[index + 1] : undefined;

  return (
    <BillingBlockDocsPage block={block} previous={previous} next={next} />
  );
}

export function generateStaticParams() {
  return BILLING_BLOCKS.map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const block = getBillingBlock(name);
  if (!block) return {};

  const url = withBase(`/blocks/billing/${block.name}`);
  return {
    title: block.title,
    description: block.description,
    alternates: { canonical: url },
    openGraph: {
      title: block.title,
      description: block.description,
      url,
      images: [OG_IMAGE]
    }
  };
}
