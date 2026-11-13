/**
 * What the relation editor may do for one relation of one row, with a
 * human-readable reason for everything it may not do. Decided only from the
 * table models: a write the models cannot prove is not offered.
 */
import type { RelationModel, TableModel } from '@constructive-io/data';

import { hasLinkPatch, junctionLeftValues, linkFields, type RecordValues } from './relation-keys';

export interface RelationEditContext {
	relation: RelationModel;
	/** The grid table. */
	table: TableModel;
	/** The related table, or null while it loads or when it failed. */
	target: TableModel | null;
	/** The junction table of a manyToMany relation, or null. */
	junction: TableModel | null;
	/** The row being edited (server or draft). */
	row: RecordValues | null;
	/** True for a draft row that does not exist on the server yet. */
	isDraft: boolean;
	/** True when the server row can be addressed by its primary key. */
	rowIdentified: boolean;
}

export interface RelationEditCapability {
	/** Links can be added (or, for a single link, chosen). */
	canLink: boolean;
	/** Why links cannot be added, or null. */
	linkReason: string | null;
	/** Links can be removed (or, for a single link, cleared). */
	canUnlink: boolean;
	/** Why links cannot be removed, or null. */
	unlinkReason: string | null;
}

const SAVE_FIRST = 'Save this record first, then link records to it.';
const TARGET_UNAVAILABLE = 'The linked table could not be loaded, so these links cannot be changed.';
const JUNCTION_UNAVAILABLE = 'The table that stores these links could not be loaded, so they cannot be changed.';
const ROW_UNIDENTIFIED = 'This record cannot be identified, so its links cannot be changed.';

function blocked(reason: string): RelationEditCapability {
	return { canLink: false, linkReason: reason, canUnlink: false, unlinkReason: reason };
}

function operationIssue(model: TableModel, operation: 'create' | 'update' | 'delete'): string | null {
	return model.issues.find((issue) => issue.scope === 'operation' && issue.target === operation)?.message ?? null;
}

/** The first column of `fields` that `operation` cannot write, with its reason. */
function unwritable(model: TableModel, fields: readonly string[], operation: 'create' | 'update'): string | null {
	for (const field of fields) {
		const column = model.columns.find((candidate) => candidate.name === field);
		if (!column) return 'A field this link needs is not available.';
		if (!column.write[operation]) {
			return (operation === 'create' ? column.write.createReason : column.write.updateReason) ?? 'A field this link needs cannot be changed.';
		}
	}
	return null;
}

function unlinkState(relation: RelationModel, link: RelationEditCapability): RelationEditCapability {
	if (!link.canLink && link.linkReason) return { ...link, canUnlink: false, unlinkReason: link.linkReason };
	if (!relation.unlinkable) {
		return { ...link, canUnlink: false, unlinkReason: relation.reason ?? 'These links cannot be removed.' };
	}
	return { ...link, canUnlink: true, unlinkReason: null };
}

function belongsTo(ctx: RelationEditContext): RelationEditCapability {
	const { relation, table, isDraft } = ctx;
	const fields = relation.keys.map((pair) => pair.local);
	if (isDraft) {
		if (!table.operations.create) return blocked(operationIssue(table, 'create') ?? 'New records cannot be added to this table.');
		const reason = unwritable(table, fields, 'create');
		return reason ? blocked(reason) : unlinkState(relation, { canLink: true, linkReason: null, canUnlink: true, unlinkReason: null });
	}
	if (!table.operations.update) return blocked(operationIssue(table, 'update') ?? 'Records in this table cannot be changed.');
	if (!ctx.rowIdentified) return blocked(ROW_UNIDENTIFIED);
	const reason = unwritable(table, fields, 'update');
	if (reason) return blocked(reason);
	return unlinkState(relation, { canLink: true, linkReason: null, canUnlink: true, unlinkReason: null });
}

function hasRelated(ctx: RelationEditContext, target: TableModel): RelationEditCapability {
	const { relation, row } = ctx;
	if (!target.operations.update) return blocked('The linked table does not allow changes, so these links cannot be changed.');
	if (target.primaryKey.length === 0) return blocked('The linked records cannot be identified, so these links cannot be changed.');
	const reason = unwritable(target, relation.keys.map((pair) => pair.remote), 'update');
	if (reason) return blocked(reason);
	if (!row || !hasLinkPatch(relation, row)) return blocked('This record has no value to link by yet.');
	return unlinkState(relation, { canLink: true, linkReason: null, canUnlink: true, unlinkReason: null });
}

function manyToMany(ctx: RelationEditContext, junctionModel: TableModel): RelationEditCapability {
	const { relation, row } = ctx;
	const junction = relation.junction;
	if (!junction) return blocked(relation.reason ?? 'These links cannot be changed here.');
	if (!row || !junctionLeftValues(relation, row)) return blocked('This record has no value to link by yet.');

	const fields = [...junction.left.map((pair) => pair.junction), ...junction.right.map((pair) => pair.junction)];
	const createReason = !junctionModel.operations.create
		? 'The table that stores these links does not allow new links.'
		: unwritable(junctionModel, fields, 'create');
	const deleteReason = !junctionModel.operations.delete || junctionModel.primaryKey.length === 0
		? 'The table that stores these links does not allow removing links.'
		: null;
	const link: RelationEditCapability = {
		canLink: createReason === null,
		linkReason: createReason,
		canUnlink: true,
		unlinkReason: null,
	};
	if (!relation.unlinkable) return { ...link, canUnlink: false, unlinkReason: relation.reason ?? 'These links cannot be removed.' };
	if (deleteReason) return { ...link, canUnlink: false, unlinkReason: deleteReason };
	return link;
}

/** True when every field is a column the related table's list can return. */
function readable(model: TableModel, fields: readonly string[]): boolean {
	return fields.length > 0 && fields.every((field) => model.columns.some((column) => column.name === field && column.readable));
}

/** Decide what the editor may do for this relation and row. */
export function relationEditCapability(ctx: RelationEditContext): RelationEditCapability {
	const { relation, target } = ctx;
	if (!relation.editable) return blocked(relation.reason ?? 'These links cannot be changed here.');
	if (ctx.isDraft && relation.kind !== 'belongsTo') return blocked(SAVE_FIRST);
	if (!target) return blocked(TARGET_UNAVAILABLE);
	if (!readable(target, linkFields(relation))) {
		return blocked('The linked records do not show the fields this link needs, so these links cannot be changed.');
	}
	if (relation.kind === 'belongsTo') return belongsTo(ctx);
	if (relation.kind === 'manyToMany') return ctx.junction ? manyToMany(ctx, ctx.junction) : blocked(JUNCTION_UNAVAILABLE);
	return hasRelated(ctx, target);
}
