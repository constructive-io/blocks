// Structured-value SheetsCell factory — JSON, ranges, records, points and the
// view-only kinds (raw bytes, number vectors, values of an unknown kind). Each value
// renders as compact, readable text; the full value stays in the row for copy and for
// the viewer or editor overlay.

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { compactJsonPreview } from '../../grid/sheets.formatters';
import { fieldLabel } from '../../cell-types/field-label';
import { dateTimeTitle, formatDateTimeText, isTimestampText } from '../../cell-types/date-time-format';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

const STRUCTURED_CELL_TYPES: ReadonlySet<string> = new Set([
	'json',
	'jsonb',
	'range',
	'composite',
	'point',
	'binary',
	'vector',
	'unknown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scalarText(value: unknown): string {
	if (value === null || value === undefined) return '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * `[1, 10)`, `[2024-01-01, ∞)`; both ends open reads as "Any value" (the wire cannot
 * tell it from an empty range). With `shown`, timestamp ends read by the date and time
 * rule (`[2024-01-01 07:00:00, …)`, a zoned end in the viewer's zone, whose name is
 * passed to `onZone`); without it, they are exact.
 */
export function formatRange(value: unknown, shown = false, onZone?: (zone: string) => void): string {
	if (!isRecord(value)) return scalarText(value);
	const endText = (end: unknown) => {
		if (!shown || typeof end !== 'string' || !isTimestampText(end)) return scalarText(end);
		const display = formatDateTimeText(end, 'datetime');
		if (display.zone) onZone?.(display.zone);
		return display.text;
	};
	const bound = (side: unknown) => (isRecord(side) && side.value !== null && side.value !== undefined ? side : null);
	const start = bound(value.start);
	const end = bound(value.end);
	if (!start && !end) return 'Any value';
	const open = start ? (start.inclusive === false ? '(' : '[') : '(';
	const close = end ? (end.inclusive === true ? ']' : ')') : ')';
	return `${open}${start ? endText(start.value) : '-∞'}, ${end ? endText(end.value) : '∞'}${close}`;
}

function formatComposite(value: unknown): string {
	if (!isRecord(value)) return scalarText(value);
	return Object.entries(value)
		.filter(([name, field]) => name !== '__typename' && field !== null && field !== undefined)
		.map(([name, field]) => `${fieldLabel(name)}: ${scalarText(field)}`)
		.join(', ');
}

function formatPoint(value: unknown): string {
	if (!isRecord(value)) return scalarText(value);
	return `(${scalarText(value.x)}, ${scalarText(value.y)})`;
}

/** Byte count of a base64 text. */
function base64Size(text: string): number {
	const clean = text.replace(/\s/g, '');
	const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
	return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function formatBinary(value: unknown): string {
	if (typeof value !== 'string') return scalarText(value);
	const size = base64Size(value);
	const summary = `${size} ${size === 1 ? 'byte' : 'bytes'}`;
	return value ? `${summary} · ${value}` : summary;
}

function formatVector(value: unknown): string {
	if (!Array.isArray(value)) return scalarText(value);
	return `${value.length} ${value.length === 1 ? 'number' : 'numbers'} · [${value.map(scalarText).join(', ')}]`;
}

function display(cellType: string, value: unknown): string {
	switch (cellType) {
		case 'range':
			return formatRange(value, true);
		case 'composite':
			return formatComposite(value);
		case 'point':
			return formatPoint(value);
		case 'binary':
			return formatBinary(value);
		case 'vector':
			return formatVector(value);
		default:
			// JSON keeps its JSON form so a JSON string reads as "text", not as bare text.
			return compactJsonPreview(JSON.stringify(value) ?? String(value), 200);
	}
}

function canHandle(cellType: string, _value: unknown): boolean {
	return STRUCTURED_CELL_TYPES.has(cellType);
}

function create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
	const meta = { cellType: metadata.cellType as CellType };
	if (value === null || value === undefined) {
		return { kind: 'text', data: '', displayData: '', readonly: false, meta };
	}
	if (metadata.cellType === 'range') {
		// A range's timestamp ends read by the date and time rule; the exact text, and the
		// zone a zoned end is shown in, are the title.
		let zone: string | null = null;
		const shownText = formatRange(value, true, (name) => (zone = name));
		const exact = formatRange(value);
		return { kind: 'text', data: exact, displayData: shownText, readonly: false, meta: { ...meta, title: dateTimeTitle(exact, zone) } };
	}
	const text = display(metadata.cellType, value);
	return { kind: 'text', data: text, displayData: text, readonly: false, meta };
}

export const structuredSheetsCellFactory: SheetsCellFactory = { canHandle, create };
