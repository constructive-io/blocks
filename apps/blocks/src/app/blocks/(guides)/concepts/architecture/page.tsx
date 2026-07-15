/**
 * Architecture & the registry — Diátaxis Explanation (understanding-oriented).
 *
 * How the source, the distribution, and these docs are one chain: `src/blocks`
 * is the canonical source, shipped verbatim by `apps/registry` under the
 * `@constructive` namespace, and documented by a generator that reads the same
 * source into a typed data module. Understanding-oriented prose only — no steps.
 * Grounded in `apps/registry/scripts/build.mjs`, `scripts/generate-manifest.mjs`,
 * `src/lib/docs/registry-data.ts`, and `components.json`.
 */

import type { Metadata } from 'next';

import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { DocLink, InlineCode, Prose } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'architecture');
const HREF = meta?.href ?? '/blocks/concepts/architecture';
const TITLE = meta?.title ?? 'Architecture & the registry';
const DESCRIPTION =
  meta?.description ??
  'One source of truth, shipped verbatim through a shadcn registry, documented by a generator that reads the same source. Source, distribution, and docs are one chain.';

export default function ArchitecturePage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <DocSection title="One canonical source">
        <Prose>
          <p>
            There is exactly one place a block lives: <InlineCode>src/blocks</InlineCode> in this app. The files that
            render the live previews on this site are the same files you install. There is no separate “distribution”
            copy that can fall out of step with the one you read — the source and the artifact are the same source.
          </p>
          <p>
            That source is organized by surface. <InlineCode>auth</InlineCode> blocks cover sign-in, sign-up, account,
            and MFA; <InlineCode>org</InlineCode> blocks cover teams and membership; <InlineCode>shell</InlineCode>{' '}
            blocks are app-shell pieces; <InlineCode>user</InlineCode> blocks are profile fragments. Underneath sit the
            shared foundations — small <InlineCode>lib</InlineCode> helpers, the form{' '}
            <InlineCode>primitives</InlineCode>, and the <InlineCode>runtime</InlineCode> — that the leaves compose.
            It’s a flat catalog of leaves over a thin shared base, not a framework.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Shipped verbatim">
        <Prose>
          <p>
            The registry app, <InlineCode>apps/registry</InlineCode>, copies that source with no import rewrite. A
            block’s own specifiers — <InlineCode>@/blocks/*</InlineCode>, <InlineCode>@/generated/*</InlineCode>,{' '}
            <InlineCode>@constructive-io/ui/*</InlineCode> — are already the imports a consumer app uses, so they ship
            exactly as written. What you read is what lands in your tree, down to the import lines. Tests are the only
            thing stripped on the way out.
          </p>
          <p>
            The build merges each block’s registry entry, then runs <InlineCode>shadcn build</InlineCode> to emit static
            JSON served from GitHub Pages. Distribution is a copy and a manifest — deliberately boring, so there’s
            nowhere for drift to hide between the block and the thing you install.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="The @constructive namespace">
        <Prose>
          <p>
            Every install command on this site is namespaced: <InlineCode>@constructive/&lt;name&gt;</InlineCode>. Your
            project maps that namespace once, in <InlineCode>components.json</InlineCode>, to the registry’s URL. After
            that the shadcn CLI resolves any block from it. The{' '}
            <DocLink href="/blocks/getting-started">getting-started</DocLink> tutorial walks the one-time setup.
          </p>
          <p>
            The namespace also keeps a block’s dependency graph honest. When the build sees a dependency that lives in
            this registry, it rewrites the bare name to its <InlineCode>@constructive/</InlineCode> form, so the CLI
            pulls it from here rather than the default shadcn registry. Installing the sign-in card therefore brings its
            whole graph with it — the runtime, the error library, the form primitives, the <InlineCode>cn</InlineCode>{' '}
            helper — in one command. You ask for a surface; you get the tree it needs.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="The docs are data-driven from the same source">
        <Prose>
          <p>
            This site isn’t hand-written page by page. A generator reads the block catalog, the registry manifests, and
            the prose sources, and emits one typed data module — <InlineCode>registry-data.ts</InlineCode>. A single
            catch-all route renders every reference page from that module through the shared{' '}
            <InlineCode>DocPage</InlineCode> / <InlineCode>DocSection</InlineCode> /{' '}
            <InlineCode>ComponentPreview</InlineCode> components.
          </p>
          <p>
            The generated module is committed and checked in CI: regenerate, and if the output differs from what’s on
            disk, the check fails. So the docs can’t silently diverge from the registry. Add a block, regenerate, and
            its reference page exists — with the same install command, props, and required operations the registry
            actually ships. The page you’re reading now is the exception by design: concept essays are hand-authored,
            because understanding doesn’t generate.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Three kinds of item">
        <Prose>
          <p>
            The registry carries three kinds of thing, and the sidebar routes by intent.{' '}
            <strong className="font-medium text-foreground">Blocks</strong> are the full-stack leaves.{' '}
            <strong className="font-medium text-foreground">UI components</strong> are the{' '}
            <DocLink href="/blocks/ui/button">@constructive-io/ui foundation</DocLink> — usable as a package or copied
            in as source. <strong className="font-medium text-foreground">Flows</strong> are capability bundles: a{' '}
            <DocLink href="/blocks/flows/authentication/email-password">flow</DocLink> names the database modules to
            provision and the blocks to install for one capability, so “add password auth” is a list, not a hunt.
          </p>
          <p>
            That’s the shape of the whole thing. Edit a block in <InlineCode>src/blocks</InlineCode>; the registry ships
            it verbatim; the docs regenerate from it. One chain, no hand-synced copies to drift. If you want to see how
            an installed block actually <em>runs</em> in your app, that’s the{' '}
            <DocLink href="/blocks/concepts/runtime-contract">runtime contract</DocLink>.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase(HREF) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: withBase(HREF), images: [OG_IMAGE] },
};
