// The TanStack Table v9 feature set for the DOM port — EXACTLY the four
// client-state features (S1). No sort/filter/pagination features and no
// row-model factories: rows arrive already server-sorted/filtered/paginated
// from useSheets, so this instance is a pure column + selection state-mirror.
//
// Built at module scope so the feature object has a stable identity across
// renders (a fresh tableFeatures({...}) per render would churn the table).
import {
	columnSizingFeature, // committed column widths   -> state.columnSizing
	columnResizingFeature, // transient drag-resize    -> state.columnResizing
	columnPinningFeature, // left/right pin             -> state.columnPinning
	rowSelectionFeature, // row selection               -> state.rowSelection
	tableFeatures
} from '@tanstack/react-table';

export const sheetsTableFeatures = tableFeatures({
	columnSizingFeature,
	columnResizingFeature,
	columnPinningFeature,
	rowSelectionFeature
});

export type SheetsTableFeatures = typeof sheetsTableFeatures;
