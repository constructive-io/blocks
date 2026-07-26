// Interval SheetsCell factory — native analogue of v1 `IntervalCellFactory`
// (grid/cell-content-factory.ts). Claims `cellType === 'interval'` and emits a
// neutral `text` SheetsCell whose displayData is the compact interval label and
// whose data is the raw string (or JSON of the object). The display/copy
// projection parity with the glide factory is the whole point of this phase.
//
// `formatIntervalForDisplay` (+ its `IntervalValue` shape) is interval-only domain
// logic copied VERBATIM from cell-content-factory.ts — it is intentionally NOT
// imported, because that module stays glide-only and is deleted at cutover.

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

// PostgreSQL interval value structure
interface IntervalValue {
	years?: number;
	months?: number;
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
}

/**
 * Format a PostgreSQL interval value for compact cell display.
 * Shows only non-zero units in descending order of magnitude.
 * Examples: "1y 6mo", "2h 30m", "7d", "45s"
 */
function formatIntervalForDisplay(value: unknown): string {
	if (value === null || value === undefined) return '';

	let interval: IntervalValue;

	if (typeof value === 'string') {
		try {
			interval = JSON.parse(value);
		} catch {
			if (/\d+[yMwdhms]/.test(value)) {
				return value;
			}
			return value;
		}
	} else if (typeof value === 'object') {
		interval = value as IntervalValue;
	} else {
		return String(value);
	}

	const parts: string[] = [];

	if (interval.years && interval.years !== 0) {
		parts.push(`${interval.years}y`);
	}
	if (interval.months && interval.months !== 0) {
		parts.push(`${interval.months}mo`);
	}
	if (interval.days && interval.days !== 0) {
		parts.push(`${interval.days}d`);
	}
	if (interval.hours && interval.hours !== 0) {
		parts.push(`${interval.hours}h`);
	}
	if (interval.minutes && interval.minutes !== 0) {
		parts.push(`${interval.minutes}m`);
	}
	if (interval.seconds && interval.seconds !== 0) {
		const secs = interval.seconds;
		if (Number.isInteger(secs)) {
			parts.push(`${secs}s`);
		} else {
			parts.push(`${secs.toFixed(1)}s`);
		}
	}

	if (parts.length === 0) {
		return '0s';
	}

	return parts.join(' ');
}

function canHandle(cellType: string, _value: unknown): boolean {
	return cellType === 'interval';
}

function create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
	if (value === null || value === undefined) {
		return {
			kind: 'text',
			data: '',
			displayData: '',
			readonly: false,
			meta: { cellType: metadata.cellType as CellType },
		};
	}

	const displayValue = formatIntervalForDisplay(value);
	const dataValue = typeof value === 'string' ? value : JSON.stringify(value);

	return {
		kind: 'text',
		data: dataValue,
		displayData: displayValue,
		readonly: false,
		meta: { cellType: metadata.cellType as CellType },
	};
}

export const intervalSheetsCellFactory: SheetsCellFactory = { canHandle, create };
