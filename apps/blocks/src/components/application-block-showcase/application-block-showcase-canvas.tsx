'use client';

import dynamic from 'next/dynamic';

import type { ApplicationBlockDoc } from '@/lib/application-blocks';

// Each preview route only pays for its own block's code.
const AgentsBuilderPreview = dynamic(() =>
  import('./agents-builder-preview').then((module) => module.AgentsBuilderPreview),
);
const CodingAgentPreview = dynamic(() =>
  import('./coding-agent-preview').then((module) => module.CodingAgentPreview),
);
const DataRoomsPreview = dynamic(() =>
  import('./data-rooms-preview').then((module) => module.DataRoomsPreview),
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
const ResourceKitPreview = dynamic(() =>
  import('./resource-kit-preview').then((module) => module.ResourceKitPreview),
);
const AuthPagesPreview = dynamic(() =>
  import('./auth-pages-preview').then((module) => module.AuthPagesPreview),
);
const DashboardTilesPreview = dynamic(() =>
  import('./dashboard-tiles-preview').then((module) => module.DashboardTilesPreview),
);

export function ApplicationBlockShowcaseCanvas({
  name,
}: {
  name: ApplicationBlockDoc['name'];
}) {
  if (name === 'agents-builder') return <AgentsBuilderPreview />;
  if (name === 'coding-agent') return <CodingAgentPreview />;
  if (name === 'data-rooms') return <DataRoomsPreview />;
  if (name === 'billing-account') return <BillingAccountPreview />;
  if (name === 'billing-console') return <BillingConsolePreview />;
  if (name === 'resource-kit') return <ResourceKitPreview />;
  if (name === 'auth-pages') return <AuthPagesPreview />;
  if (name === 'dashboard-tiles') return <DashboardTilesPreview />;
  return name === 'org-chart' ? (
    <OrgChartPreview />
  ) : (
    <StorageBrowserPreview />
  );
}
