import Link from 'next/link';

import { cn } from '@/lib/utils';

export const BILLING_DOCS_LINKS = [
  { href: '/blocks/billing', label: 'Overview' },
  { href: '/blocks/billing/account', label: 'Billing Account' },
  { href: '/blocks/billing/console', label: 'Billing Console' },
  { href: '/blocks/features/billing', label: 'Feature pack' },
] as const;

export type BillingDocsHref = (typeof BILLING_DOCS_LINKS)[number]['href'];

/** Paths that belong to the Billing docs section, for the sidebar's active state. */
export function isBillingDocsPath(path: string) {
  return path === '/blocks/billing' || path.startsWith('/blocks/billing/') || path === '/blocks/features/billing';
}

/** Moves between the pages of the Billing docs section. */
export function BillingDocsNav({ current }: { current: BillingDocsHref }) {
  return (
    <nav aria-label="Billing docs" className="mb-6 overflow-x-auto border-b border-border [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1">
        {BILLING_DOCS_LINKS.map((link) => {
          const active = link.href === current;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex min-h-10 items-center border-b-2 px-2.5 text-[13px] outline-none transition-[color,box-shadow] duration-(--duration-moderate) ease-out',
                  'focus-visible:rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
