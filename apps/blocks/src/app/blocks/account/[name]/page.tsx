import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AccountBlockDocsPage } from '@/components/account-showcase/account-block-docs-page';
import { ACCOUNT_BLOCKS, getAccountBlock } from '@/lib/account-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

export default async function AccountBlockPage({ params }: PageProps) {
  const { name } = await params;
  const block = getAccountBlock(name);
  if (!block) return notFound();
  return <AccountBlockDocsPage block={block} />;
}

export function generateStaticParams() {
  return ACCOUNT_BLOCKS.map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const block = getAccountBlock(name);
  if (!block) return {};

  const url = withBase(`/blocks/account/${block.name}`);
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
