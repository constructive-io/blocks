import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { AiComponentDocsPage } from '@/components/ai-showcase/ai-component-docs-page';
import { AI_COMPONENTS, getAiComponent } from '@/lib/ai-components';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

/** Former standalone pages folded into a parent surface. */
const AI_DOC_REDIRECTS: Record<string, string> = {
  'scroll-button': '/blocks/ai/chat-container',
};

export default async function AiComponentPage({ params }: PageProps) {
  const { name } = await params;
  const redirectTo = AI_DOC_REDIRECTS[name];
  if (redirectTo) permanentRedirect(redirectTo);

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
