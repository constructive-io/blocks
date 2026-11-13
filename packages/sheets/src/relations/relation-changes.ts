/**
 * The writes that turn an edited link set into server state, and running
 * them one by one so a partial failure can be reported per change. Every
 * write names its table model and the exact key and values; the adapter
 * builds the documents from the model.
 */
import { getHumanReadableError, type RelationModel, type TableModel } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import type { SheetsRowIdentifier } from '../row-identity';
import {
	belongsToClearPatch,
	belongsToLinkPatch,
	hasLinkPatch,
	hasUnlinkPatch,
	junctionLinkValues,
	linkKey,
	primaryKeyValues,
	type FieldValues,
	type RecordValues,
} from './relation-keys';
import { relationRecordLabel } from './relation-label';

interface ChangeBase {
	/** The table the write goes to. */
	model: TableModel;
	/** Whether the write adds or removes a link. */
	action: 'link' | 'unlink';
	/** Label of the related record, for messages. */
	label: string;
	/** Identity of the related record (see `linkKey`), or '' when a link is cleared. */
	linkKey: string;
}

export type RelationChange =
	| (ChangeBase & { op: 'update'; key: SheetsRowIdentifier; patch: FieldValues })
	| (ChangeBase & { op: 'create'; values: FieldValues })
	| (ChangeBase & { op: 'delete'; key: SheetsRowIdentifier });

/** A planned set of writes, or why the edit cannot be written. */
export type RelationPlan = { ok: true; changes: RelationChange[] } | { ok: false; reason: string };

export interface RelationChangeFailure {
	change: RelationChange;
	message: string;
}

export interface RelationChangeOutcome {
	applied: RelationChange[];
	failed: RelationChangeFailure[];
	/** Changes not attempted because an earlier one they depend on failed. */
	skipped: RelationChange[];
}

/** A record removed from or added to a list relation. */
export interface LinkedRecord {
	/** Comparable identity (see `linkKey`). */
	key: string;
	/** The related record. */
	record: RecordValues;
	/** For manyToMany: the junction row that holds the link. */
	junctionRow?: RecordValues | null;
}

/** belongsTo on a server row: one update of this row's local key fields. */
export function planBelongsTo(
	relation: RelationModel,
	table: TableModel,
	rowKey: SheetsRowIdentifier,
	record: RecordValues | null,
): RelationPlan {
	if (!record) {
		return {
			ok: true,
			changes: [
				{ op: 'update', model: table, key: rowKey, patch: belongsToClearPatch(relation), action: 'unlink', label: '', linkKey: '' },
			],
		};
	}
	const patch = belongsToLinkPatch(relation, record);
	if (!patch) return { ok: false, reason: 'The chosen record has no value to link by.' };
	return {
		ok: true,
		changes: [
			{
				op: 'update',
				model: table,
				key: rowKey,
				patch,
				action: 'link',
				label: relationRecordLabel(relation, record),
				linkKey: linkKey(relation, record) ?? '',
			},
		],
	};
}

/**
 * hasOne/hasMany: detach the removed records, then point the added records
 * at this row. Each write updates one related record by its primary key.
 */
export function planHasLinks(
	relation: RelationModel,
	target: TableModel,
	row: RecordValues,
	change: { added: readonly LinkedRecord[]; removed: readonly LinkedRecord[] },
): RelationPlan {
	const linkPatch = hasLinkPatch(relation, row);
	if (!linkPatch) return { ok: false, reason: 'This record has no value to link by yet.' };
	const changes: RelationChange[] = [];
	for (const entry of [...change.removed, ...change.added]) {
		const key = primaryKeyValues(target, entry.record);
		const label = relationRecordLabel(relation, entry.record);
		if (!key) return { ok: false, reason: `"${label || 'A record'}" cannot be identified, so its link cannot be changed.` };
		const removing = change.removed.includes(entry);
		changes.push({
			op: 'update',
			model: target,
			key: key as SheetsRowIdentifier,
			patch: removing ? hasUnlinkPatch(relation) : linkPatch,
			action: removing ? 'unlink' : 'link',
			label,
			linkKey: entry.key,
		});
	}
	return { ok: true, changes };
}

/**
 * manyToMany: delete the junction rows of removed links (by the junction's
 * primary key), then create one junction row per added link.
 */
export function planJunctionLinks(
	relation: RelationModel,
	junction: TableModel,
	row: RecordValues,
	change: { added: readonly LinkedRecord[]; removed: readonly LinkedRecord[] },
): RelationPlan {
	const changes: RelationChange[] = [];
	for (const entry of change.removed) {
		const label = relationRecordLabel(relation, entry.record);
		const key = entry.junctionRow ? primaryKeyValues(junction, entry.junctionRow) : null;
		if (!key) return { ok: false, reason: `The link to "${label || 'a record'}" cannot be identified, so it cannot be removed.` };
		changes.push({ op: 'delete', model: junction, key: key as SheetsRowIdentifier, action: 'unlink', label, linkKey: entry.key });
	}
	for (const entry of change.added) {
		const label = relationRecordLabel(relation, entry.record);
		const values = junctionLinkValues(relation, row, entry.record);
		if (!values) return { ok: false, reason: `"${label || 'A record'}" has no value to link by.` };
		changes.push({ op: 'create', model: junction, values, action: 'link', label, linkKey: entry.key });
	}
	return { ok: true, changes };
}

/** Run one change through the host's adapter. */
export function adapterChangeRunner(adapter: SheetsBackendAdapter, execute: SheetsExecuteFn) {
	return async (change: RelationChange): Promise<void> => {
		const ctx = { model: change.model, tableName: change.model.key };
		if (change.op === 'update') await adapter.updateRow(ctx, change.key, change.patch, execute);
		else if (change.op === 'create') await adapter.createRow(ctx, change.values, execute);
		else await adapter.deleteRow(ctx, change.key, execute);
	};
}

/**
 * Run changes in order. With `dependent`, the first failure stops the rest
 * (a single link is replaced by removing the old one first); otherwise every
 * change is tried and each failure is reported.
 */
export async function applyRelationChanges(
	changes: readonly RelationChange[],
	run: (change: RelationChange) => Promise<void>,
	options: { dependent?: boolean } = {},
): Promise<RelationChangeOutcome> {
	const outcome: RelationChangeOutcome = { applied: [], failed: [], skipped: [] };
	for (const change of changes) {
		if (options.dependent && outcome.failed.length > 0) {
			outcome.skipped.push(change);
			continue;
		}
		try {
			await run(change);
			outcome.applied.push(change);
		} catch (error) {
			outcome.failed.push({ change, message: getHumanReadableError(error) });
		}
	}
	return outcome;
}

/** One sentence per failure, naming the record and the server's message. */
export function describeFailures(outcome: RelationChangeOutcome): string[] {
	const lines = outcome.failed.map(({ change, message }) => {
		const verb = change.action === 'link' ? 'link' : 'unlink';
		return change.label ? `Could not ${verb} "${change.label}": ${message}` : `Could not ${verb}: ${message}`;
	});
	if (outcome.skipped.length > 0) lines.push(`${outcome.skipped.length} more change${outcome.skipped.length === 1 ? ' was' : 's were'} not tried.`);
	return lines;
}
