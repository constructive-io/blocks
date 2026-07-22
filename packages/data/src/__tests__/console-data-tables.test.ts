import { describe, expect, it } from 'vitest';

import {
	DEFAULT_CONSOLE_APPLICATION_SCOPES,
	selectConsoleDataTables,
} from '../console-data-tables';
import type { MetaField, MetaTable, MetaschemaScope } from '../meta-query.types';

function field(name: string): MetaField {
	return {
		name,
		type: { gqlType: 'UUID', pgType: 'uuid', isArray: false },
	};
}

function scope(value: string): MetaschemaScope {
	return { scope: value, tier: 'database', source: 'smartTag' };
}

function table(
	name: string,
	options: {
		schemaName?: string;
		scope?: string;
		fields?: MetaField[];
	} = {},
): MetaTable {
	return {
		name,
		schemaName: options.schemaName,
		scope: options.scope === undefined ? null : scope(options.scope),
		fields: options.fields ?? [field('id')],
		relations: { manyToMany: [] },
	} as MetaTable;
}

describe('selectConsoleDataTables', () => {
	it('classifies application tables only from exact semantic smart-tag scopes', () => {
		const tables = [
			table('Project', { schemaName: 'tenant-a1b2c3-app-public', scope: 'app' }),
			table('LegacyAppSchema', { schemaName: 'app-public' }),
			table('MisleadingAuthTable', { schemaName: 'auth-public', scope: 'app' }),
			table('FrameworkTable', { schemaName: 'app-public', scope: 'auth' }),
		];

		expect(DEFAULT_CONSOLE_APPLICATION_SCOPES).toEqual(['app']);
		expect(selectConsoleDataTables(tables).map(({ name }) => name)).toEqual([
			'MisleadingAuthTable',
			'Project',
		]);
	});

	it('supports an exact host-provided semantic scope set', () => {
		const tables = [
			table('Project', { scope: 'app' }),
			table('InternalReport', { scope: 'internal' }),
			table('Session', { scope: 'auth' }),
		];

		expect(
			selectConsoleDataTables(tables, { applicationScopes: ['internal', 'app'] }).map(
				({ name }) => name,
			),
		).toEqual(['InternalReport', 'Project']);
	});

	it('rejects scope-shaped metadata that did not come from a smart tag', () => {
		const inferred = table('Inferred', { scope: 'app' });
		inferred.scope = { ...scope('app'), source: 'inference' as never };

		expect(selectConsoleDataTables([inferred])).toEqual([]);
	});

	it('keeps storage-owned tables out even when they use an application scope', () => {
		const bucket = table('Bucket', { scope: 'app' });
		bucket.storage = { isBucketsTable: true, isFilesTable: false };

		expect(selectConsoleDataTables([bucket, table('Document', { scope: 'app' })])).toEqual([
			expect.objectContaining({ name: 'Document' }),
		]);
	});

	it('hides every identified many-to-many junction, including junctions with domain fields', () => {
		const post = table('Post', { scope: 'app' });
		post.relations = {
			manyToMany: [
				{
					fieldName: 'assignees',
					type: 'UserConnection',
					junctionTable: { name: 'postAssignments' },
					junctionLeftKeyAttributes: [field('post_id')],
					junctionRightKeyAttributes: [field('user_id')],
				} as never,
			],
		};
		const assignment = table('PostAssignment', {
			scope: 'app',
			fields: [field('postId'), field('userId'), field('role')],
		});

		expect(selectConsoleDataTables([post, assignment]).map(({ name }) => name)).toEqual(['Post']);
	});

	it('supports explicit exclusions and deduplicates physical table identifiers', () => {
		const alpha = table('Alpha', { schemaName: 'app-public', scope: 'app' });
		const duplicateAlpha = table('Alpha', { schemaName: 'app-public', scope: 'app' });
		const beta = table('Beta', { schemaName: 'app-public', scope: 'app' });

		expect(
			selectConsoleDataTables([alpha, duplicateAlpha, beta], {
				excludeTables: ['app-public.Beta'],
			}),
		).toEqual([alpha]);
	});
});
