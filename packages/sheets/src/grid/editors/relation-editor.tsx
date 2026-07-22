import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Link, Loader2, Search, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useSheetsTable, sheetsTableQueryKeys } from '../../hooks/use-sheets-table';
import { useSheetsTableCursor } from '../../hooks/use-sheets-table-cursor';
import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsMeta } from '../../hooks/use-sheets-meta';
import { useSheetsStore } from '../../store/sheets-store';
import { sheetsQueryKeys } from '../../hooks/query-keys';
import { cn } from '../../utils/cn';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import { Label } from '@constructive-io/ui/label';
import { toast } from '@constructive-io/ui/toast';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';
import { OverlayMeasureContext } from './overlay-viewport-guard';
import { RelationRecordTooltip } from './relation-record-tooltip';
import { sheetsLogger } from '../../utils/sheets-logger';

type RelationKind = 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';

/** Data passed to onSaveComplete for optimistic updates */
export interface RelationSaveData {
	/** The selected record(s) - single object for belongsTo/hasOne, array for hasMany/manyToMany */
	relationData: unknown;
	/** The foreign key value (ID) for belongsTo relations */
	foreignKeyValue: unknown;
}

interface RelationEditorProps {
	/** Ignored — the editor reads {@link RelationEditorProps.currentValue} instead. */
	value?: unknown;
	onFinishedEditing: (next?: unknown) => void;
	tableName: string;
	recordId?: string | number | null;
	fieldName: string;
	currentValue: unknown;
	/** Called after successful save with data for optimistic updates */
	onSaveComplete?: (data: RelationSaveData) => void;
}

/**
 * Normalises a relation value into a flat array of record objects.
 *
 * The editor-registry already wraps bare FK strings into `{ id }` before
 * passing them here, but this function also handles that case defensively
 * so the editor works correctly if called from other code paths.
 */
function coerceToArray(v: unknown): any[] {
	if (v == null) return [];
	if (Array.isArray(v)) return v;
	if (typeof v === 'object') {
		const obj = v as Record<string, unknown>;
		if (Array.isArray(obj.nodes)) return obj.nodes;
		return [v];
	}
	// Bare string (e.g. a UUID FK value) -- wrap as { id } defensively
	if (typeof v === 'string' && v) return [{ id: v }];
	return [];
}

const DISPLAY_FIELDS = ['name', 'title', 'label', 'displayName', 'fullName', 'email', 'username', 'description', 'code'];

function getRelationDisplayText(relation: any): string {
	if (!relation || typeof relation !== 'object') {
		return String(relation || '');
	}

	// Try common display field patterns
	for (const field of DISPLAY_FIELDS) {
		if (relation[field] != null && String(relation[field]).trim()) {
			return String(relation[field]);
		}
	}

	// Fallback to ID
	if (relation.id != null) {
		return `Record ${relation.id}`;
	}

	return 'Unknown Record';
}

