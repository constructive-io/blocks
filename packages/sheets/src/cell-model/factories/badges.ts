// Badges SheetsCell factory — native analogue of v1 `ArrayCellFactory`.
//
// Owns the array/bubble family: every array-like cellType plus `tsvector`. The
// glide `BubbleCell` carries `data: string[]` and NO `displayData`, so the
// neutral payload mirrors that exactly — `data` is the string[] (copyText ===
// JSON.stringify(array)), `displayData` is '' (no display side in v1), and the
// kind is the neutral `badges`. ALL domain logic from v1 is ported verbatim
// (tags array/comma-string, tsvector lexeme preview, generic per-item
// stringify, null/undefined -> [], non-array fallback -> [String(value)]); the
// tsvector parser is copied in so this file never imports the glide factory
// (which is deleted at cutover).

import type { CellType } from '../../cell-types/types';
import { isArrayCellType } from '../../cell-types/cell-type-groups';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

// Minimal tsvector parser for previews — copied verbatim from v1
// cell-content-factory.ts (do NOT import it; it stays glide-only).
function parseTsvectorForPreview(tsvector: string): Array<{ lexeme: string; weights: Array<'A' | 'B' | 'C' | 'D'> }> {
	if (!tsvector || typeof tsvector !== 'string') return [];
	const results: Array<{ lexeme: string; weights: Array<'A' | 'B' | 'C' | 'D'> }> = [];
	try {
		const regex = /'([^']+)':([0-9A-D,]+)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(tsvector)) !== null) {
			const lexeme = match[1];
			const posStr = match[2];
			const weights = Array.from(
				new Set(
					posStr
						.split(',')
						.map((p) => p.match(/[A-D]$/)?.[0] as 'A' | 'B' | 'C' | 'D' | undefined)
						.filter((w): w is 'A' | 'B' | 'C' | 'D' => !!w),
				),
			).sort();
			results.push({ lexeme, weights });
		}
	} catch {
		// ignore parsing errors
	}
	return results;
}

// Compute the string[] the v1 BubbleCell put in `.data`, branch-for-branch.
function deriveBadges(value: unknown, metadata: CellCreationMetadata): string[] {
	if (value === null || value === undefined) {
		return [];
	}

	if (metadata.cellType === 'tags') {
		if (Array.isArray(value)) {
			return value.map((v) => (v == null ? '' : String(v))).filter((v) => v.length > 0);
		}
		if (typeof value === 'string') {
			return value
				.split(',')
				.map((v) => v.trim())
				.filter((v) => v.length > 0);
		}
	}

	if (metadata.cellType === 'tsvector' && typeof value === 'string') {
		const tokens = parseTsvectorForPreview(value);
		return tokens.map((t) => (t.weights.length ? `${t.lexeme} ${t.weights.join(',')}` : t.lexeme));
	}

	if (Array.isArray(value)) {
		return value.map((item) => {
			if (item === null || item === undefined) return '';
			if (typeof item === 'string') return item;
			if (typeof item === 'number') return String(item);
			if (typeof item === 'boolean') return String(item);
			if (item instanceof Date) return item.toISOString().split('T')[0];
			if (typeof item === 'object') return JSON.stringify(item);
			return String(item);
		});
	}

	return [String(value)];
}

export const badgesSheetsCellFactory: SheetsCellFactory = {
	canHandle(cellType: string, _value: unknown): boolean {
		return isArrayCellType(cellType) || cellType === 'tsvector';
	},

	create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
		return {
			kind: 'badges',
			data: deriveBadges(value, metadata),
			displayData: '',
			readonly: false,
			meta: { cellType: metadata.cellType as CellType },
		};
	},
};
