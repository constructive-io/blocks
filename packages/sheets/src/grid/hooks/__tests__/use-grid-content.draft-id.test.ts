import { describe, expect, it } from 'vitest';

import { createSheetsCell } from '../../../cell-model/create-sheets-cell';
import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { CellCreationMetadata } from '../../grid-cell-types';
import { attachDraftMeta, type DraftMeta } from '../../row-model';
import { suppressDraftIdText } from '../../../grid-dom/use-sheets-content';

// FIX A — internal draft id must not leak as visible cell text.
//
// The draft slice intentionally sets `values.id = 'draft:<key>'` so editors can
// detect drafts; the fix lives at DISPLAY level. `useSheetsContent` builds the cell
// via registry.toSheetsCell (transparent fallback to createSheetsCell — see
// registry-fidelity.test.ts) then runs `suppressDraftIdText` before tagging draft
// styling. We test that pure seam directly: @testing-library/react is not a dep of
// this package (see registry-gating.test.tsx), so the hook itself is not rendered.

const DRAFT_ID = 'draft:dxnpkf';

const DRAFT_META: DraftMeta = { isDraft: true, draftRowId: DRAFT_ID, status: 'idle', errors: null };

function textMeta(fieldName: string): CellCreationMetadata {
	return {
		cellType: 'text',
		fieldName,
		canEdit: true,
		isReadonly: false,
		activationBehavior: 'double-click',
	};
}

// Build the id cell exactly as use-sheets-content would (text factory over the raw value).
function idCell(value: unknown): SheetsCell {
	return createSheetsCell(value, textMeta('id'));
}

describe('FIX A — suppressDraftIdText blanks a leaked draft key at display level', () => {
	it('draft row + id column → displayData/data emptied (kind preserved)', () => {
		// Sanity: the unsuppressed cell renders the raw draft key.
		const raw = idCell(DRAFT_ID);
		expect(raw).toMatchObject({ kind: 'text', data: DRAFT_ID, displayData: DRAFT_ID });

		attachDraftMeta({ id: DRAFT_ID }, DRAFT_META);
		const suppressed = suppressDraftIdText(raw, {
			isDraftRow: true,
			colKey: 'id',
			rawValue: DRAFT_ID,
			draftId: DRAFT_ID,
		});

		expect(suppressed.kind).toBe('text');
		expect(suppressed.displayData).toBe('');
		expect(suppressed.data).toBe('');
	});

	it('normal (server) row id renders unchanged', () => {
		const raw = idCell('a1b2c3');
		const out = suppressDraftIdText(raw, {
			isDraftRow: false,
			colKey: 'id',
			rawValue: 'a1b2c3',
			draftId: undefined,
		});
		expect(out).toBe(raw); // not a draft row → returned untouched
		expect(out.displayData).toBe('a1b2c3');
	});

	it('suppresses a non-id column whose value equals the draft id', () => {
		// A relation FK column can carry the draft key as its raw value.
		const raw = idCell(DRAFT_ID);
		const out = suppressDraftIdText(raw, {
			isDraftRow: true,
			colKey: 'authorId',
			rawValue: DRAFT_ID,
			draftId: DRAFT_ID,
		});
		expect(out.displayData).toBe('');
	});

	it('leaves a draft row’s real column data intact (narrow: only the draft key)', () => {
		const raw = idCell('Ada Lovelace');
		const out = suppressDraftIdText(raw, {
			isDraftRow: true,
			colKey: 'name',
			rawValue: 'Ada Lovelace',
			draftId: DRAFT_ID,
		});
		expect(out).toBe(raw);
		expect(out.displayData).toBe('Ada Lovelace');
	});

	it('does NOT suppress an id column on a draft row when the value is a real id (not draft:)', () => {
		const raw = idCell('real-uuid');
		const out = suppressDraftIdText(raw, {
			isDraftRow: true,
			colKey: 'id',
			rawValue: 'real-uuid',
			draftId: DRAFT_ID,
		});
		expect(out.displayData).toBe('real-uuid');
	});
});
