import { LayoutDashboard, Wallet } from 'lucide-react';

import { DashboardGrid, RecentRecords, ResourceCountTile, StatTile } from '../../components/dashboard-tiles';
import { ViewFrame } from '../../components/workspace-kit';

const NEWEST = { field: 'createdAt', direction: 'desc' } as const;

/** The CRM's home view: a count per resource, a fixed figure, and the latest records. */
export function DemoDashboard({ pipeline = '$1,284,500', title = 'Overview' }: { pipeline?: string; title?: string }) {
	return (
		<div className="@container/view flex min-h-0 min-w-0 flex-1 flex-col">
			<ViewFrame icon={LayoutDashboard} title={title}>
				<DashboardGrid>
					<ResourceCountTile resource="companies" />
					<ResourceCountTile resource="contacts" hint="Across every company" />
					<ResourceCountTile resource="deals" label="Open deals" filters={{ status: 'open' }} />
					<StatTile label="Pipeline value" value={pipeline} hint="Open deals, unweighted" icon={Wallet} />
					<RecentRecords resource="contacts" sort={NEWEST} />
					<RecentRecords resource="deals" title="Latest deals" sort={NEWEST} />
				</DashboardGrid>
			</ViewFrame>
		</div>
	);
}
