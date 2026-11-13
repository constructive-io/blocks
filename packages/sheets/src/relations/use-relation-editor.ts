/**
 * The state and actions of editing one relation of one record, shared by the
 * grid's cell editor and the record panel's relation section. Driven only by
 * the relation model: belongsTo writes the record's local key fields,
 * hasOne/hasMany write the related records' key fields, manyToMany creates
 * and deletes junction rows. Nothing is written until `save`; a failure keeps
 * the user's choices with the server's message; after a write the affected
 * tables refetch.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { RelationModel, TableModel } from '@constructive-io/data';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import { equalityFilterGroup } from '../grid/filters/equality-filter';
import { sheetsQueryKeys } from '../hooks/query-keys';
import { useTableModel } from '../hooks/use-table-model';
import type { SheetsRowIdentifier } from '../row-identity';
import { relationEditCapability, type RelationEditCapability } from './relation-capability';
import {
	adapterChangeRunner,
	applyRelationChanges,
	describeFailures,
	planBelongsTo,
	planHasLinks,
	planJunctionLinks,
	type LinkedRecord,
	type RelationPlan,
} from './relation-changes';
import { planRelatedCreate, type RelatedCreatePlan } from './relation-create';
import {
	belongsToClearPatch,
	belongsToCurrentKey,
	belongsToLinkPatch,
	fieldValues,
	hasLinkOwner,
	junctionLeftValues,
	linkKey,
	type FieldValues,
	type RecordValues,
} from './relation-keys';
import { relationRecordLabel } from './relation-label';
import { useOpenRecordHandler, useOpenTableHandler, type SheetsOpenRecordHandler } from './relation-navigation';
import { searchClauses, searchFilter } from './relation-search';
import { useModelPages, type ModelPages } from './use-model-pages';
import { useRelationLinks, type RelationLinks } from './use-relation-links';
import { useRelationSelection, type RelationSelection } from './use-relation-selection';

export interface RelationEditorOptions {
	relation: RelationModel;
	/** The record's table. */
	table: TableModel;
	/** The record (server row or draft values), or null when it is not known. */
	row: RecordValues | null;
	/** The saved record's primary key, or null for a draft or a record that cannot be identified. */
	rowIdentifier: SheetsRowIdentifier | null;
	/** True for a record that does not exist on the server yet. */
	isDraft: boolean;
	/** The value of the relation field on the record. */
	value: unknown;
	/** Ask the host to refetch after an out-of-band write. */
	onInvalidateData?: () => void;
	/** A reason the host already holds for keeping the relation read-only (it wins over the model's rules). */
	readOnlyReason?: string | null;
	/** Open a linked record; defaults to the nearest `SheetsOpenRecordContext` handler. */
	onOpenRecord?: SheetsOpenRecordHandler | null;
}

/** What `save` did. `patch` is the belongsTo change for the record (local key fields plus the record under the relation field). */
export type RelationSaveResult =
	| { status: 'unchanged' }
	| { status: 'draft'; patch: Record<string, unknown> }
	| { status: 'saved'; patch: Record<string, unknown> | null }
	| { status: 'failed' };

export interface RelationEditor {
	relation: RelationModel;
	target: TableModel | null;
	junction: TableModel | null;
	/** True while the related or junction table model loads. */
	modelsLoading: boolean;
	/** The related table could not be loaded. */
	targetError: Error | null;
	capability: RelationEditCapability;
	/** Links can be added or removed. */
	editable: boolean;
	/**
	 * The related table is still loading and links will most likely be addable: the
	 * picker can show its frame (disabled) now, so the editor keeps its height when
	 * the table arrives.
	 */
	linkPending: boolean;
	/** Why nothing can be changed, shown once the models are known; null when something can. */
	blockedReason: string | null;
	links: RelationLinks;
	/** Current links (belongsTo: from the record's own key fields). */
	current: readonly LinkedRecord[];
	selection: RelationSelection;
	/** For hasOne/hasMany: text for a record linked elsewhere, which linking moves here. */
	moveHint: ((record: RecordValues) => string | null) | undefined;
	search: string;
	setSearch: (text: string) => void;
	searchReason: string | null;
	candidates: ModelPages;
	saving: boolean;
	errors: string[];
	notice: string | null;
	/** Pick or unpick a record; a refusal is shown as the notice. */
	toggle: (record: RecordValues) => void;
	/** Single relation: remove the link; a refusal is shown as the notice. */
	clear: () => void;
	/** Write the pending choices (or hand a draft belongsTo choice back). `clear` writes "no link" for a to-one relation instead. */
	save: (options?: { clear?: boolean }) => Promise<RelationSaveResult>;
	/** Forget the pending choices and messages. */
	discard: () => void;
	create: {
		/** Why a related record cannot be created here, or null. */
		blocked: string | null;
		/** The create form plan, or null while the related model loads. */
		plan: RelatedCreatePlan | null;
		/** Create the record from parsed form values; resolves to an error message or null. */
		submit: (values: FieldValues) => Promise<string | null>;
	};
	/** "Open {table}" for links that live in a table with more fields than the editor fills, or null. */
	junctionAction: { tableName: string; open: () => void } | null;
	/** Open a linked record in the host (record panel), or null when the host has no handler. */
	openRecord: ((record: RecordValues) => void) | null;
	/** Why a linked record cannot be opened, or null when it can. */
	openRecordReason: (record: RecordValues) => string | null;
}

