import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type SectionHubEntry = Readonly<{
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Registry item shown at the bottom of the card. */
  install: string;
}>;

/** The cards at the top of a docs section's overview, one per page in the section. */
export function SectionHubCards({ label, entries }: { label: string; entries: readonly SectionHubEntry[] }) {
  return (
    <section aria-label={label}>
      <ul className={cn('grid gap-3', entries.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
        {entries.map((entry) => (
          <li key={entry.href} className="min-w-0">
            <Link
              href={entry.href}
              className={cn(
                'group flex h-full flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5',
                'outline-none transition-[box-shadow] duration-(--duration-moderate) ease-out hover:bg-accent/40',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{entry.eyebrow}</span>
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-(--duration-moderate) group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </span>
              <span className="text-pretty text-xs leading-5 text-muted-foreground">{entry.description}</span>
              <code className="mt-auto truncate pt-2 font-mono text-[11px] text-muted-foreground">{entry.install}</code>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex max-w-3xl flex-col gap-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
      {items.map((item) => (
        <li className="relative pl-5 before:absolute before:left-0 before:text-foreground before:content-['•']" key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Title block for a section overview page. */
export function SectionHubHeader({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <header className="mb-6 max-w-2xl">
      <p className="registry-eyebrow">Blocks</p>
      <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]" id={id}>
        {title}
      </h1>
      <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">{description}</p>
    </header>
  );
}