export const RelationEditor: React.FC<RelationEditorProps> = ({
	onFinishedEditing,
	tableName,
	recordId,
	fieldName,
	currentValue,
	onSaveComplete,
}) => {
	const { data: meta } = useSheetsMeta();
	const { scopeKey } = useSheetsContext();
	const queryClient = useQueryClient();
	const ensureRelationInfo = useSheetsStore((s) => s.ensureRelationInfo);
	const relationInfoForTable = useSheetsStore((s) => tableName ? s.relationInfoCache[tableName] : undefined);

	const relationEntry = relationInfoForTable?.[fieldName];
	const isDraft = typeof recordId === 'string' && recordId.startsWith('draft:');

	// Resolve relation kind/table from global cache
	useEffect(() => {
		if (!tableName) return;
		if (relationInfoForTable?.[fieldName]) return;
		ensureRelationInfo(tableName, meta);
	}, [tableName, fieldName, meta, ensureRelationInfo, relationInfoForTable]);

	const relationDef = useMemo(() => {
		const entry = relationEntry;
		if (!entry) return null as null | { kind: RelationKind; relatedTable?: string };
		return { kind: entry.kind as RelationKind, relatedTable: entry.relatedTable };
	}, [relationEntry]);

	const isMulti = relationDef?.kind === 'hasMany' || relationDef?.kind === 'manyToMany';
	const relatedTableName = relationDef?.relatedTable;
	const isManyToMany = relationDef?.kind === 'manyToMany';
	const requiredMetaMissing = useMemo(() => {
		if (!relationEntry) return true;
		if (isDraft) {
			// Draft rows only support belongsTo (picks FK locally, no server mutation needed)
			if (relationEntry.kind !== 'belongsTo') return true;
			return !relationEntry.relatedTable || !relationEntry.foreignKeyField;
		}
		if (recordId == null) return true;
		if (!relationEntry.relatedTable) return true;
		switch (relationEntry.kind) {
			case 'belongsTo':
				return !relationEntry.foreignKeyField;
			case 'hasOne':
			case 'hasMany':
				return !relationEntry.foreignKeyField;
			case 'manyToMany':
				return !(
					relationEntry.junctionTable &&
					relationEntry.junctionLeftKeyField &&
					relationEntry.junctionRightKeyField
				);
			default:
				return true;
		}
	}, [relationEntry, recordId, isDraft]);

	const canPersist = Boolean(relationEntry && !requiredMetaMissing);

	const { maxHeight: overlayMaxHeight } = useContext(OverlayMeasureContext);

	// Measure actual fixed UI height from the DOM, then distribute remaining
	// scroll budget between the two sections. The overlay is invisible during
	// mount (Web Animation opacity:0), so the measurement + re-render is hidden.
	const editorRef = useRef<HTMLDivElement>(null);
	const currentScrollRef = useRef<HTMLDivElement>(null);
	const [scrollBudgets, setScrollBudgets] = useState<{ current?: number; addFrom?: number }>({});

	useLayoutEffect(() => {
		const editor = editorRef.current;
		const currentScroll = currentScrollRef.current;
		const addFromScroll = scrollContainerRef.current;
		if (!editor || !currentScroll || !addFromScroll || overlayMaxHeight <= 0) return;

		const measuredFixedUI = editor.scrollHeight - currentScroll.scrollHeight - addFromScroll.scrollHeight;
		const budget = Math.max(0, overlayMaxHeight - measuredFixedUI);

		setScrollBudgets({
			current: Math.floor(budget * 0.35),
			addFrom: Math.floor(budget * 0.65),
		});
	}, [overlayMaxHeight]);

	// Current selected relations
	const initialSelection = useMemo(() => coerceToArray(currentValue), [currentValue]);
	const [editingValue, setEditingValue] = useState<any[]>(initialSelection);
	const [searchQuery, setSearchQuery] = useState('');

	// Refs for values read inside async handleSave (prevents stale closures)
	const editingValueRef = useRef(editingValue);
	editingValueRef.current = editingValue;
	const initialSelectionRef = useRef(initialSelection);
	initialSelectionRef.current = initialSelection;

	// Safety net: close the editor if the row context switches while the overlay is open.
	// This can happen if Glide re-invokes provideEditor with a reordered data array,
	// causing the editor to receive a different recordId without unmounting.
	// Use ref for onFinishedEditing to avoid re-subscribing on every render
	// (Glide's callback is unstable). See: advanced-event-handler-refs.
	const onFinishedEditingRef = useRef(onFinishedEditing);
	onFinishedEditingRef.current = onFinishedEditing;
	const initialRecordIdRef = useRef(recordId);
	useEffect(() => {
		if (initialRecordIdRef.current != null && recordId != null && initialRecordIdRef.current !== recordId) {
			onFinishedEditingRef.current();
		}
	}, [recordId]);

	/** Set of selected record IDs for O(1) lookup */
	const selectedIdSet = useMemo(() => {
		const set = new Set<string | number>();
		for (const r of editingValue) {
			const id = r?.id;
			if (id != null) set.add(id);
		}
		return set;
	}, [editingValue]);

	// Display candidates from global cache
	const displayCandidates = useMemo(() => {
		const entry = relationEntry;
		return entry?.displayCandidates?.length ? entry.displayCandidates : ['name', 'displayName', 'fullName', 'title'];
	}, [relationEntry]);

	// Query related table options
	const whereFilter = useMemo(() => {
		if (!searchQuery.trim() || displayCandidates.length === 0) return undefined;
		const includesFilters = displayCandidates.map((f) => ({ [f]: { includesInsensitive: searchQuery } }));
		return { or: includesFilters } as any;
	}, [searchQuery, displayCandidates]);

	const {
		data: options = [],
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		totalCount: optionsTotalCount,
	} = useSheetsTableCursor(relatedTableName || '', {
		enabled: !!relatedTableName,
		select: 'all',
		pageSize: 20,
		where: whereFilter,
	});

	const { data: junctionRows = [], isLoading: isJunctionLoading } = useSheetsTable(relationEntry?.junctionTable || '', {
		enabled:
			canPersist &&
			isManyToMany &&
			recordId != null &&
			!!relationEntry?.junctionTable &&
			!!relationEntry?.junctionLeftKeyField,
		select:
			relationEntry?.junctionLeftKeyField && relationEntry?.junctionRightKeyField
				? {
					select: ['id', relationEntry.junctionLeftKeyField, relationEntry.junctionRightKeyField],
				}
				: 'minimal',
		limit: 500,
		where:
			relationEntry?.junctionLeftKeyField && recordId != null
				? ({ [relationEntry.junctionLeftKeyField]: { equalTo: recordId } } as any)
				: undefined,
	}) as any;

	const parentTable = useSheetsTable(tableName, { enabled: false }) as any;
	const relatedTable = useSheetsTable(relatedTableName || '', { enabled: false }) as any;
	const junctionTable = useSheetsTable(relationEntry?.junctionTable || '', { enabled: false }) as any;

	const [isSaving, setIsSaving] = useState(false);

	// IntersectionObserver sentinel for "load more" in the "Add from" list
	const sentinelRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const sentinel = sentinelRef.current;
		const root = scrollContainerRef.current;
		if (!sentinel || !root || !hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) fetchNextPage();
			},
			{ root, rootMargin: '100px', threshold: 0 },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Ref for junctionRows read inside async handler
	const junctionRowsRef = useRef(junctionRows);
	junctionRowsRef.current = junctionRows;

	const handleSave = useCallback(() => {
		void (async () => {
			if (!relationEntry || recordId == null) {
				onFinishedEditing();
				return;
			}
			if (!canPersist) {
				onFinishedEditing();
				return;
			}

			const getRecordId = (r: any): string | number | null => {
				if (r == null) return null;
				if (typeof r === 'string' || typeof r === 'number') return r;
				if (typeof r === 'object' && (typeof r.id === 'string' || typeof r.id === 'number')) return r.id;
				return null;
			};

			// Read current values from refs to avoid stale closures
			const currentEditing = editingValueRef.current;
			const currentInitial = initialSelectionRef.current;

			setIsSaving(true);
			try {
				const initialIds = new Set(currentInitial.map(getRecordId).filter((id): id is string | number => id != null));
				const nextIds = new Set(currentEditing.map(getRecordId).filter((id): id is string | number => id != null));

				if (relationEntry.kind === 'belongsTo') {
					const selectedId = Array.from(nextIds)[0] ?? null;
					const fkField = relationEntry.foreignKeyField;
					if (!fkField) throw new Error('Missing foreignKeyField for belongsTo relation');

					if (isDraft) {
						onSaveComplete?.({ relationData: currentEditing[0] ?? null, foreignKeyValue: selectedId });
						onFinishedEditing();
						return;
					}

					await parentTable.update(recordId, { [fkField]: selectedId });
					onSaveComplete?.({
						relationData: currentEditing[0] ?? null,
						foreignKeyValue: selectedId,
					});
					onFinishedEditing();
					return;
				}

				if (relationEntry.kind === 'hasOne') {
					const fkField = relationEntry.foreignKeyField;
					if (!fkField) throw new Error('Missing foreignKeyField for hasOne relation');
					const prevId = Array.from(initialIds)[0] ?? null;
					const nextId = Array.from(nextIds)[0] ?? null;

					// Parallelize independent unlink/link mutations
					const mutations: Promise<unknown>[] = [];
					if (prevId && prevId !== nextId) {
						mutations.push(relatedTable.update(prevId, { [fkField]: null }));
					}
					if (nextId && nextId !== prevId) {
						mutations.push(relatedTable.update(nextId, { [fkField]: recordId }));
					}
					if (mutations.length > 0) await Promise.all(mutations);

					await Promise.all([
						queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) }),
						queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.cursorTable(scopeKey, relatedTableName || '') }),
					]);
					onSaveComplete?.({
						relationData: currentEditing[0] ?? null,
						foreignKeyValue: null,
					});
					onFinishedEditing();
					return;
				}

				if (relationEntry.kind === 'hasMany') {
					const fkField = relationEntry.foreignKeyField;
					if (!fkField) throw new Error('Missing foreignKeyField for hasMany relation');
					const toAdd = Array.from(nextIds).filter((id) => !initialIds.has(id));
					const toRemove = Array.from(initialIds).filter((id) => !nextIds.has(id));

					await Promise.all([
						...toAdd.map((id) => relatedTable.update(id, { [fkField]: recordId })),
						...toRemove.map((id) => relatedTable.update(id, { [fkField]: null })),
					]);
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) }),
						queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.cursorTable(scopeKey, relatedTableName || '') }),
					]);
					onSaveComplete?.({
						relationData: currentEditing,
						foreignKeyValue: null,
					});
					onFinishedEditing();
					return;
				}

				if (relationEntry.kind === 'manyToMany') {
					const jt = relationEntry.junctionTable;
					const leftFk = relationEntry.junctionLeftKeyField;
					const rightFk = relationEntry.junctionRightKeyField;
					if (!jt || !leftFk || !rightFk) throw new Error('Missing junction metadata for manyToMany relation');

					const toAdd = Array.from(nextIds).filter((id) => !initialIds.has(id));
					const toRemove = Array.from(initialIds).filter((id) => !nextIds.has(id));

					const rows: any[] = Array.isArray(junctionRowsRef.current) ? junctionRowsRef.current : [];
					const byRight = new Map<string | number, any>();
					rows.forEach((r) => {
						const rightId = r?.[rightFk];
						if (rightId != null) byRight.set(rightId, r);
					});

					await Promise.all([
						...toAdd.map((id) => junctionTable.create({ [leftFk]: recordId, [rightFk]: id })),
						...toRemove
							.map((id) => byRight.get(id))
							.filter((row) => row && (row.id != null || (row[leftFk] != null && row[rightFk] != null)))
							.map((row) => row.id != null
								? junctionTable.delete(row.id)
								: junctionTable.delete({ [leftFk]: row[leftFk], [rightFk]: row[rightFk] })
							),
					]);
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, tableName) }),
						queryClient.invalidateQueries({ queryKey: sheetsTableQueryKeys.table(scopeKey, jt) }),
						queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.cursorTable(scopeKey, relatedTableName || '') }),
					]);
					onSaveComplete?.({
						relationData: currentEditing,
						foreignKeyValue: null,
					});
					onFinishedEditing();
					return;
				}

				onFinishedEditing();
			} catch (err) {
				sheetsLogger().error('[relation-editor] save failed:', err);
				toast.error({ message: err instanceof Error ? err.message : 'Failed to save relation' });
			} finally {
				setIsSaving(false);
			}
		})();
	}, [
		canPersist,
		onFinishedEditing,
		onSaveComplete,
		recordId,
		relationEntry,
		relatedTable,
		junctionTable,
		parentTable,
		queryClient,
		tableName,
		scopeKey,
		isDraft,
	]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	const handleRemoveRelation = useCallback(
		(index: number) => {
			if (!canPersist || isSaving) return;
			setEditingValue((prev) => prev.filter((_, i) => i !== index));
		},
		[canPersist, isSaving],
	);

	const togglePick = useCallback(
		(record: any) => {
			if (!canPersist || isSaving) return;
			setEditingValue((prev) => {
				const id = record?.id;
				if (id != null) {
					const exists = prev.some((r) => r?.id === id);
					if (exists) return prev.filter((r) => r?.id !== id);
				} else {
					const key = JSON.stringify(record);
					const exists = prev.some((r) => JSON.stringify(r) === key);
					if (exists) return prev.filter((r) => JSON.stringify(r) !== key);
				}
				if (isMulti) return [...prev, record];
				return [record];
			});
		},
		[canPersist, isMulti, isSaving],
	);

	// Handle Ctrl+Enter to save
	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				if (canPersist && !isSaving) handleSave();
			}
		},
		[canPersist, handleSave, isSaving],
	);

	return (
		<div ref={editorRef}>
		<EditorFocusTrap
      onEscape={handleCancel}
      onKeyDown={handleEditorKeyDown}
      className={`bg-popover flex ${OVERLAY.md} flex-col gap-4 rounded-lg border p-4 shadow-lg`}
    >
			{/* Header */}
			<div className='flex items-center gap-2'>
				<Link className='text-muted-foreground h-4 w-4' />
				<h3 className='text-sm font-medium'>{canPersist ? 'Edit Relations' : 'Related Records'}</h3>
				{isMulti && editingValue.length > 0 && (
					<Badge variant='secondary' size='sm' className='ml-auto tabular-nums'>
						{editingValue.length}
					</Badge>
				)}
			</div>

			{/* Current Relations */}
			<div className='space-y-2'>
				<div className='flex items-center gap-2'>
					<Label className='text-muted-foreground text-xs'>Current Relations</Label>
					{editingValue.length > 0 && (
						<Badge variant='outline' size='sm' className='tabular-nums'>
							{editingValue.length}
						</Badge>
					)}
				</div>
				<div ref={currentScrollRef} className='rounded-md border' style={{ maxHeight: scrollBudgets.current, overflowY: 'auto' }}>
					<div className='space-y-2 p-2'>
						{editingValue.length === 0 ? (
							<div className='text-muted-foreground py-4 text-center text-sm'>No relations linked</div>
						) : (
							editingValue.map((relation, index) => {
								const displayText = getRelationDisplayText(relation);
								return (
									<div key={index} className='bg-muted flex items-center gap-2 rounded-md p-2'>
										<RelationRecordTooltip record={relation} />
										<span className='min-w-0 flex-1 truncate text-sm'>{displayText}</span>
										<Badge variant='outline' className='text-2xs shrink-0'>
											{String(relation.id || index + 1).slice(0, 8)}
										</Badge>
										<Button
											variant='ghost'
											size='sm'
											onClick={() => handleRemoveRelation(index)}
											disabled={!canPersist}
											className='text-muted-foreground hover:text-destructive h-6 w-6 shrink-0 p-0'
										>
											<X className='h-3 w-3' />
										</Button>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>

					<div className='flex flex-col space-y-2'>
					<Label htmlFor='search' className='flex items-center gap-1 text-muted-foreground text-xs'>
						<span>Add from</span>
						<Badge variant='outline' size='sm' className='px-1'>{relationEntry?.displayName || relatedTableName || 'related'}</Badge>
						{optionsTotalCount > 0 && (
							<Badge variant='secondary' size='sm' className='ml-auto tabular-nums'>
								{options.length} / {optionsTotalCount}
							</Badge>
						)}
					</Label>

					<InputGroup>
						<InputGroupAddon>
							<Search />
						</InputGroupAddon>
						<InputGroupInput
							id='search'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder='Type to search...'
							size='sm'
						/>
					</InputGroup>

					<div ref={scrollContainerRef} className='rounded-md border' style={{ maxHeight: scrollBudgets.addFrom, overflowY: 'auto' }}>
						<div data-testid='relation-options' className='space-y-1 p-2'>
							{(isLoading || (isManyToMany && isJunctionLoading)) && (
								<div className='text-muted-foreground py-6 text-center text-sm'>Loading...</div>
							)}
							{!isLoading && options.length === 0 && (
								<div className='text-muted-foreground py-6 text-center text-sm'>No records found</div>
							)}
							{options.map((row: any) => {
								const id = row?.id ?? JSON.stringify(row);
								const label = getRelationDisplayTextFromCandidates(row, displayCandidates);
								const active = row?.id != null ? selectedIdSet.has(row.id) : editingValue.some((r) => JSON.stringify(r) === id);
							const disabled = !canPersist || isSaving;
								return (
								<div
										key={id}
									role='button'
									tabIndex={disabled ? -1 : 0}
									aria-disabled={disabled}
									onClick={() => {
										if (disabled) return;
										togglePick(row);
									}}
									onKeyDown={(e) => {
										if (disabled) return;
										if (e.key !== 'Enter' && e.key !== ' ') return;
										e.preventDefault();
										togglePick(row);
									}}
										className={cn(
										'w-full rounded-md px-2 py-1.5 text-left',
										!disabled && 'hover:bg-accent/50 cursor-pointer',
										disabled && 'cursor-not-allowed opacity-50',
											active && 'bg-accent/60',
										)}
									>
										<div className='flex items-center gap-2'>
											<RelationRecordTooltip record={row} />
											<span className='min-w-0 flex-1 truncate text-sm'>{label}</span>
											{active && <Check className='text-primary h-3.5 w-3.5 shrink-0' />}
											<Badge variant='outline' className={cn('text-2xs shrink-0', active && 'border-primary/40 text-primary')}>
												{String(row?.id ?? '\u2014').slice(0, 8)}
											</Badge>
										</div>
								</div>
								);
							})}
							{hasNextPage && (
								<div ref={sentinelRef} className='flex justify-center py-2'>
									{isFetchingNextPage ? (
										<Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
									) : (
										<span className='text-muted-foreground text-xs'>Scroll for more</span>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

			<div className='flex justify-end gap-2'>
				<Button variant='outline' size='sm' onClick={handleCancel} disabled={isSaving}>
					<X className='mr-1 h-3 w-3' />
					{canPersist ? 'Cancel' : 'Close'}
				</Button>
				{canPersist && (
					<Button size='sm' onClick={handleSave} disabled={isSaving || isLoading || (isManyToMany && isJunctionLoading)}>
						<Check className='mr-1 h-3 w-3' />
						Save
					</Button>
				)}
			</div>
		</EditorFocusTrap>
		</div>
	);
};

function getRelationDisplayTextFromCandidates(row: any, candidates: string[]): string {
	if (!row || typeof row !== 'object') return String(row ?? '');
	for (const c of candidates) {
		if (row[c] != null && String(row[c]).trim()) return String(row[c]);
	}
	if ('id' in row) return `Record ${row.id}`;
	return 'Unknown Record';
}
