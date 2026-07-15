'use client';

import { useMemo } from 'react';
import { useCardStack } from '@constructive-io/ui/stack';
import { useQueryClient } from '@tanstack/react-query';
import { Table2 } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import {
	databasePoliciesQueryKeys,
	useDatabasePolicies,
} from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';

import { CreateTableCard } from '../../tables/create-table-card';
import { CRUD_OPERATIONS, PRIVILEGE_TO_OPERATION, type CrudOperation } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { PolicyEditCard } from './policy-edit-card';
import { PolicyOperationGroup } from './policy-operation-group';
import { PoliciesEmptyState } from './policies-empty-state';

function NoTableSelectedState() {
	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center p-6'>
			<div className='bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full'>
				<Table2 className='text-muted-foreground h-8 w-8' />
			</div>
			<h3 className='mb-1 text-lg font-semibold'>No table selected</h3>
			<p className='text-muted-foreground max-w-sm text-center text-sm'>
				Select a table from the sidebar to view and manage its security policies.
			</p>
		</div>
	);
}

export function PoliciesView() {
	const stack = useCardStack();
	const queryClient = useQueryClient();
	const { currentTable, currentDatabase } = useSchemaBuilderSelectors();

	const databaseId = currentDatabase?.databaseId ?? '';
	const hasDatabase = Boolean(databaseId);

	const { data: tablesData = [], isLoading } = useDatabasePolicies(databaseId, { enabled: hasDatabase });

	// Get current table data including RLS status
	const currentTableData = useMemo(() => {
		if (!currentTable) return null;
		return tablesData.find((t) => t.id === currentTable.id) ?? null;
	}, [tablesData, currentTable]);

	// Get policies for the current table
	const currentTablePolicies = currentTableData?.policies ?? [];

	// Group policies by operation (privilege)
	const groupedPolicies = useMemo(() => {
		const groups: Record<CrudOperation, DatabasePolicy[]> = {
			read: [],
			create: [],
			update: [],
			delete: [],
		};

		for (const policy of currentTablePolicies) {
			const op = policy.privilege ? PRIVILEGE_TO_OPERATION[policy.privilege] : undefined;
			if (op && op in groups) {
				groups[op].push(policy);
			}
		}

		return groups;
	}, [currentTablePolicies]);

	// No table selected state
	if (!currentTable) {
		return <NoTableSelectedState />;
	}

	const hasPolicies = currentTablePolicies.length > 0;

	const handleOpenCreate = (operation?: CrudOperation) => {
		stack.push({
			id: `policy-create-${currentTable.id}${operation ? `-${operation}` : ''}`,
			title: operation ? `Add ${operation.toUpperCase()} Policy` : 'Create New Policies',
			description: `Add security policies to ${currentTable.name}`,
			Component: CreateTableCard,
			props: {
				mode: 'add-policies' as const,
				tableId: currentTable.id,
				tableName: currentTable.name,
				preSelectedOperation: operation,
				onPoliciesCreated: () => {
					if (databaseId) {
						queryClient.invalidateQueries({ queryKey: databasePoliciesQueryKeys.byDatabase(databaseId) });
					}
				},
			},
			width: CARD_WIDTHS.extraWide,
		});
	};

	const handleOpenEdit = (policy: DatabasePolicy) => {
		stack.push({
			id: `policy-edit-${policy.id}`,
			title: 'Edit Policy',
			description: 'Update policy settings',
			Component: PolicyEditCard,
			props: {
				policy: { ...policy, tableId: currentTable.id },
				tableName: currentTable.name,
				onSuccess: () => {
					if (databaseId) {
						queryClient.invalidateQueries({ queryKey: databasePoliciesQueryKeys.byDatabase(databaseId) });
					}
				},
			},
			width: 500,
		});
	};

	return (
		<div
			data-chat-component='policies-view'
			data-chat-table-name={currentTable.name}
			data-chat-policy-count={String(currentTablePolicies.length)}
			className='flex min-h-0 flex-1 flex-col overflow-auto p-6'
		>
			{isLoading ? (
				<div className='flex items-center justify-center py-16'>
					<p className='text-muted-foreground text-sm'>Loading policies...</p>
				</div>
			) : !hasPolicies ? (
				<PoliciesEmptyState onCreateClick={() => handleOpenCreate()} tableName={currentTable.name} />
			) : (
				<div className='mx-auto w-full max-w-4xl space-y-6'>
					{/* Header */}
					<div>
						<h2 className='text-xl font-semibold tracking-tight'>Policies</h2>
						<p className='text-muted-foreground mt-1 text-sm'>
							{currentTablePolicies.length} polic{currentTablePolicies.length !== 1 ? 'ies' : 'y'} protecting{' '}
							<code className='bg-muted rounded px-1.5 py-0.5 font-mono text-xs'>{currentTable.name}</code>
						</p>
					</div>

					{/* Operation Groups */}
					<div className='space-y-3'>
						{CRUD_OPERATIONS.map((op) => (
							<PolicyOperationGroup
								key={op}
								operation={op}
								policies={groupedPolicies[op]}
								tableName={currentTable.name}
								onPolicyClick={handleOpenEdit}
								onAddClick={() => handleOpenCreate(op)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
