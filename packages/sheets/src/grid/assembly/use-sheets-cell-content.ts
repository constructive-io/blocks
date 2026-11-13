// What each cell shows and whether it can be written: the model's relation entries and
// the native content resolver, with the files-table preview cells on top.
import { useMemo } from 'react';

import type { MetaField, MetaQuery, TableModel } from '@constructive-io/data';

import type { CellTypeRegistry } from '../../cell-types/cell-type-registry';
import type { SheetsConfig } from '../../context/sheets-context';
import { useSheetsContent } from '../../grid-dom/use-sheets-content';
import type { SheetsRowIdentifier } from '../../row-identity';
import { relationInfoFromModel } from '../../store/relation-info-slice';
import { withFilePreviewCells } from '../../uploads/files-table-preview';
import type { SheetsRow } from '../row-model';
import { mapFromRelationInfoMap } from '../sheets.utils';

export interface UseSheetsCellContentInput {
	tableName: string;
	tableModel: TableModel | null;
	combinedRows: SheetsRow[];
	gridColumnKeys: string[];
	fieldMetaMap: Map<string, MetaField>;
	cellRegistry: CellTypeRegistry;
	relationChipLimit: number | undefined;
	relationLabelMaxLength: number | undefined;
	filterMeta: MetaQuery | undefined;
	canCreate: boolean;
	canUpdate: boolean;
	primaryKeyFields: ReadonlySet<string>;
	getRowIdentifier: (row: Readonly<Record<string, unknown>>) => SheetsRowIdentifier | null;
	canUpload: boolean;
	config: SheetsConfig;
}

export function useSheetsCellContent({
	tableName,
	tableModel,
	combinedRows,
	gridColumnKeys,
	fieldMetaMap,
	cellRegistry,
	relationChipLimit,
	relationLabelMaxLength,
	filterMeta,
	canCreate,
	canUpdate,
	primaryKeyFields,
	getRowIdentifier,
	canUpload,
	config,
}: UseSheetsCellContentInput) {
	// ============== RELATION INFO (model-derived) ==============
	// Per-field relation entries from the table model; a new model (after a `_meta`
	// refetch) rebuilds them. Used by the content resolver + draft/relation routing.
	const relationInfoByField = useMemo(() => relationInfoFromModel(tableModel), [tableModel]);

	const relationInfoObject = useMemo(() => mapFromRelationInfoMap(relationInfoByField), [relationInfoByField]);

	// Native DOM content resolver (mirrors the canvas getCellContent routing → SheetsCell).
	const { getSheetsCell: getColumnCellContent } = useSheetsContent({
		data: combinedRows,
		columnKeys: gridColumnKeys,
		fieldMetaMap,
		registry: cellRegistry,
		tableName,
		options: { relationChipLimit, relationLabelMaxLength },
		relationInfoByField,
		meta: filterMeta,
		serverRowsReadOnly: !canUpdate,
		serverReadOnlyFields: primaryKeyFields,
		getRowIdentifier,
		canUpload,
		canCreate,
		tableModel,
		fieldTypeOverrides: config.fieldTypeOverrides,
	});
	const getSheetsCellContent = useMemo(
		() => withFilePreviewCells(getColumnCellContent, combinedRows, tableModel),
		[getColumnCellContent, combinedRows, tableModel],
	);

	return { relationInfoByField, relationInfoObject, getSheetsCellContent };
}
