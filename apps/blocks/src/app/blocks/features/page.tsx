import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';

import { CodeBlock } from '@/components/docs/code-block';
import { FEATURE_PACK_DOCS, PRESET_PROFILE_DOCS } from '@/lib/feature-packs';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';
import { cn } from '@/lib/utils';

const TITLE = 'Feature packs';
const DESCRIPTION =
  'Capability-aligned Constructive UI packs for data, authentication, users, organizations, storage, billing, and notifications.';

const FEATURE_PACK_INSTALLS = FEATURE_PACK_DOCS.map((pack) => registryAdd(pack.registryName)).join('\n');

export default function FeaturePacksPage() {
  return (
    <article className="registry-page">
      <header className="mb-10 max-w-3xl">
        <p className="registry-eyebrow">Application blocks</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">Feature packs</h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} Each registry item copies its presentational views, provider-neutral contracts, and a
          machine-readable manifest into your project, so the UI and the database preset can describe the same
          capability boundary.
        </p>
      </header>

      <div className="flex flex-col gap-12 lg:gap-14">
        <section aria-labelledby="feature-pack-model-heading">
          <div className="mb-4 max-w-3xl">
            <h2 id="feature-pack-model-heading" className="text-lg font-semibold tracking-tight">
              The contract between a preset and its UI
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              A manifest declares dependencies, endpoint kinds, required and optional capabilities, and the metadata
              sections a feature needs. Adapters bind those contracts to live resources and actions, while PostgreSQL
              grants and RLS remain the authorization boundary for every request.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Discover',
                body: 'The console checks the versioned _meta contract and standard GraphQL introspection before exposing data-backed features.',
              },
              {
                step: '2',
                title: 'Resolve',
                body: 'The manifest matches the available endpoint kinds and capabilities to the feature pack’s requirements.',
              },
              {
                step: '3',
                title: 'Adapt',
                body: 'The host injects resources and actions, so provider and deployment details stay outside the reusable UI.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-border/60 bg-card p-4">
                <span className="font-mono text-xs text-primary">{item.step.padStart(2, '0')}</span>
                <h3 className="mt-2 text-sm font-medium text-foreground">{item.title}</h3>
                <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="feature-pack-catalog-heading">
          <div className="mb-4 max-w-3xl">
            <h2 id="feature-pack-catalog-heading" className="text-lg font-semibold tracking-tight">
              First-release catalog
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Install one pack when you are composing a focused surface. The registry resolves its declared pack
              dependencies automatically.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {FEATURE_PACK_DOCS.map((pack) => (
              <li key={pack.id} className="min-w-0">
                <Link
                  href={`/blocks/features/${pack.id}`}
                  className={cn(
                    'group block h-full rounded-xl border border-border/60 bg-card p-4 outline-none',
                    'transition-[background-color,border-color,box-shadow] duration-150 ease-out',
                    'hover:border-border hover:bg-accent/40 hover:shadow-card',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{pack.title}</h3>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{pack.id}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{pack.endpoints}</Badge>
                      <ArrowUpRightIcon
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    </span>
                  </div>
                  <p className="mt-3 text-pretty text-xs leading-5 text-muted-foreground">{pack.description}</p>
                  <dl className="mt-3 grid gap-1 border-t border-border/60 pt-3 text-xs">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">Depends on</dt>
                      <dd className="min-w-0 font-mono text-foreground">
                        {pack.dependencies.length > 0 ? pack.dependencies.join(', ') : 'foundation'}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">Registry</dt>
                      <dd className="min-w-0 break-all font-mono text-foreground">@constructive/{pack.registryName}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          <CodeBlock className="mt-4" label="Install feature packs">
            {FEATURE_PACK_INSTALLS}
          </CodeBlock>
        </section>

        <section aria-labelledby="preset-profile-heading">
          <div className="mb-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="preset-profile-heading" className="text-lg font-semibold tracking-tight">
                Preset profiles
              </h2>
              <Badge variant="warning">Experimental</Badge>
            </div>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              These profiles map the current backend preset slugs to the feature packs they are expected to support.
              Treat them as compatibility declarations while backend preset behavior is still being stabilized;
              installing a profile copies its manifest and its transitive UI packs, but it does not provision or migrate
              a database.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <ul className="divide-y divide-border/60">
              {PRESET_PROFILE_DOCS.map((preset) => (
                <li
                  key={preset.id}
                  className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{preset.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{preset.presetSlug}</p>
                  </div>
                  <div className="min-w-0 md:text-right">
                    <p className="font-mono text-xs leading-5 text-foreground">{preset.featurePacks.join(' · ')}</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                      {registryAdd(preset.registryName)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/features') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/features'),
    images: [OG_IMAGE],
  },
};
