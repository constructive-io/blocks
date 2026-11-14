// The TanStack Table v9 feature set for the DOM port — EXACTLY the three
// column-state features. No row features and no row-model factories: the table
// holds columns only, and the viewport draws rows by index from the row array.
//
// Built at module scope so the feature object has a stable identity across
// renders (a fresh tableFeatures({...}) per render would churn the table).
import {
	columnSizingFeature, // committed column widths   -> state.columnSizing
	columnResizingFeature, // transient drag-resize    -> state.columnResizing
	columnPinningFeature, // logical start/end pin      -> state.columnPinning
	tableFeatures
} from '@tanstack/react-table';

export const sheetsTableFeatures = tableFeatures({
	columnSizingFeature,
	columnResizingFeature,
	columnPinningFeature
});

export type SheetsTableFeatures = typeof sheetsTableFeatures;
