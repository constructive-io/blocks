import { describe, expect, it } from 'vitest';

import { resolveCellType, type FieldMetadata } from '../../cell-types/cell-type-resolver';

function field(type: FieldMetadata['type']): FieldMetadata {
	return { name: 'value', type };
}

describe('resolveCellType', () => {
	it('applies schema metadata precedence before the GraphQL fallback', () => {
		const cases: Array<[FieldMetadata, string]> = [
			// The server no longer sends an alias, so a stale one never outranks the real type.
			[field({ gqlType: 'String', isArray: true, pgType: 'uuid', pgAlias: 'image' }), 'text-array'],
			[field({ gqlType: 'String', isArray: true, pgType: 'uuid' }), 'text-array'],
			[field({ gqlType: 'BigInt', pgType: 'int8' }), 'bigint'],
			[field({ gqlType: 'BitString', pgType: 'bit' }), 'bitstring'],
			[field({ gqlType: 'String', pgType: 'uuid' }), 'uuid'],
			[field({ gqlType: 'GeoJSON', subtype: 'GeometryPoint' }), 'geometry-point'],
			[field({ gqlType: 'Mystery' }), 'text'],
		];

		for (const [metadata, expected] of cases) {
			expect(resolveCellType('value', metadata).cellType).toBe(expected);
		}
	});

	it('never makes a field read-only by its name (write rules come from the table model)', () => {
		expect(resolveCellType('id', field({ gqlType: 'UUID' }))).toMatchObject({
			cellType: 'uuid',
			canEdit: true,
			isReadonly: false,
		});
		expect(resolveCellType('createdAt', field({ gqlType: 'Datetime' }))).toMatchObject({ canEdit: true, isReadonly: false });
	});

	it('keeps viewer-only search vectors activatable without making them editable', () => {
		expect(resolveCellType('search', field({ gqlType: 'String', pgType: 'tsvector' }))).toMatchObject({
			cellType: 'tsvector',
			canEdit: false,
			canActivate: true,
		});
	});
});
