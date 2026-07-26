import { describe, expect, it } from 'vitest';

import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import type { CellCreationMetadata } from '../grid-cell-types';
import { attachDraftMeta, getDraftMeta, type DraftMeta } from '../row-model';
import { suppressDraftIdText } from '../../grid-dom/use-sheets-content';
import type { RelationInfo } from '../../store/relation-info-slice';

import { assertOrUpdateGolden, projectSheetsCell } from './parity.harness';

// ─────────────────────────────────────────────────────────────────────────────
// PARITY GOLDEN — relation derivation + draft POST-PROCESSING (native pipeline).
//
// Focused battery over the two behaviors that decorate the raw factory output. The
// committed `post-processing.golden.json` froze the v1 values; here we run each
// case through the live NATIVE pipeline and assert it reproduces that golden:
//
//   1. RELATION label derivation (relation SheetsCell factory): belongsTo single
//      label from displayCandidates; belongsTo null; hasMany list longer than the
//      chip limit -> '+N' overflow chip; a label longer than the max length ->
//      truncation with an ellipsis. Captured through createSheetsCell +
//      projectSheetsCell (single relations carry data === displayData === label;
//      list relations carry chips in `data` with no display text -> displayText '',
//      copyText the JSON-stringified chips — the frozen v1 truth).
//
//   2. DRAFT suppression (use-sheets-content.suppressDraftIdText): the draft slice
//      stores `id = 'draft:<key>'`; the rendered id cell would leak that raw string,
//      so the native suppressor BLANKS its display/data while preserving kind. Run
//      against the real exported helper + the real attachDraftMeta.
//
// Native draft VISUAL styling (styleHint.draft/error) is a flag the host paints
// from, not part of the projected pair, so it is intentionally NOT routed here.
// ─────────────────────────────────────────────────────────────────────────────

const RELATION_CHIP_LIMIT_DEFAULT = 3; // DEFAULT_MAX_RELATION_CHIPS in the relation factory
const RELATION_LABEL_MAX_DEFAULT = 24; // DEFAULT_RELATION_LABEL_MAX_LEN in the relation factory

function makeMetadata(cellType: string, overrides?: Partial<CellCreationMetadata>): CellCreationMetadata {
	return {
		cellType,
		fieldName: overrides?.fieldName ?? cellType,
		canEdit: true,
		isReadonly: false,
		activationBehavior: 'double-click',
		...overrides,
	};
}

const BELONGS_TO: RelationInfo = {
	kind: 'belongsTo',
	relatedTable: 'users',
	relationField: 'author',
	foreignKeyField: 'authorId',
	displayCandidates: ['displayName', 'name'],
};

const HAS_MANY: RelationInfo = {
	kind: 'hasMany',
	relatedTable: 'comments',
	relationField: 'comments',
	foreignKeyField: 'postId',
	displayCandidates: ['title'],
};

// ── Relation battery ────────────────────────────────────────────────────────

function relationRow(label: string, value: unknown, info: RelationInfo, relationOptions: Record<string, number> = {}) {
	const metadata = makeMetadata('relation', { relationInfo: info, relationOptions });
	const cell = createSheetsCell(value, metadata);
	const { displayText, copyText } = projectSheetsCell(cell);
	return {
		label,
		typeKey: 'relation',
		kind: info.kind,
		value,
		relationOptions,
		displayText,
		copyText,
	};
}

const LONG_LABEL = 'A very long author display name that exceeds the limit'; // 53 chars > 24

