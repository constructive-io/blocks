'use client';

import { Users } from 'lucide-react';
import * as React from 'react';

import { CustomerTable } from '../billing-kit/customers';
import { type BillingLifecycle } from '../billing-kit/types';
import { FilterGroup, SearchField, ViewFrame } from '../workspace-kit/primitives';
import { useBillingConsole } from './billing-console-context';

type Filter = 'all' | 'attention' | BillingLifecycle;

const ATTENTION: BillingLifecycle[] = ['grace', 'suspended', 'review_required', 'checkout_pending'];

/**
 * Subscribers, searchable and filtered by standing. Opening one shows the
 * operator detail: balances, credits, overrides, windows, and provider
 * operations.
 */
export function ConsoleCustomersView() {
	const { data, plans, openCustomer } = useBillingConsole();
	const [filter, setFilter] = React.useState<Filter>('all');
	const [query, setQuery] = React.useState('');
	const needle = query.trim().toLowerCase();
	const matches = (filterValue: Filter) =>
		data.customers.filter((customer) =>
			filterValue === 'all' ? true : filterValue === 'attention' ? ATTENTION.includes(customer.lifecycle) : customer.lifecycle === filterValue,
		);
	const shown = matches(filter).filter(
		(customer) =>
			!needle ||
			customer.name.toLowerCase().includes(needle) ||
			customer.email?.toLowerCase().includes(needle) ||
			customer.externalId?.toLowerCase().includes(needle),
	);

	return (
		<ViewFrame icon={Users} title="Customers">
			<div className="flex flex-col gap-3 @2xl/view:flex-row @2xl/view:items-center @2xl/view:justify-between">
				<FilterGroup
					label="Customer standing"
					value={filter}
					onChange={setFilter}
					options={[
						{ value: 'all', label: 'All', count: data.customers.length },
						{ value: 'attention', label: 'Needs attention', count: matches('attention').length },
						{ value: 'active', label: 'Active', count: matches('active').length },
						{ value: 'ended', label: 'Ended', count: matches('ended').length },
					]}
				/>
				<SearchField
					label="Search customers"
					placeholder="Name, email, or customer id"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					className="h-8 @2xl/view:w-72"
				/>
			</div>
			<CustomerTable customers={shown} plans={plans} onSelect={openCustomer} />
		</ViewFrame>
	);
}
