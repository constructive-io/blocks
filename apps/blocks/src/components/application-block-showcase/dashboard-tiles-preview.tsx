'use client';

import { LayoutDashboard, Wallet } from 'lucide-react';

import { DashboardGrid, RecentRecords, ResourceCountTile, StatTile } from '@/components/ui/dashboard-tiles';
import { ViewFrame } from '@/components/ui/workspace-kit';

import { AppKitPreviewShell } from './app-kit-preview-shell';

const NEWEST = { field: 'createdAt', direction: 'desc' } as const;

function Overview() {
  return (
    <ViewFrame icon={LayoutDashboard} title="Overview">
      <DashboardGrid>
        <ResourceCountTile resource="companies" />
        <ResourceCountTile resource="contacts" hint="Across every company" />
        <ResourceCountTile resource="deals" label="Open deals" filters={{ status: 'open' }} />
        <StatTile label="Pipeline value" value="$1,284,500" hint="Open deals, unweighted" icon={Wallet} />
        <RecentRecords resource="contacts" sort={NEWEST} />
        <RecentRecords resource="deals" title="Latest deals" sort={NEWEST} />
      </DashboardGrid>
    </ViewFrame>
  );
}

export function DashboardTilesPreview() {
  return <AppKitPreviewShell initialPath="/" home={<Overview />} />;
}
