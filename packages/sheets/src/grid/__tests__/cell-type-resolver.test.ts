import { describe, expect, it } from 'vitest';

import { resolveCellType, type FieldMetadata } from '../../cell-types/cell-type-resolver';

function field(type: FieldMetadata['type']): FieldMetadata {
	return { name: 'value', type };
}

describe('resolveCellType', () => {
	it('applies schema metadata precedence before the GraphQL fallback', () => {
		const cases: Array<[FieldMetadata, string]> = [
			[field({ gqlType: 'String', isArray: true, pgType: 'uuid', pgAlias: 'image' }), 'image'],
			[field({ gqlType: 'String', isArray: true, pgType: 'uuid' }), 'text-array'],
			[field({ gqlType: 'String', pgType: 'uuid' }), 'uuid'],
			[field({ gqlType: 'GeoJSON', subtype: 'GeometryPoint' }), 'geometry-point'],
			[field({ gqlType: 'Mystery' }), 'text'],
		];

		for (const [metadata, expected] of cases) {
			expect(resolveCellType('value', metadata).cellType).toBe(expected);
		}
	});

	it('makes only schema-owned identifiers and timestamps readonly', () => {
		expect(resolveCellType('id', field({ gqlType: 'UUID' }))).toMatchObject({
			cellType: 'uuid',
			canEdit: false,
			canActivate: false,
			isReadonly: true,
		});
		expect(resolveCellType('id', field({ gqlType: 'Int' }))).toMatchObject({
			cellType: 'integer',
			canEdit: true,
			isReadonly: false,
		});
		expect(resolveCellType('createdAt')).toMatchObject({ canEdit: false, isReadonly: true });
	});

	it('keeps viewer-only search vectors activatable without making them editable', () => {
		expect(resolveCellType('search', field({ gqlType: 'String', pgType: 'tsvector' }))).toMatchObject({
			cellType: 'tsvector',
			canEdit: false,
			canActivate: true,
		});
	});
});
