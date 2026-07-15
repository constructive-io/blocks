'use client';

import { Lock, Shield, ShieldCheck } from 'lucide-react';

import { EmptyStateCard } from '@/blocks/schema/schema-builder-core/components/shared/empty-state-card';

interface PoliciesEmptyStateProps {
	onCreateClick: () => void;
	tableName?: string;
}

export function PoliciesEmptyState({ onCreateClick, tableName }: PoliciesEmptyStateProps) {
	return (
		<EmptyStateCard
			icon={Shield}
			title={
				tableName ? (
					<>
						No policies for {tableName}
					</>
				) : (
					'Create your first policy'
				)
			}
			description={
				tableName
					? `Add a row-level security policy to control access to ${tableName}. Policies determine who can read, create, update, or delete rows.`
					: 'Create policies to control data access. Row-level security ensures users only see the data they are authorized to access.'
			}
			actionLabel='Create Policy'
			actionIcon={Shield}
			onAction={onCreateClick}
			features={[
				{ icon: ShieldCheck, title: 'Row-Level Access', description: 'Control who can see each row' },
				{ icon: Lock, title: 'Secure by Default', description: 'Deny access unless explicitly allowed' },
				{ icon: Shield, title: 'Role-Based Rules', description: 'Different access for different roles' },
			]}
		/>
	);
}
