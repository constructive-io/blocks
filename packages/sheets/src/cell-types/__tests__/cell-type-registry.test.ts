import { describe, expect, it } from 'vitest';

import type { SheetsCell } from '../../cell-model/sheets-cell';
import { defineCellType } from '../define-cell-type';
import { createCellTypeRegistry, type CellTypeBuiltins } from '../cell-type-registry';

function textCell(data: string): SheetsCell {
	return { kind: 'text', data, displayData: data, readonly: false };
}

function makeBuiltins(overrides?: Partial<CellTypeBuiltins>): CellTypeBuiltins {
	return {
		toSheetsCell: (value) => textCell(`builtin:${String(value)}`),
		...overrides,
	};
}

const ctx = { metadata: { cellType: 'x', fieldName: 'f', canEdit: true, isReadonly: false, activationBehavior: 'double-click' as const } };

describe('createCellTypeRegistry', () => {
	it('falls back to the built-in renderer when no def matches the typeKey', () => {
		const reg = createCellTypeRegistry([], makeBuiltins());
		expect(reg.toSheetsCell('text', 'hi', ctx)).toMatchObject({ data: 'builtin:hi' });
		expect(reg.getEditorComponent('text')).toBeUndefined();
		expect(reg.get('text')).toBeUndefined();
	});

	it('overrides display + editor by typeKey', () => {
		const editorComponent = () => null;
		const rating = defineCellType<number>({
			typeKey: 'rating',
			toSheetsCell: (v) => textCell(`★${v}`),
			editorComponent,
		});
		const reg = createCellTypeRegistry([rating], makeBuiltins());
		expect(reg.toSheetsCell('rating', 3, ctx)).toMatchObject({ data: '★3' });
		expect(reg.getEditorComponent('rating')).toBe(editorComponent);
		expect(reg.get('rating')?.typeKey).toBe('rating');
	});

	it('a def can override only the editor and keep the built-in display', () => {
		const editorComponent = () => null;
		const reg = createCellTypeRegistry([defineCellType({ typeKey: 'text', editorComponent })], makeBuiltins());
		// display still built-in:
		expect(reg.toSheetsCell('text', 'hi', ctx)).toMatchObject({ data: 'builtin:hi' });
		// editor overridden (not undefined):
		expect(reg.getEditorComponent('text')).toBe(editorComponent);
	});

	it('instance defs win over provider defs by typeKey and by match', () => {
		const provider = defineCellType({ typeKey: 'relation', toSheetsCell: () => textCell('provider'), match: () => true });
		const instance = defineCellType({ typeKey: 'relation', toSheetsCell: () => textCell('instance'), match: () => true });
		// precedence order = [...provider, ...instance]
		const reg = createCellTypeRegistry([provider, instance], makeBuiltins());
		expect(reg.toSheetsCell('relation', null, ctx)).toMatchObject({ data: 'instance' });
		// match: later (instance) def wins
		expect(reg.resolveTypeKey({ gqlType: 'X', isArray: false }, () => 'fallback')).toBe('relation');
	});

	it('resolveTypeKey returns the builtin fallback when no consumer match hits', () => {
		const reg = createCellTypeRegistry([defineCellType({ typeKey: 'rating', match: (m) => m.pgAlias === 'rating' })], makeBuiltins());
		expect(reg.resolveTypeKey({ gqlType: 'Int', isArray: false, pgAlias: 'rating' }, () => 'number')).toBe('rating');
		expect(reg.resolveTypeKey({ gqlType: 'Int', isArray: false }, () => 'number')).toBe('number');
	});

	it('resolves the consumer cell COMPONENT override for a typeKey', () => {
		const CellView = () => null;
		const reg = createCellTypeRegistry([defineCellType({ typeKey: 'c', cell: CellView })], makeBuiltins());
		expect(reg.getCellComponent('c')).toBe(CellView);
		expect(reg.getCellComponent('text')).toBeUndefined();
	});
});

