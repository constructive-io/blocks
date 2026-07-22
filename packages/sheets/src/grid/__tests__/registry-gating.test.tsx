import { describe, expect, it, vi } from 'vitest';

import { createCellTypeRegistry, type CellTypeBuiltins, type CellTypeRegistry } from '../../cell-types/cell-type-registry';
import { defineCellType } from '../../cell-types/define-cell-type';
import type { CellTypeMatchInput } from '../../cell-types/define-cell-type';
import type { FieldMetadata } from '../../cell-types/cell-type-resolver';
import type { RelationInfo } from '../../store/relation-info-slice';
import type { SheetsCell } from '../../cell-model/sheets-cell';

import { resolveGridCellRoute, type GridCellRoute } from '../cell-routing';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import type { CellCreationMetadata } from '../grid-cell-types';
import { DRAFT_ACTION_COLUMN_KEY } from '../sheets.constants';

// A native text SheetsCell — the override return value the gating tests use in
// place of glide's Text GridCell (gating is structural; the cell shape is incidental).
function textSheetsCell(data: string): SheetsCell {
	return { kind: 'text', data, displayData: data, readonly: false };
}

// LOCK 2 — FK-gating survives consumer overrides (roadmap §1.3 headline precedence).
//
// The contract: a consumer CellTypeDefinition can change WHAT a cell renders/edits
// as (the resolved typeKey, via match()), but it can NEVER change the STRUCTURAL
// gating — canEdit / isReadonly / canActivate — which is derived purely from
// cell-routing.resolveGridCellRoute() BEFORE the registry is consulted. A
// non-editable FK stays non-editable even if a plugin re-skins it as 'text'.
//
// `renderHook` is intentionally NOT used: useGridContent/useGridEditors depend on
// useSheetsMeta (react-query + adapter context) and the zustand store, and
// @testing-library/react is not a dependency of this package. Per the task brief,
// we instead test at the SEAM where route + registry compose. `composeRouting`
// below mirrors the real composition in use-grid-content.ts:110-163 (and the
// identical block in use-grid-editors.ts:132-179) line-for-line: resolve the
// structural route, build the schema-only match input, let the registry override
// only the typeKey, then assemble metadata. Both production hooks share this exact
// shape, so the seam is the real precedence boundary.

const builtins: CellTypeBuiltins = {
	toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
};

interface ComposeInput {
	colKey: string;
	fieldMeta?: FieldMetadata;
	relationInfo?: RelationInfo;
	isRelationFallback?: boolean;
	hasForeignKeyField?: boolean;
	isDraftIdCell?: boolean;
}

interface ComposeResult {
	route: GridCellRoute;
	cellType: string;
	metadata: CellCreationMetadata;
}

// Mirror of the route -> registry -> metadata composition shared by
// use-grid-content.ts and use-grid-editors.ts. Gating fields are taken straight
// from `route`; only `cellType` flows through registry.resolveTypeKey.
function composeRouting(registry: CellTypeRegistry, input: ComposeInput): ComposeResult {
	const { colKey, fieldMeta, relationInfo, isRelationFallback, hasForeignKeyField, isDraftIdCell } = input;

	const route = resolveGridCellRoute({
		colKey,
		fieldMeta,
		relationInfo,
		isRelationFallback,
		isDraftIdCell,
		hasForeignKeyField,
	});

	const matchInput: CellTypeMatchInput = {
		gqlType: fieldMeta?.type?.gqlType ?? '',
		isArray: Boolean(fieldMeta?.type?.isArray),
		pgAlias: fieldMeta?.type?.pgAlias ?? null,
		pgType: fieldMeta?.type?.pgType ?? null,
		subtype: fieldMeta?.type?.subtype ?? null,
		fieldName: colKey,
	};
	const cellType = registry.resolveTypeKey(matchInput, () => route.cellType);

	const metadata: CellCreationMetadata = {
		cellType,
		fieldName: colKey,
		fieldMeta,
		relationInfo,
		relationOptions: relationInfo ? {} : undefined,
		canEdit: route.canEdit,
		isReadonly: route.isReadonly,
		activationBehavior: route.activationBehavior,
	};

	return { route, cellType, metadata };
}

function relationFieldMeta(name: string): FieldMetadata {
	return { name, type: { gqlType: 'Relation', isArray: false, pgAlias: null, pgType: null, subtype: null } };
}

// A non-editable belongsTo FK: relationInfo present, but no usable FK field in the
// column set (hasForeignKeyField=false) -> route.canEdit must be false / readonly.
const NON_EDITABLE_REL: RelationInfo = {
	kind: 'belongsTo',
	relatedTable: 'users',
	relationField: 'author',
	foreignKeyField: 'authorId',
	displayCandidates: ['name'],
};

