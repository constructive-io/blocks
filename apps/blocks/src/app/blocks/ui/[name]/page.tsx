import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CodeBlock } from '@/components/docs/code-block';
import { PrimitivePreview } from '@/components/docs/primitive-preview';
import {
  BASE_PRIMITIVES,
  getBasePrimitive,
  packageImport,
  registryInstall,
  type BasePrimitive,
} from '@/lib/base-primitives';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ name: string }> };

function NeighborLink({ primitive, direction }: { primitive?: BasePrimitive; direction: 'Previous' | 'Next' }) {
  if (!primitive) return <span />;

  return (
    <Link
      href={`/blocks/ui/${primitive.name}`}
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{primitive.title}</span>
    </Link>
  );
}

export default async function PrimitivePage({ params }: PageProps) {
  const { name } = await params;
  const primitive = getBasePrimitive(name);
  if (!primitive) return notFound();

  const index = BASE_PRIMITIVES.findIndex((item) => item.name === primitive.name);
  const previous = index > 0 ? BASE_PRIMITIVES[index - 1] : undefined;
  const next = index < BASE_PRIMITIVES.length - 1 ? BASE_PRIMITIVES[index + 1] : undefined;

  return (
    <article className="site-container pb-16 sm:pb-24">
      <header className="max-w-2xl py-10 sm:py-12">
        <Link
          href="/"
          className="text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Components
        </Link>
        <h1 className="mt-3 text-balance text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
          {primitive.title}
        </h1>
        <p className="mt-3 text-pretty text-[15px] leading-7 text-muted-foreground">{primitive.description}</p>
      </header>

      <section aria-labelledby="preview-heading">
        <h2 id="preview-heading" className="sr-only">
          Preview
        </h2>
        <PrimitivePreview name={primitive.name} />
      </section>

      <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-5 shadow-card">
          <div>
            <h2 className="text-sm font-semibold">npm package</h2>
            <p className="mt-1 text-pretty text-sm text-muted-foreground">Import the versioned package subpath.</p>
          </div>
          <CodeBlock label="Install">pnpm add @constructive-io/ui</CodeBlock>
          <CodeBlock label="Import">{packageImport(primitive)}</CodeBlock>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-5 shadow-card">
          <div>
            <h2 className="text-sm font-semibold">shadcn registry</h2>
            <p className="mt-1 text-pretty text-sm text-muted-foreground">
              Install editable source without adding the npm package first.
            </p>
          </div>
          <CodeBlock label="Add component">{registryInstall(primitive)}</CodeBlock>
        </section>
      </div>

      <nav aria-label="Primitive pagination" className="mt-14 grid grid-cols-2 gap-6 border-t border-border/60 pt-6">
        <NeighborLink primitive={previous} direction="Previous" />
        <div className="text-right">
          <NeighborLink primitive={next} direction="Next" />
        </div>
      </nav>
    </article>
  );
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
