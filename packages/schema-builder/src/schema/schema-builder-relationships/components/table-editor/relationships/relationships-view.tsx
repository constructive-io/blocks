'use client';

import { useMemo, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { useCardStack } from '@constructive-io/ui/stack';
import { toast } from '@constructive-io/ui/toast';
import { Link2 } from 'lucide-react';

import { useRelationProvisionsQuery } from '@/generated/modules/hooks/queries/useRelationProvisionsQuery';
import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useDeleteForeignKey } from '../../../lib/gql/hooks/schema-builder/use-relationship-mutations';
import {
	type ForeignKeyConstraint,
	ForeignKeyActionLabels,
	ForeignKeyActions,
	type RelationshipType,
	type TableDefinition,
} from '@/blocks/schema/schema-builder-core/lib/schema';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';

import { DeleteConfirmDialog } from '@/blocks/schema/schema-builder-core/components/table-editor/delete-confirm-dialog';
import {
	CardDeleteButton,
	EditorView,
	editorCardClass,
	InlineCode,
	KindBadge,
	linkedChipClass,
	NoTableSelectedState,
} from '@/blocks/schema/schema-builder-core/components/table-editor/editor-view';
import { RelationshipCard } from './relationship-card';
import { RelationshipEmptyState } from './relationship-empty-state';
import {
	getTableRelationships,
	type RelationProvisionInfo,
	type TableRelationship,
} from './relationship-utils';

// Keep color choices in sync with TYPE_OPTIONS in relationship-type-selector.tsx
const RELATIONSHIP_STYLES: Record<RelationshipType, { badge: string; text: string; label: string }> = {
	'one-to-one': {
		badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
		text: 'text-purple-600 dark:text-purple-400',
		label: 'One to one',
	},
	'belongs-to': {
		badge: 'bg-green-500/10 text-green-700 dark:text-green-300',
		text: 'text-green-600 dark:text-green-400',
		label: 'Belongs to',
	},
	'one-to-many': {
		badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
		text: 'text-blue-600 dark:text-blue-400',
		label: 'One to many',
	},
	'many-to-many': {
		badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
		text: 'text-amber-600 dark:text-amber-400',
		label: 'Many to many',
	},
};

