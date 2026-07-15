/**
 * Introduction — the `/blocks` root (Diátaxis EXPLANATION). Owns `/blocks` so the
 * reference catch-all can stay a REQUIRED `[...slug]` (no root collision).
 *
 * Understanding-first: the core idea (a block's data path is pre-wired to your
 * generated SDK) as a set of thesis blocks, then a compact Installation
 * quickstart with numbered step badges (FF Introduction shape, DESIGN.md §4.4).
 * The full hand-held path lives in the tutorial, the deep reasoning in /concepts.
 * Authored as JSX for calm, consistent styling.
 */

import type { Metadata } from 'next';

import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { InstallField } from '@/components/docs/install-field';
import { DocLink, InlineCode, proseCls } from '@/components/docs/prose';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const HREF = '/blocks';
const TITLE = 'Introduction';
const DESCRIPTION =
  'Constructive Blocks — copy-in React components for auth, account, organization, and app-shell surfaces, each bound to your application’s generated SDK.';

// FF numbered step badge (DESIGN.md §4.4). Shared by the Installation steps below.
const stepBadge =
  'mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground';

export default function IntroductionPage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-[16px] leading-none font-semibold text-foreground">Copy-in, data path wired</h3>
          <p className={proseCls}>
            Constructive Blocks are copy-in React components with their data path already wired. Every data block calls a
            generated React-Query hook from your application’s <InlineCode>@/generated/&lt;namespace&gt;</InlineCode> SDK
            — no fetch calls, no GraphQL strings, no endpoints to thread through. You install a block with the standard
            shadcn CLI, its source lands in your project, and it is yours to edit.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-[16px] leading-none font-semibold text-foreground">One runtime, one wiring point</h3>
          <p className={proseCls}>
            One small runtime — <InlineCode>BlocksRuntime</InlineCode> — is the single wiring point: it configures each
            namespace’s SDK and shares one <InlineCode>QueryClient</InlineCode>, so blocks never mount providers or read
            endpoints themselves.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-[16px] leading-none font-semibold text-foreground">Built on the UI foundation</h3>
          <p className={proseCls}>
            Every block is built from the same <DocLink href="/blocks/ui/button">UI foundation</DocLink>,{' '}
            <InlineCode>@constructive-io/ui</InlineCode>, which ships in this registry too — use it as a package or copy
            any primitive into your project.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-[16px] leading-none font-semibold text-foreground">Honest about what’s live</h3>
          <p className={proseCls}>
            Each block states its backend availability, from <em className="text-foreground not-italic">Ready</em> to{' '}
            <em className="text-foreground not-italic">Planned</em>, so you always know what is live.
          </p>
        </div>
      </section>

      <hr className="my-8 border-border/60" />

      <DocSection title="Installation">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <span className={stepBadge}>1</span>
            <span className="text-[13px] text-muted-foreground">
              Map the <InlineCode>@constructive</InlineCode> namespace once — the one-time host setup in{' '}
              <DocLink href="/blocks/getting-started">Getting started</DocLink>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className={stepBadge}>2</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-[13px] text-muted-foreground">Then install any block with the shadcn CLI:</span>
              <InstallField url="@constructive/auth-sign-in-card" align="left" className="w-fit" />
            </div>
          </div>
          <p className="text-caption text-pretty text-muted-foreground">
            Its whole graph — the runtime, the UI foundation, shared utilities — resolves automatically. Want the
            reasoning first? Read <DocLink href="/blocks/concepts/why-blocks">Why blocks</DocLink>. Building a whole
            capability? Start from a <DocLink href="/blocks/flows/authentication/email-password">flow</DocLink> — the
            database modules to provision and the blocks to install, together.
          </p>
        </div>
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
