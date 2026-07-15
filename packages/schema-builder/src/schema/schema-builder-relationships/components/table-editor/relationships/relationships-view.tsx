'use client';

import { useMemo, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { useCardStack } from '@constructive-io/ui/stack';
import { toast } from '@constructive-io/ui/toast';
import { CornerDownRight, Link2, Table2, Trash2 } from 'lucide-react';

import { useRelationProvisionsQuery } from '@/generated/modules/hooks/queries/useRelationProvisionsQuery';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useDeleteForeignKey } from '../../../lib/gql/hooks/schema-builder/use-relationship-mutations';
import { type ForeignKeyConstraint, ForeignKeyActionLabels, ForeignKeyActions, type RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';

import { DeleteConfirmDialog } from '@/blocks/schema/schema-builder-core/components/table-editor/delete-confirm-dialog';
import { RelationshipCard } from './relationship-card';
import { RelationshipEmptyState } from './relationship-empty-state';
import {
	getTableRelationships,
	type RelationProvisionInfo,
	type TableRelationship,
} from './relationship-utils';

// Keep color choices in sync with TYPE_OPTIONS in relationship-type-selector.tsx
const RELATIONSHIP_STYLES: Record<
	RelationshipType,
	{
		bg: string;
		border: string;
		text: string;
		label: string;
		shortLabel: string;
	}
> = {
	'one-to-one': {
		bg: 'bg-purple-500/10',
		border: 'border-purple-500/30',
		text: 'text-purple-600 dark:text-purple-400',
		label: 'One to One',
		shortLabel: '1:1',
	},
	'belongs-to': {
		bg: 'bg-green-500/10',
		border: 'border-green-500/30',
		text: 'text-green-600 dark:text-green-400',
		label: 'Belongs To',
		shortLabel: 'BT',
	},
	'one-to-many': {
		bg: 'bg-blue-500/10',
		border: 'border-blue-500/30',
		text: 'text-blue-600 dark:text-blue-400',
		label: 'One to Many',
		shortLabel: '1:N',
	},
	'many-to-many': {
		bg: 'bg-amber-500/10',
		border: 'border-amber-500/30',
		text: 'text-amber-600 dark:text-amber-400',
		label: 'Many to Many',
		shortLabel: 'N:M',
	},
};


// Mini connector icons for list view — uses currentColor so Tailwind dark: classes work
function MiniConnector({ type }: { type: RelationshipType }) {
	if (type === 'one-to-one') {
		return (
			<svg width='32' height='16' viewBox='0 0 32 16' fill='none' className='shrink-0'>
				<circle cx='4' cy='8' r='3' fill='currentColor' fillOpacity='0.3' stroke='currentColor' strokeWidth='1.5' />
				<line x1='8' y1='8' x2='24' y2='8' stroke='currentColor' strokeWidth='1.5' strokeDasharray='2 2' />
				<circle cx='28' cy='8' r='3' fill='currentColor' fillOpacity='0.3' stroke='currentColor' strokeWidth='1.5' />
			</svg>
		);
	}
	if (type === 'belongs-to') {
		return (
			<svg width='32' height='16' viewBox='0 0 32 16' fill='none' className='shrink-0'>
				<circle cx='6' cy='3' r='2' fill='currentColor' />
				<circle cx='4' cy='8' r='2' fill='currentColor' />
				<circle cx='6' cy='13' r='2' fill='currentColor' />
				<line x1='10' y1='8' x2='20' y2='8' stroke='currentColor' strokeWidth='1.5' />
				<path d='M18 5L22 8L18 11' stroke='currentColor' strokeWidth='1.5' fill='none' strokeLinecap='round' />
				<circle cx='28' cy='8' r='3' fill='currentColor' fillOpacity='0.3' stroke='currentColor' strokeWidth='1.5' />
			</svg>
		);
	}
	if (type === 'one-to-many') {
		return (
			<svg width='32' height='16' viewBox='0 0 32 16' fill='none' className='shrink-0'>
				<circle cx='4' cy='8' r='3' fill='currentColor' fillOpacity='0.3' stroke='currentColor' strokeWidth='1.5' />
				<line x1='8' y1='8' x2='20' y2='8' stroke='currentColor' strokeWidth='1.5' />
				<path d='M18 5L22 8L18 11' stroke='currentColor' strokeWidth='1.5' fill='none' strokeLinecap='round' />
				<circle cx='26' cy='3' r='2' fill='currentColor' />
				<circle cx='28' cy='8' r='2' fill='currentColor' />
				<circle cx='26' cy='13' r='2' fill='currentColor' />
			</svg>
		);
	}
	// many-to-many
	return (
		<svg width='32' height='16' viewBox='0 0 32 16' fill='none' className='shrink-0'>
			<circle cx='4' cy='3' r='2' fill='currentColor' />
			<circle cx='2' cy='8' r='2' fill='currentColor' />
			<circle cx='4' cy='13' r='2' fill='currentColor' />
			<line x1='8' y1='8' x2='24' y2='8' stroke='currentColor' strokeWidth='1.5' />
			<circle cx='28' cy='3' r='2' fill='currentColor' />
			<circle cx='30' cy='8' r='2' fill='currentColor' />
			<circle cx='28' cy='13' r='2' fill='currentColor' />
		</svg>
	);
}

function NoTableSelectedState() {
	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center p-6'>
			<div className='bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full'>
				<Table2 className='text-muted-foreground h-8 w-8' />
			</div>
			<h3 className='mb-1 text-lg font-semibold'>No table selected</h3>
			<p className='text-muted-foreground max-w-sm text-center text-sm'>
				Select a table from the sidebar to view and manage its relationships.
			</p>
		</div>
	);
}

