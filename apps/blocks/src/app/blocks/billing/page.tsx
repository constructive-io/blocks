import type { Metadata } from 'next';

import { DocSectionNav } from '@/components/docs/doc-section-nav';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { GuidanceList, SectionHubCards, SectionHubHeader } from '@/components/docs/section-hub';
import { applicationBlockHref, getApplicationBlock } from '@/lib/application-blocks';
import { getFeaturePackDoc } from '@/lib/feature-packs';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

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

export default function BillingDocsPage() {
  return (
    <article aria-labelledby="billing-title" className="registry-page">
      <SectionHubHeader id="billing-title" title={TITLE} description={DESCRIPTION} />

      <DocSectionNav section="billing" current="/blocks/billing" />

      <SectionHubCards label="Billing workspaces" entries={ENTRIES} />

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
