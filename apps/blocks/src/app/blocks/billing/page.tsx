import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { BillingDocsNav } from '@/components/billing-docs/billing-docs-nav';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { applicationBlockHref, getApplicationBlock } from '@/lib/application-blocks';
import { getFeaturePackDoc } from '@/lib/feature-packs';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';
import { cn } from '@/lib/utils';

const TITLE = 'Billing';
const DESCRIPTION =
  'Billing workspaces for Constructive’s own platform billing and for tenant apps billing their customers: a customer view, an operator console, and the parts they are built from.';

const account = getApplicationBlock('billing-account')!;
const operatorConsole = getApplicationBlock('billing-console')!;
const pack = getFeaturePackDoc('billing')!;

const ENTRIES = [
  {
    href: applicationBlockHref(account),
    eyebrow: 'Customer',
    title: account.title,
    description: 'Plan, usage by credit pool, credits and gift codes, invoices, and the ledger for one personal or organization account.',
    install: account.name,
  },
  {
    href: applicationBlockHref(operatorConsole),
    eyebrow: 'Operator',
    title: operatorConsole.title,
    description: 'Catalog, entitlements, gift codes, customers, the payment provider with readiness, and platform database standing.',
    install: operatorConsole.name,
  },
  {
    href: '/blocks/features/billing',
    eyebrow: 'Console Kit',
    title: `${pack.title} feature pack`,
    description: 'The customer workspace as a feature pack, with a Console Kit module that reads plans and subscriptions from the billing endpoint.',
    install: pack.registryName,
  },
] as const;

function GuidanceList({ items }: { items: readonly string[] }) {
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

export default function BillingDocsPage() {
  return (
    <article aria-labelledby="billing-title" className="registry-page">
      <header className="mb-6 max-w-2xl">
        <p className="registry-eyebrow">Blocks</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]" id="billing-title">
          {TITLE}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">{DESCRIPTION}</p>
      </header>

      <BillingDocsNav current="/blocks/billing" />

      <section aria-label="Billing workspaces">
        <ul className="grid gap-3 md:grid-cols-3">
          {ENTRIES.map((entry) => (
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

      <DocSection
        description="Both templates are one workspace over the same billing modules, so the scope is data, not a separate install."
        id="platform-and-tenant"
        title="Platform and tenant billing"
      >
        <GuidanceList
          items={[
            'Platform: Constructive bills its customers for databases, seats, and usage through the standard meter pools (compute, inference, storage, database, transfer, messaging).',
            'Tenant: a database provisioned with the b2b:saas preset bills its own customers with its own catalog and its own provider account.',
            'Payment providers are descriptors the host passes in. Stripe ships built in; one provider is active at a time and can be switched.',
          ]}
        />
      </DocSection>

      <DocSection
        description="Every card, table, and dialog the templates use installs on its own with billing-kit."
        id="building-blocks"
        title="Building blocks"
      >
        <CodeBlock label="Registry install">{registryAdd('billing-kit')}</CodeBlock>
      </DocSection>
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/billing') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/billing'),
    images: [OG_IMAGE],
  },
};
