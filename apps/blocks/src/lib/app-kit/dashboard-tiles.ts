import type { ApplicationBlockDoc } from '../application-blocks';

export const DASHBOARD_TILES_DOC: ApplicationBlockDoc = {
  name: 'dashboard-tiles',
  title: 'Dashboard Tiles',
  description:
    'The home screen of a resource-kit app: stat tiles on their own cards, count tiles that read a resource’s total with optional filters, panels of the latest records, and a grid that lays them out by its own width.',
  previewDescription:
    'A CRM overview with a count per resource, an open-deals count from a filter, a fixed figure, and the latest contacts and deals. Open a tile to jump to its list, or narrow the frame to watch the grid go from four tiles across to two.',
  previewHeight: 720,
  whenToUse: [
    'Use Dashboard Tiles for the first screen of a generated app: how many of each thing there are and what changed lately, each linking to where it came from.',
    'Use the billing or data-room insight views when a dashboard needs charts, trends, or domain-specific summaries.',
  ],
  usage: {
    description:
      'Render the tiles inside the ResourceKitProvider that holds your resources. Count tiles and recent lists read through each resource’s source and share its cache, so a write anywhere in the app refreshes them.',
    example: `'use client';

import { Wallet } from 'lucide-react';

import {
  DashboardGrid,
  RecentRecords,
  ResourceCountTile,
  StatTile
} from '@/components/ui/dashboard-tiles';

export function Overview({ pipeline }: { pipeline: string }) {
  return (
    <DashboardGrid>
      <ResourceCountTile resource="companies" />
      <ResourceCountTile resource="contacts" hint="Across every company" />
      <ResourceCountTile
        resource="deals"
        label="Open deals"
        filters={{ status: 'open' }}
      />
      <StatTile
        label="Pipeline value"
        value={pipeline}
        hint="Open deals, unweighted"
        icon={Wallet}
      />
      <RecentRecords resource="contacts" sort={{ field: 'createdAt', direction: 'desc' }} />
      <RecentRecords resource="deals" title="Latest deals" limit={5} />
    </DashboardGrid>
  );
}`,
  },
  state: {
    title: 'Counts and recent records',
    description:
      'A count tile asks its source for one row and shows the totalCount, with the same equality filters a list takes. Recent records follow the resource’s default sort, or newest first by createdAt when the resource has no default sort; pass sort to choose. Both refresh when the resource or a related one is written.',
  },
  composition: [
    'Tiles use the workspace kit’s stat figure and card surface; recent records use its panel, dashed rows, and empty state.',
    'StatTile works without the provider for figures the host computes itself; inside the provider its href goes through the host router’s Link.',
    'DashboardGrid sizes by its own container: one column on the narrowest screens, two tiles across in a pane or on a phone, four from 48rem. Recent records take two cells.',
  ],
  accessibility: [
    'A linked tile is a single link whose name is its label and figure, with the chevron hidden from assistive tech.',
    'Loading tiles and lists mark themselves busy, and every record title in a recent list is a link to that record.',
  ],
  api: [
    {
      name: 'StatTile',
      type: '{ label, value, hint?, href?, icon?, loading? }',
      behavior: 'A figure on its own card. With href the whole tile links to it.',
    },
    {
      name: 'ResourceCountTile',
      type: '{ resource, label?, filters?, hint? }',
      behavior: 'The resource’s total (optionally filtered) with its icon, linking to its list.',
    },
    {
      name: 'RecentRecords',
      type: '{ resource, limit?, sort?, filters?, title? }',
      behavior: 'The latest records with one detail and how long ago each was made, plus a View all link.',
    },
    {
      name: 'DashboardGrid',
      type: 'div props',
      behavior: 'Lays tiles out by its own width.',
    },
  ],
};