export function RelationshipsView() {
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const stack = useCardStack();
	const { currentTable, currentSchema, currentDatabase } = useSchemaBuilderSelectors();
	const deleteForeignKeyMutation = useDeleteForeignKey();

	const tables = currentSchema?.tables || [];
	const databaseId = currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId ?? '';

	const { data: provisionsData } = useRelationProvisionsQuery({
		selection: {
			fields: {
				id: true,
				relationType: true,
				sourceTableId: true,
				targetTableId: true,
				outFieldId: true,
				outJunctionTableId: true,
				exposeInApi: true,
			},
			where: databaseId ? { databaseId: { equalTo: databaseId } } : undefined,
		},
		enabled: !!databaseId,
	});

	const provisions = useMemo<RelationProvisionInfo[]>(() => {
		const nodes = provisionsData?.relationProvisions?.nodes;
		if (!nodes) return [];
		return nodes.map((n) => ({
			id: n.id,
			relationType: n.relationType ?? null,
			sourceTableId: n.sourceTableId ?? null,
			targetTableId: n.targetTableId ?? null,
			outFieldId: n.outFieldId ?? null,
			outJunctionTableId: n.outJunctionTableId ?? null,
			exposeInApi: n.exposeInApi ?? null,
		}));
	}, [provisionsData]);

	const relationships = useMemo<TableRelationship[]>(
		() => getTableRelationships(currentTable, tables, provisions),
		[currentTable, tables, provisions],
	);

	const handleOpenCreate = () => {
		if (!currentTable) return;
		stack.push({
			id: 'relationship-new',
			title: 'Create Relationship',
			Component: RelationshipCard,
			props: {
				editingRelationship: null,
				sourceTable: currentTable,
			},
			width: 540,
		});
	};

	const handleOpenEdit = (rel: TableRelationship) => {
		const sourceTable = rel.sourceTable ?? currentTable;
		if (!sourceTable) return;
		stack.push({
			id: `relationship-edit-${rel.constraint.id}`,
			title: 'Edit Relationship',
			Component: RelationshipCard,
			props: {
				editingRelationship: rel,
				sourceTable,
			},
			width: 540,
		});
	};

	const handleDeleteRequest = (constraintId: string, constraintName: string) => {
		setDeleteTarget({ id: constraintId, name: constraintName });
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await deleteForeignKeyMutation.mutateAsync({ id: deleteTarget.id });
			toast.success({ message: 'Relationship deleted' });
			setDeleteTarget(null);
		} catch (error) {
			toast.error({
				message: 'Failed to delete relationship',
				description: error instanceof Error ? error.message : 'An error occurred',
			});
		} finally {
			setIsDeleting(false);
		}
	};

	// No table selected state
	if (!currentTable) {
		return <NoTableSelectedState />;
	}

	const hasRelationships = relationships.length > 0;

	function renderRelationshipCard(rel: TableRelationship) {
		const style = RELATIONSHIP_STYLES[rel.relationshipType];
		const isM2M = !!rel.withTableName;

		// Derive junction → target FK field name and target PK field name for M2M cards
		let junctionTargetFieldName: string | undefined;
		let targetPkFieldName: string | undefined;
		if (isM2M && rel.targetTable) {
			const junction = rel.targetTable; // For M2M, targetTable IS the junction
			const actualTarget = tables.find((t) => t.name === rel.withTableName);
			if (actualTarget) {
				const junctionFk = (junction.constraints || []).find(
					(c): c is ForeignKeyConstraint =>
						c.type === 'foreign_key' && c.referencedTable === actualTarget.id,
				);
				if (junctionFk) {
					junctionTargetFieldName = junction.fields.find((f) => f.id === junctionFk.fields[0])?.name;
					targetPkFieldName = actualTarget.fields.find((f) => f.id === junctionFk.referencedFields?.[0])?.name;
				}
			}
		}

		return (
			<div
				key={rel.constraint.id}
				role='button'
				tabIndex={0}
				data-testid='relationship-row'
				onClick={() => handleOpenEdit(rel)}
				onKeyDown={(event) => {
					handleActivationKeyDown(event, () => handleOpenEdit(rel));
				}}
				className={cn(
					'group relative cursor-pointer rounded-xl border p-4 transition-all duration-200',
					'border-border/60 hover:border-border/80 hover:bg-muted/30',
				)}
			>
				{/* Header: Name + Type Pill + Delete */}
				<div className='flex items-center justify-between gap-2'>
					<div className='flex min-w-0 flex-wrap items-center gap-2'>
						<Link2 className='text-muted-foreground h-4 w-4 shrink-0' />
						<p className='truncate text-sm font-semibold'>{rel.constraint.name}</p>
						<span
							className={cn(
								'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
								style.bg,
								style.text,
								'border',
								style.border,
							)}
						>
							{style.label}
						</span>
					</div>
					<Button
						variant='ghost'
						size='sm'
						aria-label='Delete relationship'
						className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0 p-0'
						onClick={(e) => {
							e.stopPropagation();
							handleDeleteRequest(rel.constraint.id, rel.constraint.name || 'this relationship');
						}}
					>
						<Trash2 className='h-4 w-4' />
					</Button>
				</div>

				{/* Source -> Target (M2M shows three-node path with junction) */}
				{isM2M ? (
					<div className='mt-3 space-y-2'>
						<div className='flex items-center gap-2'>
							<div className='bg-background truncate rounded-md border px-3 py-1.5 font-mono text-sm'>
								<span className='text-foreground'>{rel.sourceTable?.name || '?'}</span>
								<span className='text-muted-foreground'>.</span>
								<span className={style.text}>{rel.sourceFieldName || '?'}</span>
							</div>

							<span className={style.text}>
								<MiniConnector type='many-to-many' />
							</span>

							<div className='bg-muted/50 truncate rounded-md border border-dashed px-3 py-1.5 font-mono text-sm'>
								<span className='text-muted-foreground'>{rel.targetTable?.name || '?'}</span>
							</div>

							<span className={style.text}>
								<MiniConnector type='many-to-many' />
							</span>

							<div className='bg-background truncate rounded-md border px-3 py-1.5 font-mono text-sm'>
								<span className='text-foreground'>{rel.withTableName}</span>
								<span className='text-muted-foreground'>.</span>
								<span className={style.text}>{targetPkFieldName || 'id'}</span>
							</div>
						</div>

						<div className='text-muted-foreground flex items-center gap-1.5 pl-1 font-mono text-[10px]'>
							<span>via</span>
							<span className='bg-muted rounded px-1.5 py-0.5'>{rel.targetFieldName || '?'}</span>
							<span>&</span>
							<span className='bg-muted rounded px-1.5 py-0.5'>{junctionTargetFieldName || '?'}</span>
						</div>
					</div>
				) : (
					<div className='mt-3 flex items-center gap-3'>
						<div className='bg-background truncate rounded-md border px-3 py-1.5 font-mono text-sm'>
							<span className='text-foreground'>{rel.sourceTable?.name || '?'}</span>
							<span className='text-muted-foreground'>.</span>
							<span className={style.text}>{rel.sourceFieldName || '?'}</span>
						</div>

						<span className={style.text}>
							<MiniConnector type={rel.relationshipType} />
						</span>

						<div className='bg-background truncate rounded-md border px-3 py-1.5 font-mono text-sm'>
							<span className='text-foreground'>{rel.targetTable?.name || '?'}</span>
							<span className='text-muted-foreground'>.</span>
							<span className={style.text}>{rel.targetFieldName || '?'}</span>
						</div>
					</div>
				)}

				{/* Footer: FK Actions */}
				<div className='mt-3 flex items-center justify-between gap-4 border-t pt-3'>
					<div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
						<CornerDownRight className='h-3 w-3' />
						<span>On Delete:</span>
						<span className='text-foreground/70 font-medium'>{ForeignKeyActionLabels[rel.constraint.onDelete ?? ForeignKeyActions.NO_ACTION]}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<div
				data-chat-component='relationships-view'
				data-chat-relationship-count={String(relationships.length)}
				className='flex min-h-0 flex-1 flex-col overflow-auto p-6'
			>
				{!hasRelationships ? (
					<RelationshipEmptyState onCreateClick={handleOpenCreate} tableName={currentTable.name} />
				) : (
					<div className='mx-auto w-full min-w-80 max-w-4xl space-y-6'>
						<div className='flex items-center justify-between gap-4'>
							<div>
								<h2 className='text-xl font-semibold tracking-tight'>Relationships</h2>
								<p className='text-muted-foreground mt-1 text-sm'>
									{relationships.length} connection{relationships.length !== 1 ? 's' : ''} for{' '}
									<code className='bg-muted rounded px-1.5 py-0.5 font-mono text-xs'>{currentTable.name}</code>
								</p>
							</div>
							<Button onClick={handleOpenCreate}>
								<Link2 className='mr-2 h-4 w-4' />
								Add Relationship
							</Button>
						</div>

						<div className='space-y-3'>
							{relationships.map(renderRelationshipCard)}
						</div>
					</div>
				)}
			</div>

			<DeleteConfirmDialog
				entityType='Relationship'
				entityName={deleteTarget?.name ?? null}
				open={!!deleteTarget}
				onOpenChange={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				isPending={isDeleting}
			/>
		</>
	);
}
