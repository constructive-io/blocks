'use client';

import { Activity } from 'lucide-react';
import * as React from 'react';

import { LedgerTimeline } from '../billing-kit/ledger';
import { type LedgerClass } from '../billing-kit/types';
import { FilterGroup, ViewFrame } from '../workspace-kit/primitives';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';
import { useBillingAccount } from './billing-account-context';

type Filter = 'all' | LedgerClass;

/** The ledger, filterable by class: usage, grants, adjustments, refunds. */
export function BillingActivityView() {
	const { data } = useBillingAccount();
	const [filter, setFilter] = React.useState<Filter>('all');
	const count = (value: Filter) => (value === 'all' ? data.ledger.length : data.ledger.filter((entry) => entry.ledgerClass === value).length);
	const entries = filter === 'all' ? data.ledger : data.ledger.filter((entry) => entry.ledgerClass === filter);
	const options = (
		[
			{ value: 'all', label: 'All' },
			{ value: 'usage', label: 'Usage' },
			{ value: 'grant', label: 'Grants' },
			{ value: 'adjustment', label: 'Adjustments' },
			{ value: 'refund', label: 'Refunds' },
		] as const
	)
		.map((option) => ({ ...option, count: count(option.value) }))
		.filter((option) => option.value === 'all' || option.count > 0);

	return (
		<ViewFrame icon={Activity} title="Activity" maxWidth="max-w-3xl">
			<FilterGroup label="Entry type" value={filter} options={options} onChange={(next) => startViewTransition(() => setFilter(next))} />
			<ViewAnimation>
				<div key={filter}>
					<LedgerTimeline entries={entries} meters={data.meters} />
				</div>
			</ViewAnimation>
		</ViewFrame>
	);
}
