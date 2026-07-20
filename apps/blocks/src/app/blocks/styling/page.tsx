import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import { CodeBlock } from '@/components/docs/code-block';
import { InstallToggle } from '@/components/docs/install-toggle';
import {
  ColorTokenGallery,
  ContrastPairs,
  FontScale,
  RadiusScale,
  ShadowScale,
  ZIndexScale,
} from '@/components/docs/theme-swatches';
import { packageCommands, registryCommands } from '@/lib/install-mode';
import { THEME_OVERRIDE_EXAMPLE } from '@/lib/theme-tokens';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Styling';
const DESCRIPTION =
  'Constructive theme tokens — OKLCH colors, radius scale, shadows, fonts, and z-index layers for @constructive-io/ui.';

function DocSection({
  id,
  title,
  children,
  lead,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <div className="mb-4 max-w-2xl">
        <h2 id={`${id}-heading`} className="text-lg font-semibold tracking-tight">
          <a href={`#${id}`} className="outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
            {title}
          </a>
        </h2>
        {lead ? <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function StylingPage() {
  return (
    <div className="registry-page">
      <header className="mb-10 max-w-2xl">
        <p className="registry-eyebrow">Foundations</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">Styling</h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          A guide to the Constructive color system and CSS variables. Tokens ship with{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12.5px]">@constructive-io/ui</code> and
          the shadcn registry theme — the same values power every primitive on this site.
        </p>
      </header>

      <div className="flex flex-col gap-12 lg:gap-14">
        <DocSection
          id="overview"
          title="Overview"
          lead="The theme builds on shadcn/ui’s CSS variable approach: semantic names on :root and .dark, wired into Tailwind via @theme inline so utilities like bg-primary and text-muted-foreground always track the active mode."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>What you get</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !gap-0 !bg-[image:none] !p-0">
              <ul className="divide-y divide-border">
                {[
                  {
                    title: 'OKLCH semantic colors',
                    body: 'Surfaces, brand, feedback, charts, and sidebar tokens in light and dark.',
                  },
                  {
                    title: 'Radius scale',
                    body: 'A single --radius (0.5rem) with derived xs → 2xl steps for consistent corners.',
                  },
                  {
                    title: 'Shadows & card elevation',
                    body: 'Tailwind shadow steps plus package utilities shadow-card and shadow-card-lg.',
                  },
                  {
                    title: 'Typography stacks',
                    body: 'Sans, mono, and serif CSS variables mapped to font-sans / font-mono utilities.',
                  },
                  {
                    title: 'Z-index layers',
                    body: 'Named stacking levels for floating UI, modals, toasts, and the portal root.',
                  },
                ].map((item) => (
                  <li key={item.title} className="px-4 py-3.5 sm:px-5">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-pretty text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground">
            Swatches below resolve against the live document theme — use the theme toggle in the top bar to
            compare light and dark. Source of truth is{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">packages/ui/src/theme.ts</code>
            ; generated CSS is imported as{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
              @constructive-io/ui/globals.css
            </code>
            .
          </p>
        </DocSection>

        <DocSection
          id="installation"
          title="Installation"
          lead="Pull in the full token set with one import (npm) or by adding the registry theme (shadcn)."
        >
          <InstallToggle
            npm={packageCommands({ globals: true })}
            registry={[
              ...registryCommands({ item: 'constructive-theme', includeConfig: true }),
            ]}
            descriptions={{
              npm: 'Install the package, then import the generated globals in your app stylesheet.',
              registry:
                'Point components.json at the Constructive registry. Adding a component also brings theme dependencies — or install the theme item explicitly.',
            }}
          />
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground">
            New to the dual install paths? See{' '}
            <Link href="/blocks" className="font-medium text-foreground underline-offset-4 hover:underline">
              Setup
            </Link>{' '}
            for the full install guide. Your npm/registry choice is remembered across pages.
          </p>
        </DocSection>

        <DocSection
          id="colors"
          title="Colors"
          lead="Semantic tokens pair a surface with a foreground. Prefer names like bg-primary over raw hex so components stay mode-aware."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Contrast pairs</span>
              <span className="min-w-0 flex-1" />
              <span className="shrink-0 text-xs font-normal text-muted-foreground">live</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !p-4">
              <ContrastPairs />
            </div>
          </div>

          <div className="registry-block mt-5 min-w-0">
            <div className="registry-block-bar">
              <span>Token gallery</span>
              <span className="min-w-0 flex-1" />
              <span className="shrink-0 text-xs font-normal text-muted-foreground">CSS vars · Tailwind</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !p-4 sm:!p-5">
              <ColorTokenGallery />
            </div>
          </div>
        </DocSection>

        <DocSection
          id="radius"
          title="Radius"
          lead="One base radius drives the scale. Default --radius is 0.5rem; derived steps keep buttons, inputs, and cards optically aligned."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Scale</span>
              <span className="min-w-0 flex-1" />
              <span className="shrink-0 font-mono text-xs font-normal text-muted-foreground">--radius: 0.5rem</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !p-4">
              <RadiusScale />
            </div>
          </div>
        </DocSection>

        <DocSection
          id="shadows"
          title="Shadows"
          lead="Standard shadow utilities plus card elevation helpers that use --shadow-border and --shadow-border-hover for a subtle edge + lift."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Elevation</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !p-4">
              <ShadowScale />
            </div>
          </div>
        </DocSection>

        <DocSection
          id="typography"
          title="Typography"
          lead="Font stacks are CSS variables mapped into Tailwind. This docs site loads Geist; the package defaults fall back to Open Sans and system mono."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Font tokens</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !p-4">
              <FontScale />
            </div>
          </div>
        </DocSection>

        <DocSection
          id="z-index"
          title="Z-index layers"
          lead="Named layers keep portaled overlays (dialogs, menus, toasts) above page content without ad-hoc magic numbers."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Stacking</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !p-0">
              <ZIndexScale />
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground">
            The package also sets isolation on the app root and{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">position: relative</code> on{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">body</code> so Base UI portals and
            backdrops stack predictably — including on iOS Safari after scroll.
          </p>
        </DocSection>

        <DocSection
          id="dark-mode"
          title="Dark mode"
          lead="Tokens redefine under .dark. Pair the class strategy with next-themes (or your own toggle) so documentElement carries class dark."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Variant</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col gap-3 !p-4">
              <CodeBlock label="Tailwind v4 dark variant">{`/* from package globals */\n@custom-variant dark (&:is(.dark *));`}</CodeBlock>
              <p className="text-pretty text-sm leading-6 text-muted-foreground">
                Light values live on <code className="font-mono text-[12px]">:root</code>; dark values on{' '}
                <code className="font-mono text-[12px]">.dark</code>. Primary brand blue stays consistent across
                modes; neutrals and surfaces shift for contrast.
              </p>
            </div>
          </div>
        </DocSection>

        <DocSection
          id="customization"
          title="Customization"
          lead="Override semantic variables after the package import. Keep names intact so components continue to resolve the right tokens."
        >
          <div className="registry-block min-w-0">
            <div className="registry-block-bar">
              <span>Override example</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col gap-3 !p-4">
              <CodeBlock label="app/globals.css">{THEME_OVERRIDE_EXAMPLE}</CodeBlock>
              <ul className="list-inside list-disc space-y-1.5 text-sm leading-6 text-muted-foreground">
                <li>
                  Prefer redefining <code className="font-mono text-[12px]">--primary</code>,{' '}
                  <code className="font-mono text-[12px]">--radius</code>, and surface tokens over editing
                  component source.
                </li>
                <li>
                  Always set matching <code className="font-mono text-[12px]">*-foreground</code> pairs when you
                  change a surface or brand color.
                </li>
                <li>
                  For registry installs, overrides still belong in your app CSS after generated theme CSS.
                </li>
              </ul>
            </div>
          </div>
        </DocSection>

        <nav
          aria-label="Related foundations"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-8"
        >
          <Link
            href="/blocks"
            className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block text-xs">Previous</span>
            <span className="font-medium text-foreground">Setup</span>
          </Link>
          <Link
            href="/blocks/ui/button"
            className="inline-flex min-h-10 flex-col items-end justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block text-xs">Next</span>
            <span className="font-medium text-foreground">Button</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/styling') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/styling'),
    images: [OG_IMAGE],
  },
};
