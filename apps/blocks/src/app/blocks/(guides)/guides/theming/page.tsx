/**
 * How-to: Theme to your brand (Diátaxis how-to — goal-oriented recipe).
 *
 * Retune the OKLCH design tokens so every installed block matches the host's
 * brand without editing block source. Grounded in the real token contract:
 * blocks paint with the shadcn-standard semantic variables shipped by
 * `@constructive-io/ui/globals.css` (src/app/globals.css mirrors + extends them).
 * Overriding the SAME variable names after that import re-themes every block.
 *
 * Server component: composes DocPage (client) → DocSection (server) → CodeBlock
 * (async server). No `'use client'`, no MDX.
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { DocLink, InlineCode, proseCls, ResultCallout } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'theming');
const HREF = meta?.href ?? '/blocks/guides/theming';
const TITLE = meta?.title ?? 'Theme to your brand';
const DESCRIPTION =
  meta?.description ??
  'Retune the OKLCH design tokens so every block matches your brand — without editing block source.';

export default function ThemingGuidePage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <p className={proseCls}>
        Blocks read their color, radius, and elevation from CSS variables — never hardcoded values. Override those
        variables once in your global stylesheet and every installed block, plus the UI primitives underneath, follows
        your brand.
      </p>

      <DocSection
        title="1. Find where the tokens live"
        intro="During host setup you import the foundation stylesheet. It declares the semantic OKLCH tokens (and their .dark variants) every block paints with. You retune by redeclaring the same variables after that import — later rules win, so your block source never changes."
      >
        <CodeBlock
          lang="css"
          filename="app/globals.css"
          code={`@import "tailwindcss";
@import "@constructive-io/ui/globals.css"; /* foundation tokens (from host setup) */

/* Redeclare any token below to make it yours. */
:root {
  /* light-mode overrides */
}
.dark {
  /* dark-mode overrides */
}`}
        />
        <p className="mt-3 text-caption text-muted-foreground">
          New to the host setup? Start with <DocLink href="/blocks/getting-started">Getting started</DocLink>.
        </p>
      </DocSection>

      <DocSection
        title="2. Set your accent"
        intro="One accent carries primary actions, focus rings, and links. Override --primary (and the text drawn on it) plus --ring, in both themes. Keep it to a single hue."
      >
        <CodeBlock
          lang="css"
          filename="app/globals.css"
          code={`:root {
  --primary: oklch(0.62 0.19 17);          /* your brand */
  --primary-foreground: oklch(0.985 0 0);  /* text ON the accent */
  --ring: oklch(0.62 0.19 17);             /* focus ring */
}
.dark {
  --primary: oklch(0.70 0.18 17);
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.70 0.18 17);
}`}
        />
        <p className="mt-3 text-caption text-muted-foreground">
          Constructive’s own accent is <InlineCode>oklch(0.688 0.175 245.6)</InlineCode> — swap in yours.
        </p>
      </DocSection>

      <DocSection
        title="3. Tune the neutral surfaces"
        intro="Surfaces and text come from a neutral ramp. Shift the whole palette by editing the canvas, card, popover, and muted tokens; keep strong contrast between --foreground and --muted-foreground (the workhorse copy)."
      >
        <CodeBlock
          lang="css"
          filename="app/globals.css"
          code={`.dark {
  --background: oklch(0.16 0.01 264);        /* app canvas */
  --card: oklch(0.19 0.01 264);              /* cards, panels */
  --popover: oklch(0.21 0.01 264);           /* menus, dialogs */
  --muted: oklch(0.24 0.01 264);             /* subtle fills */
  --muted-foreground: oklch(0.70 0.01 264);  /* secondary text */
  --secondary: oklch(0.27 0.01 264);
  --accent: oklch(0.27 0.01 264);
}`}
        />
        <p className="mt-3 text-caption text-muted-foreground">
          These are the standard shadcn token names; the same set exists under <InlineCode>:root</InlineCode> for light
          mode.
        </p>
      </DocSection>

      <DocSection
        title="4. Adjust borders and radius"
        intro="Borders are hairlines and corners share one radius. Override --border / --input for chrome and set --radius to reshape every block at once."
      >
        <CodeBlock
          lang="css"
          filename="app/globals.css"
          code={`:root {
  --radius: 0.375rem;               /* 6px corner family */
  --border: oklch(0.92 0.004 264);  /* hairline borders */
  --input: oklch(0.93 0.004 264);   /* field borders */
}`}
        />
      </DocSection>

      <DocSection
        title="5. Verify both themes"
        intro="Toggle the .dark class on <html> and scan a page that uses several blocks. Each installed block re-themes automatically from the variables above — there is nothing to wire per block."
      >
        <p className={proseCls}>
          Want elevation that reads from shadow rather than borders, like this site? That surface ladder is an extra
          layer on top of these tokens — see{' '}
          <DocLink href="/blocks/concepts/design-and-motion">Design &amp; motion</DocLink>.
        </p>
      </DocSection>

      <ResultCallout>
        Every <InlineCode>@constructive</InlineCode> block and UI primitive in your app now renders in your brand — one
        stylesheet, zero block edits.
      </ResultCallout>
    </DocPage>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase(HREF) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: withBase(HREF), images: [OG_IMAGE] },
};
