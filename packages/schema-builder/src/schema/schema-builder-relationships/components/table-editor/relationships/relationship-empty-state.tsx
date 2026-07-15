'use client';

import { Link2, Shield, Target, Zap } from 'lucide-react';

import { EmptyStateCard } from '@/blocks/schema/schema-builder-core/components/shared/empty-state-card';

interface RelationshipEmptyStateProps {
	onCreateClick: () => void;
	tableName?: string;
}

export function RelationshipEmptyState({ onCreateClick, tableName }: RelationshipEmptyStateProps) {
	return (
		<EmptyStateCard
			icon={Link2}
			title={
				tableName ? (
					<>
						No relationships for {tableName}
					</>
				) : (
					'Create your first relationship'
				)
			}
			description={
				tableName
					? `Add a relationship to connect ${tableName} to other tables. This helps organize your data and maintain consistency.`
					: 'Connect your tables to establish relationships. This helps organize your data and maintain consistency.'
			}
			actionLabel='Create Relationship'
			actionIcon={Link2}
			onAction={onCreateClick}
			features={[
				{ icon: Shield, title: 'Data Integrity', description: 'Maintain consistency across tables' },
				{ icon: Target, title: 'Referential Actions', description: 'Control cascade & deletion behavior' },
				{ icon: Zap, title: 'Query Optimization', description: 'Efficient joins & data retrieval' },
			]}
		/>
	);
}
