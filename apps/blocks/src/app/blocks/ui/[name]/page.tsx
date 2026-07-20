import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PrimitiveDocsPage } from '@/components/docs/primitive-docs-page';
import { getPrimitiveDocs } from '@/content/ui';
import { BASE_PRIMITIVES, getBasePrimitive } from '@/lib/base-primitives';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

export default async function PrimitivePage({ params }: PageProps) {
  const { name } = await params;
  const primitive = getBasePrimitive(name);
  if (!primitive) return notFound();

  const index = BASE_PRIMITIVES.findIndex((item) => item.name === primitive.name);
  const previous = index > 0 ? BASE_PRIMITIVES[index - 1] : undefined;
  const next = index < BASE_PRIMITIVES.length - 1 ? BASE_PRIMITIVES[index + 1] : undefined;
  const docs = getPrimitiveDocs(primitive.name);

  return <PrimitiveDocsPage primitive={primitive} docs={docs} previous={previous} next={next} />;
}

export function generateStaticParams() {
  return BASE_PRIMITIVES.map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const primitive = getBasePrimitive(name);
  if (!primitive) return {};

  const title = primitive.title;
  const description = primitive.description;
  const url = withBase(`/blocks/ui/${primitive.name}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [OG_IMAGE] },
  };
}
