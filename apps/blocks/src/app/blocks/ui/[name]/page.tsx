import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm leading-6">
      <code>{children}</code>
    </pre>
  );
}

function NeighborLink({ primitive, direction }: { primitive?: BasePrimitive; direction: 'Previous' | 'Next' }) {
  if (!primitive) return <span />;

  return (
    <Link
      href={`/blocks/ui/${primitive.name}`}
      className="rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
    <article className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8 sm:py-24">
      <header className="max-w-2xl">
        <Link
          href="/blocks"
          className="text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Base primitives
        </Link>
        <h1 className="mt-4 text-balance text-3xl font-semibold sm:text-4xl">{primitive.title}</h1>
        <p className="mt-4 text-pretty leading-7 text-muted-foreground">{primitive.description}</p>
      </header>

      <section className="mt-10" aria-labelledby="preview-heading">
        <h2 id="preview-heading" className="sr-only">
          Preview
        </h2>
        <PrimitivePreview name={primitive.name} />
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-balance text-lg font-semibold">npm package</h2>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">Import the versioned package subpath.</p>
          </div>
          <Code>pnpm add @constructive-io/ui</Code>
          <Code>{packageImport(primitive)}</Code>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-balance text-lg font-semibold">shadcn registry</h2>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Install editable source without adding the npm package first.
            </p>
          </div>
          <Code>{registryInstall(primitive)}</Code>
        </section>
      </div>

      <nav aria-label="Primitive pagination" className="mt-16 grid grid-cols-2 gap-6 border-t pt-6">
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

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const primitive = getBasePrimitive(name);
  if (!primitive) return {};

  const url = withBase(`/blocks/ui/${primitive.name}`);
  return {
    title: primitive.title,
    description: primitive.description,
    alternates: { canonical: url },
    openGraph: {
      title: primitive.title,
      description: primitive.description,
      url,
      images: [OG_IMAGE],
    },
  };
}
