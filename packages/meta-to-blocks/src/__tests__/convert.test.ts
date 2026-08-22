import { describe, expect, it } from 'vitest';
import { collectFieldNames, findNodeByKey, parseDocument } from 'blocks-schema';
import {
	tableToDetailDocument,
	tableToFormDocument,
	tableToListDocument,
	tableToNodes,
} from '../convert';
import { tableToSchema } from '../schema';
import { titleize } from '../naming';
import type { MetaTable } from '../types';

const posts: MetaTable = {
	name: 'posts',
	schemaName: 'app_public',
	description: 'Blog posts',
	query: { all: 'allPosts', one: 'postById' },
	fields: [
		{ name: 'id', type: { gqlType: 'UUID', pgType: 'uuid' }, isNotNull: true, hasDefault: true, isPrimaryKey: true },
		{ name: 'title', type: { gqlType: 'String', pgType: 'character varying(120)' }, isNotNull: true },
		{ name: 'body', type: { gqlType: 'String', pgType: 'text' } },
		{ name: 'status', type: { gqlType: 'PostStatus', pgType: 'post_status' }, enumValues: { name: 'PostStatus', values: ['draft', 'published'] } },
		{ name: 'views', type: { gqlType: 'Int', pgType: 'int4' }, isNotNull: true, hasDefault: true },
		{ name: 'is_featured', type: { gqlType: 'Boolean', pgType: 'bool' }, isNotNull: true },
		{ name: 'published_at', type: { gqlType: 'Datetime', pgType: 'timestamptz', encoding: { kind: 'datetime' } } },
		{ name: 'metadata', type: { gqlType: 'JSON', pgType: 'jsonb' } },
		{ name: 'tags', type: { gqlType: '[String]', pgType: 'text[]', isArray: true } },
		{ name: 'author_id', type: { gqlType: 'UUID', pgType: 'uuid' }, isNotNull: true, isForeignKey: true },
		{ name: 'created_at', type: { gqlType: 'Datetime', pgType: 'timestamptz' }, isNotNull: true, hasDefault: true },
	],
	constraints: {
		primaryKey: { fields: [{ name: 'id' }] },
		foreignKey: [{ name: 'posts_author_id_fkey', fields: [{ name: 'author_id' }], referencedTable: 'users', referencedFields: ['id'] }],
	},
	relations: {
		hasMany: [{ fieldName: 'comments', isUnique: false, referencedBy: { name: 'comments' }, keys: [{ name: 'post_id' }] }],
		manyToMany: [{ fieldName: 'categories', rightTable: { name: 'categories' }, junctionTable: { name: 'post_categories' } }],
	},
};

function fieldsOf(document: ReturnType<typeof tableToFormDocument>) {
	return findNodeByKey(document.page, 'form')?.children ?? [];
}

describe('tableToFormDocument', () => {
	it('produces a valid document without the columns the database fills in', () => {
		const document = tableToFormDocument(posts);

		expect(() => parseDocument(document)).not.toThrow();
		expect(document.id).toBe('posts-form');
		expect(document.page.props.title).toBe('Posts');
		expect(collectFieldNames(document.page)).not.toContain('id');
		expect(collectFieldNames(document.page)).not.toContain('created_at');
		expect(collectFieldNames(document.page)).toContain('title');
	});

	it('picks widgets from column types', () => {
		const byName = new Map(fieldsOf(tableToFormDocument(posts)).map((node) => [node.props.name, node]));

		expect(byName.get('title')?.type).toBe('Input');
		expect(byName.get('body')?.type).toBe('Textarea');
		expect(byName.get('status')?.type).toBe('RadioGroup');
		expect(byName.get('views')?.type).toBe('NumberInput');
		expect(byName.get('is_featured')?.type).toBe('Switch');
		expect(byName.get('published_at')?.type).toBe('DateTimePicker');
		expect(byName.get('metadata')?.type).toBe('JsonEditor');
	});

	it('requires NOT NULL columns without a default and marks nullable ones', () => {
		const byName = new Map(tableToNodes(posts).map((node) => [node.props.name, node]));

		expect(byName.get('title')?.props.required).toBe(true);
		expect(byName.get('views')?.props.required).toBeUndefined();
		expect(byName.get('body')?.props.nullable).toBe(true);
	});

	it('carries varchar length into constraints', () => {
		const byName = new Map(tableToNodes(posts).map((node) => [node.props.name, node]));
		expect(byName.get('title')?.props.constraints).toEqual({ maxLength: 120 });
	});

	it('turns foreign keys into a relation picker labelled without the id suffix', () => {
		const author = tableToNodes(posts).find((node) => node.props.name === 'author_id');

		expect(author?.type).toBe('Select');
		expect(author?.props.label).toBe('Author');
		expect(author?.props.relation).toEqual({ table: 'users', field: 'id' });
	});

	it('lowers array columns to repeatable sections', () => {
		const tags = tableToNodes(posts).find((node) => node.key === 'tags');

		expect(tags?.type).toBe('Section');
		expect(tags?.props.repeatable).toBe(true);
		expect(tags?.children[0].type).toBe('Textarea');
	});

	it('shows the primary key disabled in update mode', () => {
		const nodes = tableToNodes(posts, { mode: 'update' });
		const id = nodes.find((node) => node.props.name === 'id');

		expect(id?.props.disabled).toBe(true);
	});

	it('honours per-field overrides, omissions and ordering', () => {
		const nodes = tableToNodes(posts, {
			fields: { body: { widget: 'MarkdownEditor', label: 'Content' }, metadata: { omit: true } },
			omitFields: ['tags'],
			fieldOrder: ['body'],
		});

		expect(nodes[0].props.name).toBe('body');
		expect(nodes[0].type).toBe('MarkdownEditor');
		expect(nodes[0].props.label).toBe('Content');
		expect(nodes.map((node) => node.props.name)).not.toContain('metadata');
		expect(nodes.map((node) => node.key)).not.toContain('tags');
	});

	it('accepts custom widget rules ahead of the defaults', () => {
		const nodes = tableToNodes(posts, {
			rules: [{ name: 'json-code', match: (ctx) => ctx.schema.format === 'json', node: 'CodeEditor' }],
		});

		expect(nodes.find((node) => node.props.name === 'metadata')?.type).toBe('CodeEditor');
	});

	it('can skip the form wrapper', () => {
		const document = tableToFormDocument(posts, { form: false, rootKey: 'root' });

		expect(document.page.key).toBe('root');
		expect(document.page.children[0].props.name).toBe('title');
	});
});

