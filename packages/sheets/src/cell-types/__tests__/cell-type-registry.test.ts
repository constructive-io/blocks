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

});
