/**
 * DocPage — the shared chrome for every page under `/blocks` (DESIGN.md §4.3).
 *
 * Renders, in order (root `flex flex-col gap-8`):
 *   1. header row — h1 + a 13px muted description on the left; a top-right
 *      prev/next pager on the right (ghost-icon SiteButtons, ArrowRight with the
 *      prev arrow rotated 180°) whose tooltips show the target title + a ←/→ kbd
 *      hint. Disabled (no tooltip) at the chain ends.
 *   2. install — auto-injected "Installation" DocSection when `installUrl` is
 *      set. The command renders through the package-manager context (InstallField),
 *      so it tracks the reader's pm choice.
 *   3. children — the page body composed by the caller: reference pages pass a
 *      status strip + <DocSection>s (preview/code) then props / messages /
 *      requires tables; guide pages pass their prose.
 *
 * Server component — it renders server-composed `children` and only client
 * leaves (SiteButton, InstallField, Tooltip), so no client runtime ships for the
 * page shell itself.
 *
 * Docs harness only — never imported by block source.
 */

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { DocSection } from '@/components/docs/doc-section';
import { InstallField } from '@/components/docs/install-field';
import { SiteButton } from '@/components/docs/site-button';
import type { AdjacentLink } from '@/lib/docs/registry';

export interface DocPageProps {
  title: string;
  description?: string;
  /** Registry item URL (e.g. `@constructive/auth-sign-in-card`) → renders the auto Installation block. */
  installUrl?: string;
  prev?: AdjacentLink;
  next?: AdjacentLink;
  children?: ReactNode;
}

export function DocPage({ title, description, installUrl, prev, next, children }: DocPageProps) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 text-balance text-foreground max-sm:text-[1.375rem]">{title}</h1>
          {description ? <p className="mt-2 text-[13px] text-pretty text-muted-foreground">{description}</p> : null}
        </div>
        <PrevNext prev={prev} next={next} />
      </header>

      {installUrl ? (
        <DocSection title="Installation">
          <InstallField url={installUrl} />
          <p className="text-[12px] text-muted-foreground">
            First install? Complete the one-time{' '}
            <Link
              href="/blocks/getting-started"
              className="underline decoration-foreground/50 underline-offset-2 transition-colors duration-[var(--dur-fast)] hover:decoration-foreground"
            >
              host setup
            </Link>
            .
          </p>
        </DocSection>
      ) : null}

      {children}
    </article>
  );
}

/**
 * Top-right prev/next pager. One shared TooltipProvider; each neighbour that
 * exists is a ghost-icon SiteButton link wrapped in a tooltip (title + kbd hint);
 * a missing neighbour is a disabled button holding the slot (no tooltip — FF).
 */
function PrevNext({ prev, next }: { prev?: AdjacentLink; next?: AdjacentLink }) {
  if (!prev && !next) return null;

  return (
    <TooltipProvider delay={200}>
      <nav aria-label="Pagination" className="flex shrink-0 items-center gap-1">
        <PagerButton dir="prev" link={prev} />
        <PagerButton dir="next" link={next} />
      </nav>
    </TooltipProvider>
  );
}

function PagerButton({ dir, link }: { dir: 'prev' | 'next'; link?: AdjacentLink }) {
  const isPrev = dir === 'prev';
  const label = isPrev ? 'Previous' : 'Next';
  const icon = <ArrowRight className={isPrev ? 'rotate-180' : undefined} />;

  if (!link) {
    return (
      <SiteButton variant="ghost" size="icon" disabled aria-label={`No ${label.toLowerCase()} page`}>
        {icon}
      </SiteButton>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SiteButton variant="ghost" size="icon" href={link.href} aria-label={`${label}: ${link.title}`}>
          {icon}
        </SiteButton>
      </TooltipTrigger>
      <TooltipContent>
        <span className="inline-flex items-center gap-2">
          {link.title}
          <kbd className="font-mono text-[11px] opacity-70">{isPrev ? '←' : '→'}</kbd>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

export default DocPage;
