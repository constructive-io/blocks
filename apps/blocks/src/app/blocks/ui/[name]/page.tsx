import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InstallToggle } from '@/components/docs/install-toggle';
import { PrimitivePreview } from '@/components/docs/primitive-preview';
import {
  BASE_PRIMITIVES,
  getBasePrimitive,
  packageImport,
  type BasePrimitive,
} from '@/lib/base-primitives';
import { packageCommands, registryCommands } from '@/lib/install-mode';
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
    <article className="registry-page">
      <header className="mb-6 max-w-2xl">
        <p className="registry-eyebrow">Components</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">{primitive.title}</h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {primitive.description}
        </p>
      </header>

      <div className="registry-block">
        <div className="registry-block-bar">
          <span>
            Preview <span className="font-mono text-xs font-normal text-muted-foreground">· live</span>
          </span>
          <span className="flex-1" />
          <span className="font-mono text-xs font-normal text-muted-foreground">@constructive/{primitive.name}</span>
        </div>
        <div className="registry-block-stage center min-h-64 justify-center !p-8 sm:!p-10">
          <PrimitivePreview name={primitive.name} framed={false} />
        </div>
      </div>

      <div className="mt-5 min-w-0">
        <InstallToggle
          npm={packageCommands({ importLine: packageImport(primitive) })}
          registry={registryCommands({ item: primitive.name })}
          descriptions={{
            npm: 'Install the package once, then import this primitive from the package export.',
            registry: 'Copy this component’s source into your project via the shadcn CLI.',
          }}
        />
      </div>

      <nav aria-label="Primitive pagination" className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6">
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
