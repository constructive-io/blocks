import { describe, expect, it } from 'vitest';

import { createCellTypeRegistry, type CellTypeBuiltins } from '../../cell-types/cell-type-registry';
import type { SheetsCellRenderContext } from '../../cell-types/define-cell-type';
import type { RelationInfo } from '../../store/relation-info-slice';

import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import type { CellCreationMetadata } from '../grid-cell-types';

// LOCK 1 — Built-in fidelity (roadmap §1.3).
//
// With NO consumer cell types registered, the per-instance CellTypeRegistry must
// be a TRANSPARENT FALLBACK over the built-in NATIVE rendering engine. This pins
// that `registry.toSheetsCell(typeKey, value, ctx)` produces output deep-equal to a
// direct `createSheetsCell(value, metadata)` call for identical inputs — exactly how
// useSheetsContent wires the builtins. If these ever diverge, the registry has
// stopped being a pure override layer.

// The exact builtins wiring — toSheetsCell delegates to createSheetsCell. (The glide
// engines are gone; the native dispatcher is the only built-in display path.)
const builtins: CellTypeBuiltins = {
	toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
};

// Build metadata the way useSheetsContent does (cellType === resolved typeKey,
// canEdit/isReadonly/activationBehavior come from the structural route). For
// fidelity we only need cellType to drive factory selection; the other fields are
// passed identically through both paths so they cannot cause a divergence.
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

function makeCtx(metadata: CellCreationMetadata): SheetsCellRenderContext {
	return { metadata };
}

interface FidelityCase {
	label: string;
	typeKey: string;
	value: unknown;
	metaOverrides?: Partial<CellCreationMetadata>;
}

const RELATION_INFO_BELONGS_TO: RelationInfo = {
	kind: 'belongsTo',
	relatedTable: 'users',
	relationField: 'author',
	foreignKeyField: 'authorId',
	displayCandidates: ['displayName', 'name'],
};

const RELATION_INFO_HAS_MANY: RelationInfo = {
	kind: 'hasMany',
	relatedTable: 'comments',
	relationField: 'comments',
	foreignKeyField: 'postId',
	displayCandidates: ['title'],
};

// Representative coverage across the built-in factory families. Each case is a
// (typeKey, value) the corresponding SheetsCell factory's canHandle accepts.
const CASES: FidelityCase[] = [
	// text / string
	{ label: 'text — string value', typeKey: 'text', value: 'hello world' },
	{ label: 'text — null (empty cell)', typeKey: 'text', value: null },
	{ label: 'text — object falls back to JSON preview', typeKey: 'text', value: { a: 1, b: 2 } },
	// number / Int
	{ label: 'number — numeric value', typeKey: 'number', value: 42.5 },
	{ label: 'integer — string coerced', typeKey: 'integer', value: '17' },
	{ label: 'number — null', typeKey: 'number', value: null },
	{ label: 'number — NaN string', typeKey: 'number', value: 'not-a-number' },
	// boolean
	{ label: 'boolean — true', typeKey: 'boolean', value: true },
	{ label: 'boolean — null coerces false', typeKey: 'boolean', value: null },
	{ label: 'toggle — truthy coercion', typeKey: 'toggle', value: 1 },
	// date / timestamp
	{ label: 'date — iso string', typeKey: 'date', value: '2026-06-11' },
	{ label: 'timestamptz — value', typeKey: 'timestamptz', value: '2026-06-11T10:00:00Z' },
	{ label: 'datetime — null', typeKey: 'datetime', value: null },
	// image
	{ label: 'image — url string', typeKey: 'image', value: 'https://example.com/a.png' },
	{ label: 'image — object with url key', typeKey: 'image', value: { url: 'https://example.com/b.png' } },
	{ label: 'image — null', typeKey: 'image', value: null },
	// geometry (the native dispatcher's built-in geometry fallback owns this)
	{ label: 'geometry — object value', typeKey: 'geometry', value: { type: 'Point', coordinates: [1, 2] } },
	{ label: 'geometry — null', typeKey: 'geometry', value: null },
	// relation — single (belongsTo)
	{
		label: 'relation — belongsTo object',
		typeKey: 'relation',
		value: { id: 'u1', displayName: 'Ada Lovelace' },
		metaOverrides: { relationInfo: RELATION_INFO_BELONGS_TO, relationOptions: {} },
	},
	{
		label: 'relation — belongsTo null',
		typeKey: 'relation',
		value: null,
		metaOverrides: { relationInfo: RELATION_INFO_BELONGS_TO, relationOptions: {} },
	},
	// relation — list (hasMany) exercises the chip-limit branch
	{
		label: 'relation — hasMany list with chip overflow',
		typeKey: 'relation',
		value: [{ title: 'one' }, { title: 'two' }, { title: 'three' }, { title: 'four' }],
		metaOverrides: {
			relationInfo: RELATION_INFO_HAS_MANY,
			relationOptions: { relationChipLimit: 2, relationLabelMaxLength: 24 },
		},
	},
];

describe('LOCK 1 — registry.toSheetsCell is a transparent fallback to createSheetsCell', () => {
	const registry = createCellTypeRegistry([], builtins);

	it.each(CASES)('$label', ({ typeKey, value, metaOverrides }) => {
		const metadata = makeMetadata(typeKey, metaOverrides);

		// Direct built-in path (what the registry must mirror).
		const direct = createSheetsCell(value, metadata);

		// Registry path with zero consumer defs — should be 1:1.
		const viaRegistry = registry.toSheetsCell(typeKey, value, makeCtx(metadata));

		expect(viaRegistry).toEqual(direct);
	});

	it('covers every built-in factory family at least once', () => {
		// Guard against silent shrinkage of the representative set.
		const families = new Set(CASES.map((c) => c.typeKey));
		for (const required of ['text', 'number', 'boolean', 'date', 'image', 'relation', 'geometry']) {
			expect(families.has(required)).toBe(true);
		}
	});
});