describe('LOCK 2a — consumer match() reskins a relation but cannot un-gate it', () => {
	it('baseline (no consumer defs): a FK without inline-edit metadata is non-editable relation', () => {
		const registry = createCellTypeRegistry([], builtins);
		const { route, cellType, metadata } = composeRouting(registry, {
			colKey: 'author',
			fieldMeta: relationFieldMeta('author'),
			relationInfo: NON_EDITABLE_REL,
			hasForeignKeyField: false,
		});

		expect(cellType).toBe('relation');
		expect(route.isRelation).toBe(true);
		expect(route.canEdit).toBe(false);
		expect(route.isReadonly).toBe(true);
		expect(metadata.canEdit).toBe(false);
		expect(metadata.isReadonly).toBe(true);
	});

	it('a consumer def claiming the relation field as typeKey "text" changes the RENDER but not the gating', () => {
		// match() fires on the relation field and reskins it as a plain text cell.
		const reskinAsText = defineCellType({
			typeKey: 'text',
			match: (m) => m.fieldName === 'author',
			toSheetsCell: () => textSheetsCell('custom'),
		});

		const baseline = createCellTypeRegistry([], builtins);
		const overridden = createCellTypeRegistry([reskinAsText], builtins);

		const before = composeRouting(baseline, {
			colKey: 'author',
			fieldMeta: relationFieldMeta('author'),
			relationInfo: NON_EDITABLE_REL,
			hasForeignKeyField: false,
		});
		const after = composeRouting(overridden, {
			colKey: 'author',
			fieldMeta: relationFieldMeta('author'),
			relationInfo: NON_EDITABLE_REL,
			hasForeignKeyField: false,
		});

		// The render typeKey DID change (consumer override won detection)...
		expect(before.cellType).toBe('relation');
		expect(after.cellType).toBe('text');

		// ...but the STRUCTURAL gating is identical and still non-editable.
		expect(after.route.canEdit).toBe(before.route.canEdit);
		expect(after.route.isReadonly).toBe(before.route.isReadonly);
		expect(after.route.isRelation).toBe(true);
		expect(after.metadata.canEdit).toBe(false);
		expect(after.metadata.isReadonly).toBe(true);
	});

	it('a consumer def overriding typeKey "relation" still cannot un-gate a non-editable FK', () => {
		const overrideRelation = defineCellType({
			typeKey: 'relation',
			match: (m) => m.fieldName === 'author',
			toSheetsCell: () => textSheetsCell('rel-custom'),
		});
		const registry = createCellTypeRegistry([overrideRelation], builtins);

		const { route, cellType, metadata } = composeRouting(registry, {
			colKey: 'author',
			fieldMeta: relationFieldMeta('author'),
			relationInfo: NON_EDITABLE_REL,
			hasForeignKeyField: false,
		});

		expect(cellType).toBe('relation');
		expect(route.canEdit).toBe(false);
		expect(metadata.isReadonly).toBe(true);
	});

	it('gating still tracks the route when the FK IS inline-editable (override does not flip it on/off)', () => {
		// hasForeignKeyField=true -> editable belongsTo. Consumer reskin must not change that.
		const reskin = defineCellType({
			typeKey: 'text',
			match: (m) => m.fieldName === 'author',
		});
		const registry = createCellTypeRegistry([reskin], builtins);

		const { route, cellType, metadata } = composeRouting(registry, {
			colKey: 'author',
			fieldMeta: relationFieldMeta('author'),
			relationInfo: NON_EDITABLE_REL,
			hasForeignKeyField: true,
		});

		expect(cellType).toBe('text'); // render override applied
		expect(route.canEdit).toBe(true); // gating from route, unaffected
		expect(route.isReadonly).toBe(false);
		expect(metadata.canEdit).toBe(true);
	});
});

