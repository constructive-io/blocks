// What a copied cell puts on the clipboard: a column's value in the grid's copy format, a link
// cell's record labels (never the record's JSON).
import type { TableModel } from '@constructive-io/data';

import { copyText } from '../cell-types/column-value';
import { relationCopyText } from '../relations/relation-label';

export function cellCopyText(model: Pick<TableModel, 'columns' | 'relations'> | null | undefined, colKey: string, value: unknown): string {
	const relation = model?.relations.find((candidate) => candidate.fieldName === colKey);
	return relation ? relationCopyText(relation, value) : copyText(model?.columns, colKey, value);
}
