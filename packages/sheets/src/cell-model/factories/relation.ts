// Native SheetsCell factory for the `relation` family — the port of v1's glide
// `RelationCellFactory` (grid/cell-content-factory.ts). Owns BOTH single relations
// (belongsTo/hasOne — glide emitted a Text cell) and list relations
// (hasMany/manyToMany — glide emitted a Bubble cell); both collapse to the single
// neutral kind `relation`. All label-derivation + chip-overflow domain logic is
// copied verbatim from v1 (no import from cell-content-factory.ts — that module
// stays glide-only and is deleted at cutover).
//
// PARITY: projectSheetsCell(create(...)) deep-equals projectGlideCell(v1 create).
//   single — glide Text: data = label, displayData = label.
//   list   — glide Bubble: data = finalData (chips + "+N"), displayData = '' (Bubble
//            carries no displayData, so it projects to '' on the display side).

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { compactJsonPreview } from '../../grid/sheets.formatters';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

// ─── Domain constants (copied verbatim from v1 RelationCellFactory) ──────────
const DEFAULT_MAX_RELATION_CHIPS = 3;
const DEFAULT_RELATION_LABEL_MAX_LEN = 24;

const RELATION_ID_KEYS = new Set(['id', 'uuid', 'rowId', 'nodeId']);

function truncateLabel(s: string, max: number): string {
	if (s.length <= max) return s;
	if (max <= 1) return '…';
	return s.slice(0, Math.max(0, max - 1)) + '…';
}

// Copied verbatim from v1 `RelationCellFactory.deriveRelationLabel`, lifted from a
// private method to a pure function (metadata threaded as an explicit argument).
function deriveRelationLabel(relationValue: any, metadata: CellCreationMetadata, maxLength: number): string {
	if (relationValue == null) return '';

	// Suppress draft placeholder IDs from being displayed as relation labels
	if (typeof relationValue === 'string' && relationValue.startsWith('draft:')) return '';
	if (
		typeof relationValue === 'object' &&
		!Array.isArray(relationValue) &&
		typeof (relationValue as Record<string, unknown>).id === 'string' &&
		((relationValue as Record<string, unknown>).id as string).startsWith('draft:')
	)
		return '';

	const ensureString = (val: unknown): string => {
		if (val == null) return '';
		const str = String(val).trim();
		if (!str || str.toLowerCase() === 'null') return '';
		return str;
	};

	if (typeof relationValue === 'string' || typeof relationValue === 'number') {
		return truncateLabel(ensureString(relationValue), maxLength);
	}

	if (Array.isArray(relationValue)) {
		const labels = relationValue
			.map((item) => deriveRelationLabel(item, metadata, maxLength))
			.filter((label) => label.length > 0);
		return labels.join(', ');
	}

	if (typeof relationValue !== 'object') {
		return truncateLabel(ensureString(relationValue), maxLength);
	}

	const relInfo = metadata.relationInfo;
	const candidatesFromMeta: string[] = relInfo?.displayCandidates ?? [];
	const objectValue = relationValue as Record<string, unknown>;
	const keys = Object.keys(objectValue);

	// Try name-like display candidates first (exclude id/uuid — those are last resort)
	const meaningfulCandidates = candidatesFromMeta.filter((k) => !RELATION_ID_KEYS.has(k));

	const heuristicKeys = Array.from(
		new Set([
			...meaningfulCandidates,
			...keys.filter((key) => /(name|label|title|display|email)/i.test(key)),
			'displayName',
			'fullName',
			'name',
			'title',
			'label',
			'description',
			'username',
			'email',
			'code',
		]),
	);

	for (const candidate of heuristicKeys) {
		if (!candidate) continue;
		const candidateValue = ensureString(objectValue[candidate]);
		if (candidateValue) {
			return truncateLabel(candidateValue, maxLength);
		}
	}

	// Last resort: id/uuid
	for (const idKey of ['id', 'uuid']) {
		const idVal = ensureString(objectValue[idKey]);
		if (idVal) {
			return truncateLabel(idVal, maxLength);
		}
	}

	const firstPrimitive = keys
		.map((key) => objectValue[key])
		.find((val) => val != null && ['string', 'number', 'boolean'].includes(typeof val));
	if (firstPrimitive !== undefined) {
		return truncateLabel(ensureString(firstPrimitive), maxLength);
	}

	return truncateLabel(compactJsonPreview(objectValue, 80), maxLength);
}

function canHandle(cellType: string, _value: unknown): boolean {
	return cellType === 'relation';
}

function create(value: unknown, metadata: CellCreationMetadata, _deriveGeometry?: (value: unknown) => SheetsCell): SheetsCell {
	const relInfo = metadata.relationInfo;
	const relOptions = metadata.relationOptions;
	const chipLimit = relOptions?.relationChipLimit ?? DEFAULT_MAX_RELATION_CHIPS;
	const labelMax = relOptions?.relationLabelMaxLength ?? DEFAULT_RELATION_LABEL_MAX_LEN;

	const isListRelation = relInfo?.kind === 'hasMany' || relInfo?.kind === 'manyToMany';

	if (isListRelation) {
		const arr = Array.isArray(value) ? value : [];
		const labelsAll = arr
			.map((entry) => deriveRelationLabel(entry, metadata, labelMax))
			.filter((label) => label.length > 0);
		const labels = labelsAll.slice(0, chipLimit);
		const remaining = labelsAll.length - labels.length;
		const finalData = remaining > 0 ? [...labels, `+${remaining}`] : labels;
		// glide emitted a Bubble cell (no displayData) -> displayData projects to ''.
		return {
			kind: 'relation',
			data: finalData,
			displayData: '',
			readonly: false,
		};
	}

	const label = deriveRelationLabel(value, metadata, labelMax);
	// glide emitted a Text cell -> data = displayData = label.
	return {
		kind: 'relation',
		data: label,
		displayData: label,
		readonly: false,
	};
}

export const relationSheetsCellFactory: SheetsCellFactory = { canHandle, create };
