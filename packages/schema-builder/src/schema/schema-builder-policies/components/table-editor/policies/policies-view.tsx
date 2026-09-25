'use client';

import { useMemo } from 'react';
import { useCardStack } from '@constructive-io/ui/stack';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import {
	databasePoliciesQueryKeys,
	useDatabasePolicies,
} from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import { EditorView, InlineCode, NoTableSelectedState } from '@/blocks/schema/schema-builder-core/components/table-editor/editor-view';

import { CreateTableCard } from '../../tables/create-table-card';
import { CRUD_OPERATIONS, PRIVILEGE_TO_OPERATION, type CrudOperation } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { PolicyEditCard } from './policy-edit-card';
import { PolicyOperationGroup } from './policy-operation-group';
import { PoliciesEmptyState } from './policies-empty-state';

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
		return <NoTableSelectedState icon={ShieldCheck} subject='policies' />;
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

	if (isLoading || !hasPolicies) {
		return (
			<div
				className='flex min-h-0 flex-1 flex-col overflow-auto p-6'
				data-chat-component='policies-view'
				data-chat-policy-count={String(currentTablePolicies.length)}
				data-chat-table-name={currentTable.name}
			>
				{isLoading ? (
					<p className='text-muted-foreground py-16 text-center text-[13px]' role='status'>
						Loading policies…
					</p>
				) : (
					<PoliciesEmptyState onCreateClick={() => handleOpenCreate()} tableName={currentTable.name} />
				)}
			</div>
		);
	}

	return (
		<EditorView
			data-chat-component='policies-view'
			data-chat-policy-count={String(currentTablePolicies.length)}
			data-chat-table-name={currentTable.name}
			description={
				<>
					{currentTablePolicies.length} polic{currentTablePolicies.length !== 1 ? 'ies' : 'y'} protecting{' '}
					<InlineCode>{currentTable.name}</InlineCode>
				</>
			}
			title='Policies'
		>
			<div className='flex flex-col gap-2'>
				{CRUD_OPERATIONS.map((op) => (
					<PolicyOperationGroup
						key={op}
						onAddClick={() => handleOpenCreate(op)}
						onPolicyClick={handleOpenEdit}
						operation={op}
						policies={groupedPolicies[op]}
						tableName={currentTable.name}
					/>
				))}
			</div>
		</EditorView>
	);
}
