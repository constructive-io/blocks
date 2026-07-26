import { describe, expect, it } from 'vitest';

import type { FieldMetadata } from '../../cell-types/cell-type-resolver';
import type { RelationInfo } from '../../store/relation-info-slice';

import { buildRelationFieldNameSet, resolveEditorLocation, resolveGridCellRoute } from '../cell-routing';

function makeFieldMeta(name: string, gqlType: string, overrides?: Partial<NonNullable<FieldMetadata['type']>>): FieldMetadata {
	return {
		name,
		type: {
			gqlType,
			isArray: false,
			pgAlias: null,
			pgType: null,
			subtype: null,
			...overrides,
		},
	};
}

describe('cell-routing', () => {
	it('prefers concrete cell location over active cell fallback', () => {
		const resolved = resolveEditorLocation({
			cellLocation: [1, 2],
			activeCell: [0, 0],
			columnKeys: ['id', 'name', 'email'],
			dataLength: 5,
		});

		expect(resolved).toEqual({
			colIndex: 1,
			rowIndex: 2,
			colKey: 'name',
		});
	});

	it('falls back to active cell when cell location is unavailable', () => {
		const resolved = resolveEditorLocation({
			activeCell: [2, 1],
			columnKeys: ['id', 'name', 'email'],
			dataLength: 3,
		});

		expect(resolved).toEqual({
			colIndex: 2,
			rowIndex: 1,
			colKey: 'email',
		});
	});

	it('returns null for invalid editor coordinates', () => {
		expect(
			resolveEditorLocation({
				cellLocation: [2, 100],
				columnKeys: ['id', 'name', 'email'],
				dataLength: 3,
			}),
		).toBeNull();
	});

	it('routes relation fallback columns as relation even before enriched relation info is ready', () => {
		const fieldMeta = makeFieldMeta('author', 'Relation');
		const route = resolveGridCellRoute({
			colKey: 'author',
			fieldMeta,
			isRelationFallback: true,
		});

		expect(route.cellType).toBe('relation');
		expect(route.isRelation).toBe(true);
		expect(route.canActivate).toBe(true);
		expect(route.canEdit).toBe(false);
	});

	it('allows belongsTo inline edit only when foreign key metadata is available', () => {
		const relationInfo: RelationInfo = {
			kind: 'belongsTo',
			relationField: 'author',
			foreignKeyField: 'authorId',
			displayCandidates: ['name'],
		};

		const editableRoute = resolveGridCellRoute({
			colKey: 'author',
			fieldMeta: makeFieldMeta('author', 'Relation'),
			relationInfo,
			hasForeignKeyField: true,
		});
		const readonlyRoute = resolveGridCellRoute({
			colKey: 'author',
			fieldMeta: makeFieldMeta('author', 'Relation'),
			relationInfo,
			hasForeignKeyField: false,
		});

		expect(editableRoute.canEdit).toBe(true);
		expect(editableRoute.isReadonly).toBe(false);
		expect(readonlyRoute.canEdit).toBe(false);
		expect(readonlyRoute.isReadonly).toBe(true);
	});

	it('blocks draft id overlay editing regardless of column metadata', () => {
		const route = resolveGridCellRoute({
			colKey: 'id',
			fieldMeta: makeFieldMeta('id', 'UUID'),
			isDraftIdCell: true,
		});

		expect(route.canActivate).toBe(false);
		expect(route.canEdit).toBe(false);
		expect(route.isReadonly).toBe(true);
	});

	it('collects relation field names consistently from metadata', () => {
		const meta = {
			_meta: {
				tables: [
					{
						name: 'posts',
						relations: {
							belongsTo: [{ fieldName: 'author', keys: [{ name: 'authorId' }] }],
							hasOne: [{ fieldName: 'coverImage' }],
							hasMany: [{ fieldName: 'comments' }],
							manyToMany: [{ fieldName: 'tags' }],
						},
					},
				],
			},
		} as any;

		const fields = buildRelationFieldNameSet(meta, 'posts');

		expect(fields.has('author')).toBe(true);
		expect(fields.has('authorId')).toBe(true);
		expect(fields.has('coverImage')).toBe(true);
		expect(fields.has('comments')).toBe(true);
		expect(fields.has('tags')).toBe(true);
	});
});