function buildRelationRows() {
	return [
		// belongsTo single -> label derived from displayCandidates (displayName wins over id)
		relationRow('belongsTo — label from displayName', { id: 'u1', displayName: 'Ada Lovelace' }, BELONGS_TO),
		// belongsTo single -> falls through to second candidate (name) when displayName absent
		relationRow('belongsTo — fallback to name candidate', { id: 'u2', name: 'Grace Hopper' }, BELONGS_TO),
		// belongsTo single -> id is LAST resort when no name-like candidate present
		relationRow('belongsTo — id last resort', { id: 'u3' }, BELONGS_TO),
		// belongsTo null -> empty label
		relationRow('belongsTo — null value', null, BELONGS_TO),
		// belongsTo scalar string -> used directly as label
		relationRow('belongsTo — scalar string value', 'plain-id', BELONGS_TO),
		// belongsTo draft placeholder -> suppressed to empty by deriveRelationLabel
		relationRow('belongsTo — draft: placeholder suppressed', 'draft:abc123', BELONGS_TO),
		relationRow('belongsTo — object id draft: suppressed', { id: 'draft:xyz' }, BELONGS_TO),
		// belongsTo label longer than max length -> truncated with ellipsis (default max 24)
		relationRow('belongsTo — label truncated at default max', { displayName: LONG_LABEL }, BELONGS_TO),
		// belongsTo label truncated at a SMALLER explicit max
		relationRow('belongsTo — label truncated at explicit max 8', { displayName: LONG_LABEL }, BELONGS_TO, {
			relationLabelMaxLength: 8,
		}),
		// hasMany within limit -> all chips, no overflow
		relationRow('hasMany — within chip limit', [{ title: 'one' }, { title: 'two' }], HAS_MANY),
		// hasMany LONGER than default chip limit (3) -> '+N' overflow chip
		relationRow(
			'hasMany — overflow +N at default chip limit',
			[{ title: 'one' }, { title: 'two' }, { title: 'three' }, { title: 'four' }, { title: 'five' }],
			HAS_MANY,
		),
		// hasMany overflow at an explicit SMALLER chip limit
		relationRow(
			'hasMany — overflow +N at explicit chip limit 2',
			[{ title: 'one' }, { title: 'two' }, { title: 'three' }, { title: 'four' }],
			HAS_MANY,
			{ relationChipLimit: 2 },
		),
		// hasMany empty list -> empty bubble (no chips)
		relationRow('hasMany — empty list', [], HAS_MANY),
		// hasMany with per-item truncation inside chips
		relationRow(
			'hasMany — per-chip truncation at explicit max 6',
			[{ title: LONG_LABEL }, { title: 'short' }],
			HAS_MANY,
			{ relationLabelMaxLength: 6 },
		),
	];
}

// ── Draft suppression battery ─────────────────────────────────────────────────

const DRAFT_ID = 'draft:k-001';
const DRAFT_META: DraftMeta = { isDraft: true, draftRowId: DRAFT_ID, status: 'idle', errors: null };

function draftRow(label: string, colKey: string, rawValue: unknown, cellType: string, draftMeta: DraftMeta) {
	// Attach draft meta to the ROW via the real (non-enumerable) helper, then read
	// it back exactly as use-sheets-content does — proving DRAFT_META survives and is
	// invisible to enumeration.
	const row = attachDraftMeta({ id: DRAFT_ID, [colKey]: rawValue }, draftMeta);
	const meta = getDraftMeta(row);
	const isDraft = Boolean(meta?.isDraft);

	const metadata = makeMetadata(cellType, { fieldName: colKey });
	const baseCell = createSheetsCell(rawValue, metadata);

	const suppressed = suppressDraftIdText(baseCell, {
		isDraftRow: isDraft,
		colKey,
		rawValue,
		draftId: meta?.draftRowId,
	});

	const before = projectSheetsCell(baseCell);
	const after = projectSheetsCell(suppressed);

	return {
		label,
		colKey,
		cellType,
		rawValue,
		isDraftRow: isDraft,
		// non-enumerable Symbol must NOT leak into row keys
		rowKeys: Object.keys(row),
		before,
		after,
		suppressed: before.displayText !== after.displayText || before.copyText !== after.copyText,
	};
}

function buildDraftRows() {
	return [
		// id column holding the raw draft: key -> BLANKED (the headline suppression)
		draftRow('draft id column — draft: key blanked', 'id', DRAFT_ID, 'text', DRAFT_META),
		// a non-id column whose value EQUALS the draft id -> also blanked
		draftRow('draft non-id column equal to draft id — blanked', 'parentId', DRAFT_ID, 'text', DRAFT_META),
		// a normal draft-row data column -> untouched (suppression is narrow)
		draftRow('draft normal column — untouched', 'name', 'Hello draft', 'text', DRAFT_META),
		// a draft row in error status with a normal value -> suppression still narrow (no blanking)
		draftRow('draft error-status column — untouched', 'title', 'Working title', 'text', {
			isDraft: true,
			draftRowId: DRAFT_ID,
			status: 'error',
			errors: { title: 'Required' },
		}),
		// id column with a NON-draft id value (server-shaped) -> NOT blanked
		draftRow('draft id column with server id — not blanked', 'id', 'server-id-42', 'text', DRAFT_META),
	];
}

describe('PARITY — post-processing golden (relation derivation + draft suppression)', () => {
	it('pins the relation/draft constants this battery assumes', () => {
		expect(RELATION_CHIP_LIMIT_DEFAULT).toBe(3);
		expect(RELATION_LABEL_MAX_DEFAULT).toBe(24);
	});

	it('draft meta is non-enumerable on every draft row', () => {
		for (const row of buildDraftRows()) {
			expect(row.rowKeys).not.toContain('isDraft');
			expect(row.isDraftRow).toBe(true);
		}
	});

	it('matches the committed golden', () => {
		const golden = {
			relation: buildRelationRows(),
			draft: buildDraftRows(),
		};
		assertOrUpdateGolden('post-processing.golden', golden);
	});
});
