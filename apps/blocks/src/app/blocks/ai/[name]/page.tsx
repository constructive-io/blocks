import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AiComponentDocsPage } from '@/components/ai-showcase/ai-component-docs-page';
import { AI_COMPONENTS, getAiComponent } from '@/lib/ai-components';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

export default async function AiComponentPage({ params }: PageProps) {
  const { name } = await params;
  const component = getAiComponent(name);
  if (!component) return notFound();
  return <AiComponentDocsPage component={component} />;
}

export function generateStaticParams() {
  return AI_COMPONENTS.map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const component = getAiComponent(name);
  if (!component) return {};

  const url = withBase(`/blocks/ai/${component.name}`);
  return {
    title: component.title,
    description: component.description,
    alternates: { canonical: url },
    openGraph: {
      title: component.title,
      description: component.description,
      url,
      images: [OG_IMAGE],
    },
  };
}
