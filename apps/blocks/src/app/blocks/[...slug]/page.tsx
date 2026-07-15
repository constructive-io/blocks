/**
 * Reference catch-all — every generated block / UI / flow page renders here,
 * data-driven from `registry-data` through our own DocPage / DocSection /
 * ComponentPreview components. No MDX.
 *
 * This is a REQUIRED catch-all (`[...slug]`), so it does NOT claim `/blocks`
 * itself — that root is the Introduction (`(guides)/page.tsx`), and the
 * hand-authored guides own their own static routes. `generateStaticParams()`
 * enumerates only reference slugs (`getAllSlugs()`), keeping static export and
 * the guide routes conflict-free.
 *
 * Code snippets are highlighted on the SERVER (Shiki) and handed to the client
 * ComponentPreview as HTML — no client Shiki, no highlight flash, export-safe.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BlockStatusHeader } from '@/components/docs/block-status-header';
import { ComponentPreview } from '@/components/docs/component-preview';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { MessagesTable } from '@/components/docs/messages-table';
import { PropsTable } from '@/components/docs/props-table';
import { RequiresPanel } from '@/components/docs/requires-panel';
import { StatusBadge } from '@/components/docs/status-badge';
import { Markdown } from '@/components/markdown';
import { STATUS_META, type BlockStatus } from '@/lib/blocks';
import { getAdjacent, getAllSlugs, getPage } from '@/lib/docs/registry';
import { highlight } from '@/lib/highlight';
import { OG_IMAGE, withBase } from '@/lib/site';

type PageProps = { params: Promise<{ slug: string[] }> };

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const slugStr = (slug ?? []).join('/');
  const page = getPage(slugStr);
  if (!page) notFound();

  const href = `/blocks/${page.slug}`;
  const { prev, next } = getAdjacent(href);

  // Highlight every section snippet up front (server-side).
  const sections = await Promise.all(
    page.sections.map(async (s) => ({
      ...s,
      codeHtml: s.code ? await highlight(s.code, s.codeLang ?? page.usageCodeLang ?? 'tsx') : undefined,
    })),
  );

  // Lean (non-showcased) block = spec-only: status header carries its own install.
  const isLeanBlock = page.kind === 'block' && page.sections.length === 0 && !page.props?.length && Boolean(page.name);
  const installUrl = isLeanBlock ? undefined : page.installUrl ?? page.registryName ?? undefined;

  // Showcased (non-lean) block that isn't fully ready → a calm one-line status
  // note at the top of the body (dot StatusBadge + blurb). Lean blocks already
  // get the full <BlockStatusHeader>; ready blocks stay clean. Reuses the shared
  // STATUS_META blurb so the public-facing copy matches the rest of the docs.
  const statusMeta =
    page.kind === 'block' && !isLeanBlock && page.status && page.status !== 'ready' && page.status in STATUS_META
      ? STATUS_META[page.status as BlockStatus]
      : undefined;

  return (
    <DocPage title={page.title} description={page.description} installUrl={installUrl} prev={prev} next={next}>
      {isLeanBlock && page.name ? <BlockStatusHeader slug={page.name} /> : null}

      {statusMeta ? (
        <div className="not-prose flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <StatusBadge status={page.status as BlockStatus} />
          <span className="text-pretty text-[13px] text-muted-foreground">{statusMeta.blurb}</span>
        </div>
      ) : null}

      {sections.map((s) => (
        <DocSection key={s.id} id={s.id} title={s.title} intro={s.intro}>
          {s.showcaseSlug || s.codeHtml ? (
            <ComponentPreview
              showcaseSlug={s.showcaseSlug}
              codeHtml={s.codeHtml}
              rawCode={s.code}
              codeLang={s.codeLang ?? page.usageCodeLang ?? 'tsx'}
            />
          ) : null}
        </DocSection>
      ))}

      {page.builtWith?.length ? (
        <p className="text-[13px] text-muted-foreground">
          <span className="text-foreground/70">Built with</span> {page.builtWith.join(', ')}.
        </p>
      ) : null}

      {page.props?.length ? (
        <DocSection title="Props">
          <PropsTable rows={page.props} />
        </DocSection>
      ) : null}
      {page.messages ? (
        <DocSection title="Messages">
          <MessagesTable messages={page.messages} />
        </DocSection>
      ) : null}
      {page.requires ? (
        <DocSection title="Requires">
          <RequiresPanel requires={page.requires} />
        </DocSection>
      ) : null}

      {page.spec ? <Markdown>{page.spec}</Markdown> : null}
    </DocPage>
  );
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug: slug.split('/') }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage((slug ?? []).join('/'));
  if (!page) return {};
  const url = withBase(`/blocks/${page.slug}`);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, images: [OG_IMAGE] },
  };
}
