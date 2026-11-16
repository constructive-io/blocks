// Native SheetsCell factory for the `relation` family. Single relations
// (belongsTo/hasOne) render one label; list relations (hasMany/manyToMany)
// render chips and a "+N more" overflow counted from the connection total
// when the model says the relation reports one.
//
// Labels come from the related table's display rule
// (`RelationModel.target.labelFields`, host override included); a record
// whose label fields are empty shows its key value. No field-name lists.
//
// Cell payload:
//   - single: data = displayData = the (truncated) label; meta.relationTitle = full label.
//   - list:   data = string[] chips (truncated), plus a trailing "+N" when more exist;
//             meta.relationTitles = full chip labels, meta.relationCount = every linked record.
//   - both:   meta.relationTarget = { tableKey, tableName } of the related table (or null) and
//             meta.relationLinks = one { key, label } per shown record, `key` being its
//             primary-key values (null when it cannot be identified), so the view can open it.

import type { RelationModel, RelationTargetModel } from '@constructive-io/data';

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { fieldValues, linkFields } from '../../relations/relation-keys';
import { targetRecordLabel } from '../../relations/relation-label';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

const DEFAULT_MAX_RELATION_CHIPS = 3;
const DEFAULT_RELATION_LABEL_MAX_LEN = 24;
const DRAFT_PREFIX = 'draft:';

function truncateLabel(s: string, max: number): string {
	if (s.length <= max) return s;
	if (max <= 1) return '…';
	return s.slice(0, Math.max(0, max - 1)) + '…';
}

function isDraftKey(value: unknown): boolean {
	return typeof value === 'string' && value.startsWith(DRAFT_PREFIX);
}

interface LabelRule {
	target: RelationTargetModel;
	fallbackFields: readonly string[];
}

/** A shown linked record the view can open: its primary-key values and full label. */
export interface RelationCellLink {
	key: Readonly<Record<string, unknown>> | null;
	label: string;
}

function linkOf(entry: unknown, label: string, rule: LabelRule): RelationCellLink {
	const record = entry && typeof entry === 'object' && !Array.isArray(entry) ? (entry as Record<string, unknown>) : null;
	return { key: fieldValues(record, rule.target.primaryKey), label };
}

function targetOf(metadata: CellCreationMetadata): { tableKey: string; tableName: string } | null {
	const relation = metadata.relation ?? metadata.relationInfo?.relation ?? null;
	return relation?.targetKey ? { tableKey: relation.targetKey, tableName: relation.targetName } : null;
}

function labelRuleOf(metadata: CellCreationMetadata): LabelRule {
	const relation: RelationModel | null = metadata.relation ?? metadata.relationInfo?.relation ?? null;
	if (relation) return { target: relation.target, fallbackFields: linkFields(relation) };
	return { target: { primaryKey: [], labelFields: metadata.relationInfo?.displayCandidates ?? [] }, fallbackFields: [] };
}

/** The full label of one related record; '' for nothing or for a draft placeholder. */
function recordLabel(entry: unknown, rule: LabelRule): string {
	if (entry === null || entry === undefined) return '';
	if (typeof entry === 'string' || typeof entry === 'number') {
		return isDraftKey(entry) ? '' : String(entry).trim();
	}
	if (typeof entry !== 'object' || Array.isArray(entry)) return '';
	const record = entry as Record<string, unknown>;
	if (rule.target.primaryKey.some((field) => isDraftKey(record[field]))) return '';
	return targetRecordLabel(record, rule.target, rule.fallbackFields);
}

function isListRelation(metadata: CellCreationMetadata): boolean {
	const kind = metadata.relation?.kind ?? metadata.relationInfo?.kind;
	return kind === 'hasMany' || kind === 'manyToMany';
}

function canHandle(cellType: string, _value: unknown): boolean {
	return cellType === 'relation';
}

function create(value: unknown, metadata: CellCreationMetadata, _deriveGeometry?: (value: unknown) => SheetsCell): SheetsCell {
	const relOptions = metadata.relationOptions;
	const chipLimit = relOptions?.relationChipLimit ?? DEFAULT_MAX_RELATION_CHIPS;
	const labelMax = relOptions?.relationLabelMaxLength ?? DEFAULT_RELATION_LABEL_MAX_LEN;
	const rule = labelRuleOf(metadata);

	const relationTarget = targetOf(metadata);

	if (isListRelation(metadata)) {
		const entries = Array.isArray(value) ? value : [];
		const labelled = entries
			.map((entry) => ({ entry, label: recordLabel(entry, rule) }))
			.filter((item) => item.label.length > 0);
		const labels = labelled.map((item) => item.label);
		const shown = labels.slice(0, chipLimit);
		const relationLinks = labelled.slice(0, chipLimit).map((item) => linkOf(item.entry, item.label, rule));
		const reported = metadata.relationTotalCount;
		const count = typeof reported === 'number' && reported >= labels.length ? reported : labels.length;
		const remaining = count - shown.length;
		const chips = shown.map((label) => truncateLabel(label, labelMax));
		return {
			kind: 'relation',
			data: remaining > 0 ? [...chips, `+${remaining}`] : chips,
			displayData: '',
			readonly: false,
			meta: { relationTitles: shown, relationCount: count, relationTarget, relationLinks },
		};
	}

	const single = Array.isArray(value) ? value[0] : value;
	const full = recordLabel(single, rule);
	const label = truncateLabel(full, labelMax);
	const relationLinks = full ? [linkOf(single, full, rule)] : [];
	return {
		kind: 'relation',
		data: label,
		displayData: label,
		readonly: false,
		meta: { relationTitle: full, relationTarget, relationLinks },
	};
}

export const relationSheetsCellFactory: SheetsCellFactory = { canHandle, create };
