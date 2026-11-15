// What a new (draft) row still needs before it can be saved, said in the grid's own terms.
//
// The table model knows which fields a create requires. The grid does not always show those
// fields: a foreign key is filled through its link column (`projectId` through "Project", a
// composite key through one link). Every surface that guides the user (the cursor after Add
// row, the message after Save, the tint on missing cells, the Save button's reason) reads the
// same answer from here, so they never disagree.
import type { TableModel } from '@constructive-io/data';

import { modelFieldLabel } from '../cell-types/field-label';
import { validateDraftRowRequiredFields } from './sheets.utils';

/** The draft-error key that holds why the whole row was not saved (shown on its Save button). */
export const DRAFT_ROW_ERROR_KEY = 'submit';

export interface DraftFieldGap {
	/** The model field without a value. */
	field: string;
	/** The grid column that fills it: the field itself, or the link column of the relation it keys. */
	columnKey: string;
	/** The column's label, as its header shows it. */
	label: string;
}

/** The grid column that fills a model field: a belongsTo key field is filled through its link column. */
export function draftColumnOf(field: string, model: Pick<TableModel, 'relations'>): string {
	const link = model.relations.find(
		(relation) => relation.kind === 'belongsTo' && relation.keys.some((pair) => pair.local === field),
	);
	return link?.fieldName ?? field;
}

/** The required fields a draft still lacks, one entry per grid column (a composite key is one link). */
export function missingDraftFields(values: Readonly<Record<string, unknown>>, model: TableModel): DraftFieldGap[] {
	const label = modelFieldLabel(model);
	const gaps: DraftFieldGap[] = [];
	const seen = new Set<string>();
	for (const field of Object.keys(validateDraftRowRequiredFields(values, model))) {
		const columnKey = draftColumnOf(field, model);
		if (seen.has(columnKey)) continue;
		seen.add(columnKey);
		gaps.push({ field, columnKey, label: label(columnKey) });
	}
	return gaps;
}

function listOf(labels: readonly string[]): string {
	if (labels.length <= 1) return labels.join('');
	return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** "Fill in Title and Project to save this row." */
export function incompleteDraftMessage(gaps: readonly DraftFieldGap[]): string {
	return `Fill in ${listOf(gaps.map((gap) => gap.label))} to save this row.`;
}

/**
 * The errors a draft keeps after a refused Save: one per missing field and per grid column that
 * fills it (so the visible cell is marked, not only a hidden key field), and the row's reason.
 */
export function incompleteDraftErrors(gaps: readonly DraftFieldGap[]): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const gap of gaps) {
		const message = `${gap.label} needs a value.`;
		errors[gap.field] = message;
		errors[gap.columnKey] = message;
	}
	errors[DRAFT_ROW_ERROR_KEY] = incompleteDraftMessage(gaps);
	return errors;
}

/**
 * The column the cursor should land on in a draft: the first column (in display order) that
 * still needs a value, else the first one that can be filled at all. Null when none can.
 */
export function draftColumnToFill(
	columnKeys: readonly string[],
	gaps: readonly DraftFieldGap[],
	canFill: (columnKey: string) => boolean,
): string | null {
	const needed = new Set(gaps.map((gap) => gap.columnKey));
	return columnKeys.find((key) => needed.has(key) && canFill(key)) ?? columnKeys.find(canFill) ?? null;
}
