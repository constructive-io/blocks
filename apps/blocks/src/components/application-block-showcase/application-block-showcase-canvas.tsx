'use client';

import dynamic from 'next/dynamic';

import type { ApplicationBlockDoc } from '@/lib/application-blocks';

// Each preview route only pays for its own block's code.
const AgentsBuilderPreview = dynamic(() =>
  import('./agents-builder-preview').then((module) => module.AgentsBuilderPreview),
);
const BillingAccountPreview = dynamic(() =>
  import('./billing-account-preview').then((module) => module.BillingAccountPreview),
);
const BillingConsolePreview = dynamic(() =>
  import('./billing-console-preview').then((module) => module.BillingConsolePreview),
);
const OrgChartPreview = dynamic(() =>
  import('./org-chart-preview').then((module) => module.OrgChartPreview),
);
const StorageBrowserPreview = dynamic(() =>
  import('./storage-browser-preview').then((module) => module.StorageBrowserPreview),
);

export function ApplicationBlockShowcaseCanvas({
  name,
}: {
  name: ApplicationBlockDoc['name'];
}) {
  if (name === 'agents-builder') return <AgentsBuilderPreview />;
  if (name === 'billing-account') return <BillingAccountPreview />;
  if (name === 'billing-console') return <BillingConsolePreview />;
  return name === 'org-chart' ? (
    <OrgChartPreview />
  ) : (
    <StorageBrowserPreview />
  );
}