const SEARCH_DELAY_MS = 250;

function useDebounced<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

/** belongsTo: the current link, keyed by the record's own key fields. */
function belongsToCurrent(relation: RelationModel, row: RecordValues | null, value: unknown): LinkedRecord[] {
	const nested = value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValues) : null;
	const fromRow = row ? Object.fromEntries(relation.keys.map((pair) => [pair.remote, row[pair.local]])) : {};
	const key = belongsToCurrentKey(relation, row) ?? linkKey(relation, nested);
	if (!key) return [];
	return [{ key, record: nested ? { ...fromRow, ...nested } : fromRow }];
}

export function useRelationEditor(options: RelationEditorOptions): RelationEditor {
	const { relation, table, row, rowIdentifier, isDraft, value, onInvalidateData, readOnlyReason = null } = options;
	const queryClient = useQueryClient();
	const { execute, scopeKey } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const openTable = useOpenTableHandler();
	const contextOpenRecord = useOpenRecordHandler();
	const openRecordHandler = options.onOpenRecord ?? contextOpenRecord;

	const targetModel = useTableModel(relation.targetKey);
	const junctionModel = useTableModel(relation.junction?.tableKey ?? null, { enabled: relation.kind === 'manyToMany' });
	const target = targetModel.model;
	const junction = junctionModel.model;
	const modelsLoading =
		(!target && targetModel.isLoading) || (relation.kind === 'manyToMany' && !junction && junctionModel.isLoading);

	const capability = useMemo<RelationEditCapability>(
		() =>
			readOnlyReason
				? { canLink: false, linkReason: readOnlyReason, canUnlink: false, unlinkReason: readOnlyReason }
				: relationEditCapability({ relation, table, target, junction, row, isDraft, rowIdentified: rowIdentifier != null }),
		[readOnlyReason, relation, table, target, junction, row, isDraft, rowIdentifier],
	);
	const editable = capability.canLink || capability.canUnlink;
	const linkPending =
		!capability.canLink &&
		modelsLoading &&
		relation.editable &&
		!readOnlyReason &&
		!(isDraft && relation.kind !== 'belongsTo');

	const links = useRelationLinks({
		relation,
		row,
		rowValue: value,
		target,
		junction,
		modelsLoading,
		enabled: relation.kind !== 'belongsTo' && !isDraft,
	});
	const current = useMemo(
		() => (relation.kind === 'belongsTo' ? belongsToCurrent(relation, row, value) : links.links),
		[links.links, relation, row, value],
	);

	const linkedHere = useMemo(
		() => (relation.kind === 'hasMany' && row ? (record: RecordValues) => hasLinkOwner(relation, row, record) === 'here' : undefined),
		[relation, row],
	);
	const selection = useRelationSelection({ relation, current, capability, linkedHere });

	const moveHint = useMemo(() => {
		if ((relation.kind !== 'hasMany' && relation.kind !== 'hasOne') || !row) return undefined;
		return (record: RecordValues) =>
			hasLinkOwner(relation, row, record) === 'elsewhere' ? 'Linked to another record; choosing it moves it here.' : null;
	}, [relation, row]);

	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounced(search, SEARCH_DELAY_MS);
	const labelFields = relation.target.labelFields;
	const searchReason = target && searchClauses(target, labelFields).length === 0 ? 'These records cannot be searched by their label.' : null;
	const where = useMemo(
		() => (target ? searchFilter(target, labelFields, debouncedSearch) : null),
		[target, labelFields, debouncedSearch],
	);
	const candidates = useModelPages({
		model: target,
		purpose: 'relation-candidates',
		keyParts: [debouncedSearch.trim()],
		where,
		enabled: capability.canLink,
	});

	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [notice, setNotice] = useState<string | null>(null);

	const toggle = useCallback(
		(record: RecordValues) => {
			setErrors([]);
			setNotice(selection.toggle(record));
		},
		[selection],
	);

	const clear = useCallback(() => {
		const refused = selection.clear();
		if (refused) setNotice(refused);
	}, [selection]);

	const refresh = useCallback(async () => {
		const models = [table, target, junction].filter((model): model is TableModel => Boolean(model));
		await Promise.all(
			models.flatMap((model) => [
				queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.table(scopeKey, model.key) }),
				queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.infiniteTable(scopeKey, model.key) }),
			]),
		);
		onInvalidateData?.();
	}, [junction, onInvalidateData, queryClient, scopeKey, table, target]);

	const run = useMemo(() => adapterChangeRunner(adapter, execute), [adapter, execute]);

	const planSave = useCallback((choice: RecordValues | null): RelationPlan => {
		if (relation.kind === 'belongsTo') {
			if (rowIdentifier == null) return { ok: false, reason: 'This record cannot be identified, so its links cannot be changed.' };
			return planBelongsTo(relation, table, rowIdentifier, choice);
		}
		if (!row) return { ok: false, reason: 'This record has no value to link by yet.' };
		if (relation.kind === 'manyToMany') {
			if (!junction) return { ok: false, reason: 'The table that stores these links could not be loaded.' };
			return planJunctionLinks(relation, junction, row, { added: selection.added, removed: selection.removed });
		}
		if (!target) return { ok: false, reason: 'The linked table could not be loaded.' };
		if (relation.kind === 'hasOne') {
			const chosen = choice;
			const added = chosen ? [{ key: linkKey(relation, chosen) ?? '', record: chosen }] : [];
			const removed = current[0] ? [current[0]] : [];
			return planHasLinks(relation, target, row, { added, removed });
		}
		return planHasLinks(relation, target, row, { added: selection.added, removed: selection.removed });
	}, [current, junction, relation, row, rowIdentifier, selection, table, target]);

	/** belongsTo: the record's new key fields plus the chosen record under the relation field. */
	const belongsToPatch = useCallback(
		(record: RecordValues | null): Record<string, unknown> | null => {
			const patch = record ? belongsToLinkPatch(relation, record) : belongsToClearPatch(relation);
			return patch ? { ...patch, [relation.fieldName]: record } : null;
		},
		[relation],
	);

	const save = useCallback(async (options: { clear?: boolean } = {}): Promise<RelationSaveResult> => {
		if (saving) return { status: 'failed' };
		// Clear (to-one): write "no link" now, whatever is pending.
		const clearing = Boolean(options.clear) && (relation.kind === 'belongsTo' || relation.kind === 'hasOne');
		const choice = clearing ? null : selection.choice ?? null;
		if (clearing ? current.length === 0 : !selection.dirty) return { status: 'unchanged' };
		setErrors([]);
		setNotice(null);

		const patch = relation.kind === 'belongsTo' ? belongsToPatch(choice) : null;
		if (relation.kind === 'belongsTo' && !patch) {
			setErrors(['The chosen record has no value to link by.']);
			return { status: 'failed' };
		}
		if (patch && isDraft) {
			selection.settle(new Set(selection.pending.map((link) => link.key)));
			return { status: 'draft', patch };
		}

		const plan = planSave(choice);
		if (!plan.ok) {
			setErrors([plan.reason]);
			return { status: 'failed' };
		}
		setSaving(true);
		const outcome = await applyRelationChanges(plan.changes, run, {
			dependent: relation.kind === 'belongsTo' || relation.kind === 'hasOne',
		});
		if (outcome.applied.length > 0) await refresh();
		setSaving(false);

		if (outcome.failed.length === 0) {
			selection.settle(new Set(outcome.applied.map((change) => change.linkKey)));
			return { status: 'saved', patch };
		}
		const lines = describeFailures(outcome);
		if (outcome.applied.length > 0) {
			lines.unshift(`Saved ${outcome.applied.length} of ${plan.changes.length} changes.`);
			selection.settle(new Set(outcome.applied.map((change) => change.linkKey)));
		}
		setErrors(lines);
		return { status: 'failed' };
	}, [belongsToPatch, current.length, isDraft, planSave, refresh, relation.kind, run, saving, selection]);

	const discard = useCallback(() => {
		selection.reset();
		setErrors([]);
		setNotice(null);
		setSearch('');
	}, [selection]);

	const plan = useMemo(() => (target ? planRelatedCreate(relation, target, row) : null), [relation, row, target]);
	const createBlocked = !capability.canLink
		? capability.linkReason
		: isDraft && relation.kind !== 'belongsTo'
			? 'Save this record first, then link records to it.'
			: relation.kind === 'hasOne' && current.length > 0
				? 'Remove the current link first.'
				: plan && !plan.ok
					? plan.reason
					: null;

	const submitCreate = useCallback(
		async (values: FieldValues): Promise<string | null> => {
			if (!target || !plan?.ok) return 'The linked table could not be loaded.';
			try {
				const created = await adapter.createRow<RecordValues>(
					{ model: target, tableName: target.key },
					{ ...plan.fixed, ...values },
					execute,
				);
				const label = relationRecordLabel(relation, created ?? values) || 'the new record';
				if (relation.kind === 'hasOne' || relation.kind === 'hasMany') {
					await refresh();
					setNotice(`Created and linked "${label}".`);
				} else {
					await queryClient.invalidateQueries({ queryKey: sheetsQueryKeys.table(scopeKey, target.key) });
					if (created) {
						const refused = selection.toggle(created);
						setNotice(refused ?? `Created "${label}". Save to link it.`);
					} else {
						setNotice(`Created "${label}". Find it in the list to link it.`);
					}
				}
				return null;
			} catch (error) {
				return error instanceof Error ? error.message : 'The record could not be created.';
			}
		},
		[adapter, execute, plan, queryClient, refresh, relation, scopeKey, selection, target],
	);

	const junctionInfo = relation.junction;
	const junctionAction = useMemo(() => {
		if (!openTable || !junctionInfo || junctionInfo.pure) return null;
		return {
			tableName: junctionInfo.tableName,
			open: () => {
				const leftValues = row ? junctionLeftValues(relation, row) : null;
				openTable({
					tableKey: junctionInfo.tableKey,
					tableName: junctionInfo.tableName,
					filters: junction && leftValues ? equalityFilterGroup(junction, leftValues) : null,
					reason: 'linked-records',
				});
			},
		};
	}, [junction, junctionInfo, openTable, relation, row]);

	const openRecordReason = useCallback(
		(record: RecordValues): string | null => {
			if (!relation.targetKey) return 'The linked table is not available.';
			return fieldValues(record, relation.target.primaryKey) ? null : 'This record cannot be identified, so it cannot be opened.';
		},
		[relation],
	);
	const openRecord = useMemo(() => {
		if (!openRecordHandler || !relation.targetKey) return null;
		const tableKey = relation.targetKey;
		return (record: RecordValues) => {
			const key = fieldValues(record, relation.target.primaryKey);
			if (!key) return;
			openRecordHandler({ tableKey, tableName: relation.targetName, key, label: relationRecordLabel(relation, record) });
		};
	}, [openRecordHandler, relation]);

	return {
		relation,
		target,
		junction,
		modelsLoading,
		targetError: targetModel.error,
		capability,
		editable,
		linkPending,
		// Shown from the first frame when the relation or the host already decides it; a reason
		// that needs the related table waits for it (the picker frame holds its place meanwhile).
		blockedReason:
			!editable && (!modelsLoading || !relation.editable || Boolean(readOnlyReason))
				? capability.linkReason ?? capability.unlinkReason
				: null,
		links,
		current,
		selection,
		moveHint,
		search,
		setSearch,
		searchReason,
		candidates,
		saving,
		errors,
		notice,
		toggle,
		clear,
		save,
		discard,
		create: { blocked: createBlocked, plan, submit: submitCreate },
		junctionAction,
		openRecord,
		openRecordReason,
	};
}