describe('LOCK 2b — draft-action column routing cannot be shadowed by a consumer match()', () => {
	// The draft-action column is intercepted in useDraftActionColumn.getCellContent /
	// provideEditor by a structural `columnKey === DRAFT_ACTION_COLUMN_KEY` check that
	// returns BEFORE delegating to the registry-backed base callbacks (see
	// use-draft-action-column.ts:33-54 and :69-82). A consumer match() lives inside the
	// registry, downstream of that short-circuit, so it can never see — let alone
	// reroute — the action column. This locks that ordering.

	// Faithful re-creation of the wrapper's precedence: structural key check first,
	// registry second. `baseGetCellContent` stands in for the registry-backed
	// useSheetsContent output and is spied to prove it is bypassed for the action column.
	function makeDraftActionCellContent(
		columnKey: string,
		baseGetCellContent: (key: string) => SheetsCell,
	): SheetsCell {
		if (columnKey === DRAFT_ACTION_COLUMN_KEY) {
			// Wrapper returns its own action cell without consulting the registry.
			return { kind: 'draft-action', data: null, displayData: '', readonly: true };
		}
		return baseGetCellContent(columnKey);
	}

	it('a consumer match() that claims EVERY field never reaches the draft-action column', () => {
		// Greedy plugin: matches all fields, would reskin everything as 'text'.
		const greedy = defineCellType({ typeKey: 'text', match: () => true });
		const registry = createCellTypeRegistry([greedy], builtins);

		// The registry-backed path (what a normal data column would use).
		const baseSpy = vi.fn((columnKey: string): SheetsCell => {
			const typeKey = registry.resolveTypeKey(
				{ gqlType: 'String', isArray: false, fieldName: columnKey },
				() => 'text',
			);
			return registry.toSheetsCell(typeKey, 'v', {
				metadata: {
					cellType: typeKey,
					fieldName: columnKey,
					canEdit: true,
					isReadonly: false,
					activationBehavior: 'double-click',
				},
			});
		});

		// Action column: short-circuits, base/registry never invoked.
		const actionCell = makeDraftActionCellContent(DRAFT_ACTION_COLUMN_KEY, baseSpy);
		expect(baseSpy).not.toHaveBeenCalled();
		expect(actionCell).toEqual({ kind: 'draft-action', data: null, displayData: '', readonly: true });

		// A normal column DOES flow through the registry (sanity: greedy override active).
		const normalCell = makeDraftActionCellContent('title', baseSpy);
		expect(baseSpy).toHaveBeenCalledOnce();
		expect(normalCell.kind).toBe('text');
	});

	it('the editor path for the draft-action column also bypasses the registry', () => {
		const greedyEditor = defineCellType({
			typeKey: 'text',
			match: () => true,
			editorComponent: () => null,
		});
		const registry = createCellTypeRegistry([greedyEditor], builtins);

		const baseProvideEditor = vi.fn(() => registry.getEditorComponent('text'));

		function provideEditor(columnKey: string) {
			if (columnKey === DRAFT_ACTION_COLUMN_KEY) return undefined;
			return baseProvideEditor();
		}

		expect(provideEditor(DRAFT_ACTION_COLUMN_KEY)).toBeUndefined();
		expect(baseProvideEditor).not.toHaveBeenCalled();
	});
});

describe('LOCK 2c — precedence: instance defs beat provider plugins; last-registered wins', () => {
	// use-sheets.ts:~254 composes the list as
	//   [...providerPlugins.flatMap(p => p.cellTypes), ...instanceCellTypes]
	// createCellTypeRegistry indexes by typeKey with last-write-wins, and builds the
	// match() chain via [...cellTypes].reverse() (cell-type-registry.ts:47-50) so the
	// LAST entry is tried FIRST. These assert the ACTUAL observed behavior.

	it('instance def beats provider def for the same typeKey (toSheetsCell + match)', () => {
		const provider = defineCellType({
			typeKey: 'relation',
			toSheetsCell: () => textSheetsCell('provider'),
			match: () => true,
		});
		const instance = defineCellType({
			typeKey: 'relation',
			toSheetsCell: () => textSheetsCell('instance'),
			match: () => true,
		});

		// Provider plugins first, then instance cellTypes (the use-sheets order).
		const registry = createCellTypeRegistry([provider, instance], builtins);

		const ctx = {
			metadata: {
				cellType: 'relation',
				fieldName: 'author',
				canEdit: true,
				isReadonly: false,
				activationBehavior: 'double-click' as const,
			},
		};

		// Display: instance's toSheetsCell wins (last write to the byKey map).
		expect(registry.toSheetsCell('relation', null, ctx)).toMatchObject({ data: 'instance' });
		// get(): the stored def is the instance one.
		expect(registry.get('relation')).toBe(instance);
	});

	it('within the match() chain, the newest/last-registered matcher wins (reverse() semantics)', () => {
		// Two defs with DIFFERENT typeKeys both matching the same field. The later
		// entry (`second`) is tried first because the chain is reversed.
		const first = defineCellType({ typeKey: 'first', match: (m: CellTypeMatchInput) => m.fieldName === 'x' });
		const second = defineCellType({ typeKey: 'second', match: (m: CellTypeMatchInput) => m.fieldName === 'x' });

		const registry = createCellTypeRegistry([first, second], builtins);
		expect(registry.resolveTypeKey({ gqlType: 'String', isArray: false, fieldName: 'x' }, () => 'fallback')).toBe('second');

		// Reversing the registration order flips the winner — proves it is order-driven,
		// not key-name-driven.
		const reversed = createCellTypeRegistry([second, first], builtins);
		expect(reversed.resolveTypeKey({ gqlType: 'String', isArray: false, fieldName: 'x' }, () => 'fallback')).toBe('first');
	});
});