// LOCK 3 — Per-instance isolation (roadmap §1.3).
//
// Each <SheetsProvider> builds its own registry once (use-sheets.ts:251-266 memoizes
// createCellTypeRegistry over [...providerPlugins, ...instanceCellTypes]). Two
// registries built from different cell-type sets must NOT share state: indexing a def
// into one, or "extending" one set into a larger one, must never bleed into the other.
// Because the registry has no mutating API, this also pins that createCellTypeRegistry
// does not mutate the input array (the match-chain reverse() must operate on a copy).
describe('createCellTypeRegistry — per-instance isolation (LOCK 3)', () => {
	const textBuiltins = makeBuiltins();

	it('two registries from different plugin sets resolve independently', () => {
		const ratingDef = defineCellType({ typeKey: 'rating', match: (m) => m.fieldName === 'score', toSheetsCell: () => textCell('★') });
		const colorDef = defineCellType({ typeKey: 'color', match: (m) => m.fieldName === 'score', toSheetsCell: () => textCell('#') });

		const regA = createCellTypeRegistry([ratingDef], textBuiltins);
		const regB = createCellTypeRegistry([colorDef], textBuiltins);

		// Same input, different registries -> each only knows its own def.
		const input = { gqlType: 'Int', isArray: false, fieldName: 'score' };
		expect(regA.resolveTypeKey(input, () => 'number')).toBe('rating');
		expect(regB.resolveTypeKey(input, () => 'number')).toBe('color');

		// get()/toSheetsCell are likewise scoped.
		expect(regA.get('rating')?.typeKey).toBe('rating');
		expect(regA.get('color')).toBeUndefined();
		expect(regB.get('color')?.typeKey).toBe('color');
		expect(regB.get('rating')).toBeUndefined();
		expect(regA.toSheetsCell('rating', 5, ctx)).toMatchObject({ data: '★' });
		expect(regB.toSheetsCell('color', 5, ctx)).toMatchObject({ data: '#' });
	});

	it('"extending" a base set into a larger set does not affect a registry built from the base alone', () => {
		// Mirrors the use-sheets composition: provider plugins as the base, instance
		// cellTypes appended to form the extended set. Both registries are independent.
		const providerDef = defineCellType({ typeKey: 'relation', toSheetsCell: () => textCell('provider'), match: () => true });
		const instanceDef = defineCellType({ typeKey: 'relation', toSheetsCell: () => textCell('instance'), match: () => true });

		const baseSet = [providerDef];
		const baseRegistry = createCellTypeRegistry(baseSet, textBuiltins);

		// Extended set = base + instance overrides (new array, as useSheets builds it).
		const extendedRegistry = createCellTypeRegistry([...baseSet, instanceDef], textBuiltins);

		// Base registry is untouched by the extension: still the provider def.
		expect(baseRegistry.toSheetsCell('relation', null, ctx)).toMatchObject({ data: 'provider' });
		expect(baseRegistry.get('relation')).toBe(providerDef);

		// Extended registry sees the instance override (last-write-wins).
		expect(extendedRegistry.toSheetsCell('relation', null, ctx)).toMatchObject({ data: 'instance' });
		expect(extendedRegistry.get('relation')).toBe(instanceDef);
	});

	it('does not mutate the input cell-types array (match-chain reverse() works on a copy)', () => {
		const a = defineCellType({ typeKey: 'a', match: () => false });
		const b = defineCellType({ typeKey: 'b', match: () => false });
		const input = [a, b];
		const snapshot = [...input];

		createCellTypeRegistry(input, textBuiltins);

		// Order and contents of the caller's array are preserved.
		expect(input).toEqual(snapshot);
		expect(input[0]).toBe(a);
		expect(input[1]).toBe(b);
	});

	it('cell COMPONENT overrides are independent per registry', () => {
		const CellA = () => null;
		const CellB = () => null;
		const regA = createCellTypeRegistry([defineCellType({ typeKey: 'ca', cell: CellA })], textBuiltins);
		const regB = createCellTypeRegistry([defineCellType({ typeKey: 'cb', cell: CellB })], textBuiltins);

		expect(regA.getCellComponent('ca')).toBe(CellA);
		expect(regA.getCellComponent('cb')).toBeUndefined();
		expect(regB.getCellComponent('cb')).toBe(CellB);
		expect(regB.getCellComponent('ca')).toBeUndefined();
	});
});
