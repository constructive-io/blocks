// BREADTH gate — DISPATCHER-level display golden (native pipeline vs frozen v1).
//
// The `createSheetsCell` DISPATCHER must select the right family and project the
// SAME { displayText, copyText } v1 froze, across EVERY CellType + edge case in
// the shared fixture table. The committed `cell-display.golden.json` holds those
// frozen v1 values; here we run each case through the live native pipeline
// (createSheetsCell -> projectSheetsCell) and assert it reproduces the golden.
//
// If a dispatcher precedence drifts (e.g. text-fallback no longer last, or a family
// claims the wrong types) the projected pair for that case diverges from the frozen
// golden and this fails. `intendedKind` (from CELL_TYPE_TO_DISPLAY_KIND) is recorded
// per row so the golden also pins the neutral render kind each type resolves to.

import { describe, it } from 'vitest';

import { createSheetsCell } from '../../cell-model/create-sheets-cell';

import { ALL_CASES, fakeGeometrySheetsCell, makeMetadata } from './display-cases';
import { CELL_TYPE_TO_DISPLAY_KIND, assertOrUpdateGolden, projectSheetsCell } from './parity.harness';

describe('BREADTH — createSheetsCell dispatcher projects to the frozen cell-display golden', () => {
	it('matches the committed golden for every case', () => {
		const rows = ALL_CASES.map(({ label, typeKey, value, metaOverrides }) => {
			const meta = makeMetadata(typeKey, metaOverrides);
			const { displayText, copyText } = projectSheetsCell(createSheetsCell(value, meta, fakeGeometrySheetsCell));
			return { label, typeKey, value, intendedKind: CELL_TYPE_TO_DISPLAY_KIND[typeKey], displayText, copyText };
		});

		assertOrUpdateGolden('cell-display.golden', rows);
	});
});
