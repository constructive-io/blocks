'use client';

import { Database, Lock, Plus, Table2, Zap } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import { cn } from '@/lib/utils';
import { useCardStack } from '@constructive-io/ui/stack';

import { EmptyStateCard } from '@/blocks/schema/schema-builder-core/components/shared/empty-state-card';
import { CreateTableCard } from '../tables';

interface NoTableSelectedViewProps {
	className?: string;
}

export function NoTableSelectedView({ className }: NoTableSelectedViewProps) {
	const { selectTable, currentSchema } = useSchemaBuilderSelectors();
	const stack = useCardStack();

	const handleCreateTable = () => {
		stack.push({
			id: 'create-table-select-model',
			title: 'Create Table',
			description: 'Securely create a new table based on its access model',
			Component: CreateTableCard,
			props: {
				onTableCreated: (table: { id: string; name: string }) => {
					selectTable(table.id, table.name);
				},
			},
			width: CARD_WIDTHS.extraWide,
		});
	};

	const hasTables = currentSchema && currentSchema.tables.length > 0;

	if (hasTables) {
		// Tables exist but none selected - simple prompt
		return (
			<div className={cn('flex flex-1 items-center justify-center p-6', className)}>
				<div className='text-center'>
					<div className='bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full'>
						<Table2 className='text-muted-foreground h-8 w-8' />
					</div>
					<h3 className='mb-2 text-lg font-medium'>No Table Selected</h3>
					<p className='text-muted-foreground mb-6 max-w-md text-sm'>
						Select a table from the sidebar to start editing its structure.
					</p>
				</div>
			</div>
		);
	}

	// No tables at all - rich empty state card
	return (
		<EmptyStateCard
			icon={Table2}
			title='Create your first table'
			description='Create a table to start defining fields, relationships, and access policies.'
			className={className}
			actionLabel='Create Table'
			actionIcon={Plus}
			onAction={handleCreateTable}
			features={[
				{ icon: Database, title: 'Flexible Schema', description: 'Easy to modify & extend' },
				{ icon: Lock, title: 'Access Control', description: 'Built-in security models' },
				{ icon: Zap, title: 'Type Safe', description: 'Strong data validation' },
			]}
		/>
	);
}