describe('tableToListDocument', () => {
	it('emits a DataTable with narrow columns and the row key', () => {
		const document = tableToListDocument(posts, { maxColumns: 4 });
		const table = document.page.children[0];

		expect(() => parseDocument(document)).not.toThrow();
		expect(table.type).toBe('DataTable');
		expect(table.props.table).toBe('posts');
		expect(table.props.query).toBe('allPosts');
		expect(table.props.rowKey).toEqual(['id']);
		expect((table.props.columns as { name: string }[]).map((column) => column.name)).toEqual([
			'id',
			'title',
			'body',
			'status',
		]);
	});

	it('respects an explicit column list', () => {
		const table = tableToListDocument(posts, { columns: ['title', 'views'] }).page.children[0];

		expect((table.props.columns as { name: string; label: string }[])).toEqual([
			{ name: 'title', label: 'Title', type: 'string' },
			{ name: 'views', label: 'Views', type: 'integer' },
		]);
	});
});

describe('tableToDetailDocument', () => {
	it('emits a DetailPanel plus a RelationList per child relation', () => {
		const document = tableToDetailDocument(posts);
		const [panel, comments, categories] = document.page.children;

		expect(() => parseDocument(document)).not.toThrow();
		expect(panel.type).toBe('DetailPanel');
		expect((panel.props.fields as { name: string }[]).map((field) => field.name)).toContain('id');
		expect(comments.type).toBe('RelationList');
		expect(comments.props).toMatchObject({ table: 'comments', relation: 'hasMany', foreignKey: ['post_id'] });
		expect(categories.props).toMatchObject({
			table: 'categories',
			relation: 'manyToMany',
			junctionTable: 'post_categories',
		});
	});

	it('can leave relations out', () => {
		const document = tableToDetailDocument(posts, { relations: false });
		expect(document.page.children).toHaveLength(1);
	});
});

describe('tableToSchema', () => {
	it('lowers a table to a JSON Schema object usable on its own', () => {
		const schema = tableToSchema(posts);

		expect(schema.type).toBe('object');
		expect(schema.required).toEqual(['title', 'is_featured', 'author_id']);
		expect(schema.properties?.status).toMatchObject({ enum: ['draft', 'published'] });
		expect(schema.properties?.published_at).toMatchObject({ format: 'date-time' });
	});

	it('falls back to a bounded string for unknown column types', () => {
		const schema = tableToSchema({
			name: 'widgets',
			fields: [{ name: 'shape', type: { gqlType: 'Shape', pgType: 'shape' }, isNotNull: true }],
		});

		expect(schema.properties?.shape).toMatchObject({ type: 'string', maxLength: 255 });
	});
});

describe('titleize', () => {
	it('sentence cases names, preserves acronyms and drops an id suffix', () => {
		expect(titleize('first_name')).toBe('First name');
		expect(titleize('apiURL')).toBe('Api URL');
		expect(titleize('author_id')).toBe('Author');
		expect(titleize('id')).toBe('Id');
	});
});
