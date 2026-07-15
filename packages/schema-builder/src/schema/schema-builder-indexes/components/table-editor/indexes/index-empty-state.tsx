'use client';

import { ListChecks, Search, Shield, Zap } from 'lucide-react';

import { EmptyStateCard } from '@/blocks/schema/schema-builder-core/components/shared/empty-state-card';

interface IndexEmptyStateProps {
	onCreateClick: () => void;
	tableName?: string;
}

export function IndexEmptyState({ onCreateClick, tableName }: IndexEmptyStateProps) {
	return (
		<EmptyStateCard
			icon={ListChecks}
			title={
				tableName ? (
					<>
						No indexes for {tableName}
					</>
				) : (
					'Create your first index'
				)
			}
			description={
				tableName
					? `Add an index to improve query performance on ${tableName}. Indexes speed up data retrieval by creating efficient lookup structures.`
					: 'Create indexes to optimize query performance. Indexes help the database find and retrieve data faster.'
			}
			actionLabel='Create Index'
			actionIcon={ListChecks}
			onAction={onCreateClick}
			features={[
				{ icon: Zap, title: 'Faster Queries', description: 'Speed up data retrieval operations' },
				{ icon: Search, title: 'Efficient Lookups', description: 'Quick access to specific rows' },
				{ icon: Shield, title: 'Unique Constraints', description: 'Enforce data uniqueness rules' },
			]}
		/>
	);
}