// Mini connector icons for list view — uses currentColor so Tailwind dark: classes work
function MiniConnector({ type }: { type: RelationshipType }) {
	if (type === 'one-to-one') {
		return (
			<svg aria-hidden='true' width='28' height='14' viewBox='0 0 32 16' fill='none' className='shrink-0'>
				<circle cx='4' cy='8' r='3' fill='currentColor' fillOpacity='0.3' stroke='currentColor' strokeWidth='1.5' />
				<line x1='8' y1='8' x2='24' y2='8' stroke='currentColor' strokeWidth='1.5' strokeDasharray='2 2' />
				<circle cx='28' cy='8' r='3' fill='currentColor' fillOpacity='0.3' stroke='currentColor' strokeWidth='1.5' />
			</svg>
		);
	}
	if (type === 'belongs-to') {
		return (
			<svg aria-hidden='true' width='28' height='14' viewBox='0 0 32 16' fill='none' className='shrink-0'>
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
			<svg aria-hidden='true' width='28' height='14' viewBox='0 0 32 16' fill='none' className='shrink-0'>
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
		<svg aria-hidden='true' width='28' height='14' viewBox='0 0 32 16' fill='none' className='shrink-0'>
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
		return <NoTableSelectedState icon={Link2} subject='relationships' />;
	}

	const hasRelationships = relationships.length > 0;

	return (
		<>
			{!hasRelationships ? (
				<div className='flex min-h-0 flex-1 flex-col overflow-auto p-6'>
					<RelationshipEmptyState onCreateClick={handleOpenCreate} tableName={currentTable.name} />
				</div>
			) : (
				<EditorView
					actions={
						<Button onClick={handleOpenCreate} size='sm'>
							<Link2 aria-hidden='true' data-icon='inline-start' />
							Add relationship
						</Button>
					}
					data-chat-component='relationships-view'
					data-chat-relationship-count={String(relationships.length)}
					description={
						<>
							{relationships.length} connection{relationships.length !== 1 ? 's' : ''} for <InlineCode>{currentTable.name}</InlineCode>
						</>
					}
					title='Relationships'
				>
					<ul className='flex flex-col gap-2'>
						{relationships.map((rel) => (
							<RelationshipRow
								key={rel.constraint.id}
								onDelete={() => handleDeleteRequest(rel.constraint.id, rel.constraint.name || 'this relationship')}
								onOpen={() => handleOpenEdit(rel)}
								relationship={rel}
								tables={tables}
							/>
						))}
					</ul>
				</EditorView>
			)}

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

type LinkEnd = 'source' | 'junction' | 'target';

/** Which end of a connection a chip is: the hovered one, a lit counterpart, or at rest. */
function chipState(hovered: LinkEnd | null, end: LinkEnd) {
	if (hovered === null) return 'idle' as const;
	return hovered === end ? ('source' as const) : ('linked' as const);
}

function TableChip({
	table,
	field,
	fieldClass,
	end,
	hovered,
	onHover,
	muted = false,
}: {
	table: string;
	field?: string;
	fieldClass: string;
	end: LinkEnd;
	hovered: LinkEnd | null;
	onHover: (end: LinkEnd | null) => void;
	muted?: boolean;
}) {
	const state = chipState(hovered, end);
	return (
		<span
			className={cn(linkedChipClass(state), muted && state === 'idle' && 'bg-transparent ring-0 outline-1 -outline-offset-1 outline-dashed outline-foreground/20')}
			onPointerEnter={() => onHover(end)}
			onPointerLeave={() => onHover(null)}
		>
			<span className={cn('truncate', state === 'linked' ? 'text-primary' : muted ? 'text-muted-foreground' : 'text-foreground')}>
				{table}
			</span>
			{field ? (
				<>
					<span className='text-muted-foreground'>.</span>
					<span className={cn('truncate', fieldClass)}>{field}</span>
				</>
			) : null}
		</span>
	);
}

/**
 * One foreign key as a card: its name and type, the joined ends as chips,
 * and the delete rule. Pointing at one end lights the other end (and the
 * connector) in the Constructive blue, so the pair reads at a glance.
 */
function RelationshipRow({
	relationship: rel,
	tables,
	onOpen,
	onDelete: onDeleteRequest,
}: {
	relationship: TableRelationship;
	tables: TableDefinition[];
	onOpen: () => void;
	onDelete: () => void;
}) {
	const [hovered, setHovered] = useState<LinkEnd | null>(null);
	const style = RELATIONSHIP_STYLES[rel.relationshipType];
	const isM2M = Boolean(rel.withTableName);
	const connectorClass = cn('shrink-0', hovered ? 'text-primary' : style.text);
	const onDelete = (
		<>
			On delete <span className='text-foreground/80'>{ForeignKeyActionLabels[rel.constraint.onDelete ?? ForeignKeyActions.NO_ACTION]}</span>
		</>
	);

	// Many-to-many cards show the far table and the junction's two keys.
	let junctionTargetFieldName: string | undefined;
	let targetPkFieldName: string | undefined;
	if (isM2M && rel.targetTable) {
		const junction = rel.targetTable;
		const actualTarget = tables.find((t) => t.name === rel.withTableName);
		const junctionFk = actualTarget
			? (junction.constraints || []).find(
					(c): c is ForeignKeyConstraint => c.type === 'foreign_key' && c.referencedTable === actualTarget.id,
				)
			: undefined;
		if (actualTarget && junctionFk) {
			junctionTargetFieldName = junction.fields.find((f) => f.id === junctionFk.fields[0])?.name;
			targetPkFieldName = actualTarget.fields.find((f) => f.id === junctionFk.referencedFields?.[0])?.name;
		}
	}

	return (
		<li>
			<div
				className={editorCardClass}
				data-testid='relationship-row'
				onClick={onOpen}
				onKeyDown={(event) => handleActivationKeyDown(event, onOpen)}
				role='button'
				tabIndex={0}
			>
				<div className='flex items-center gap-2'>
					<Link2 aria-hidden='true' className='text-muted-foreground size-3.5 shrink-0' />
					<p className='text-foreground min-w-0 truncate text-[13px] font-medium'>{rel.constraint.name}</p>
					<KindBadge className={style.badge}>{style.label}</KindBadge>
					<span className='text-muted-foreground ml-auto hidden shrink-0 text-xs sm:inline'>{onDelete}</span>
					<CardDeleteButton label='Delete relationship' onDelete={onDeleteRequest} />
				</div>

				<div className='mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5'>
					<TableChip
						end='source'
						field={rel.sourceFieldName || '?'}
						fieldClass={style.text}
						hovered={hovered}
						onHover={setHovered}
						table={rel.sourceTable?.name || '?'}
					/>
					<span className={connectorClass}>
						<MiniConnector type={isM2M ? 'many-to-many' : rel.relationshipType} />
					</span>
					{isM2M ? (
						<>
							<TableChip
								end='junction'
								fieldClass={style.text}
								hovered={hovered}
								muted
								onHover={setHovered}
								table={rel.targetTable?.name || '?'}
							/>
							<span className={connectorClass}>
								<MiniConnector type='many-to-many' />
							</span>
							<TableChip
								end='target'
								field={targetPkFieldName || 'id'}
								fieldClass={style.text}
								hovered={hovered}
								onHover={setHovered}
								table={rel.withTableName ?? '?'}
							/>
						</>
					) : (
						<TableChip
							end='target'
							field={rel.targetFieldName || '?'}
							fieldClass={style.text}
							hovered={hovered}
							onHover={setHovered}
							table={rel.targetTable?.name || '?'}
						/>
					)}
				</div>

				{isM2M ? (
					<p className='text-muted-foreground mt-2 flex items-center gap-1 text-[11px]'>
						via
						<span className='bg-muted/70 rounded px-1 font-mono'>{rel.targetFieldName || '?'}</span>
						and
						<span className='bg-muted/70 rounded px-1 font-mono'>{junctionTargetFieldName || '?'}</span>
					</p>
				) : null}
				<p className='text-muted-foreground mt-2 text-xs sm:hidden'>{onDelete}</p>
			</div>
		</li>
	);
}
