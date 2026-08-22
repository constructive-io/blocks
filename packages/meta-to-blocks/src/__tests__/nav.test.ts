import { describe, expect, it } from 'vitest';
import { findNodeByKey, parseDocument, walkNodes } from 'blocks-schema';
import { metaToNavDocument, metaToNavNodes } from '../nav';
import type { MetaTable } from '../types';

const posts: MetaTable = {
	name: 'posts',
	schemaName: 'app_public',
	description: 'Blog posts',
	relations: {
		manyToMany: [{ fieldName: 'categories', rightTable: { name: 'categories' }, junctionTable: { name: 'post_categories' } }],
	},
};

const categories: MetaTable = { name: 'categories', schemaName: 'app_public' };
const postCategories: MetaTable = { name: 'post_categories', schemaName: 'app_public' };
const auditLog: MetaTable = { name: 'audit_log_entries', schemaName: 'app_private' };

const tables = [posts, categories, postCategories, auditLog];

function links(document: ReturnType<typeof metaToNavDocument>) {
	return [...walkNodes(document.page)].filter((node) => node.type === 'NavLink');
}

describe('metaToNavDocument', () => {
	it('produces a valid document with one group per schema', () => {
		const document = metaToNavDocument(tables);

		expect(() => parseDocument(document)).not.toThrow();
		expect(document.id).toBe('nav');

		const groups = findNodeByKey(document.page, 'nav')?.children ?? [];
		expect(groups.map((group) => group.props.label)).toEqual(['App public', 'App private']);
		expect(groups.map((group) => group.props.count)).toEqual([2, 1]);
	});

	it('links each table at its list route, titleized', () => {
		const document = metaToNavDocument(tables);

		expect(links(document).map((link) => [link.props.label, link.props.href])).toEqual([
			['Posts', '/posts'],
			['Categories', '/categories'],
			['Audit log entries', '/audit_log_entries'],
		]);
	});

	it('omits join tables, which carry nothing a console can show', () => {
		expect(links(metaToNavDocument(tables)).map((link) => link.props.table)).not.toContain('post_categories');
		expect(links(metaToNavDocument(tables, { includeJunctionTables: true })).map((link) => link.props.table)).toContain(
			'post_categories'
		);
	});

	it('takes the host route shape, per-table overrides and an explicit order', () => {
		const document = metaToNavDocument(tables, {
			href: (table) => `/admin/${table.schemaName}/${table.name}`,
			tables: { categories: { label: 'Taxonomy' }, audit_log_entries: { omit: true } },
			tableOrder: ['categories'],
		});

		expect(links(document).map((link) => [link.props.label, link.props.href])).toEqual([
			['Taxonomy', '/admin/app_public/categories'],
			['Posts', '/admin/app_public/posts'],
		]);
	});

	it('emits a flat link list when grouping is off, including for schema-less meta', () => {
		expect(metaToNavNodes(tables, { group: false }).map((node) => node.type)).toEqual([
			'NavLink',
			'NavLink',
			'NavLink',
		]);

		const flat = metaToNavNodes([{ name: 'widgets' }]);
		expect(flat[0].props.label).toBeUndefined();
		expect(flat[0].children[0].key).toBe('nav.widgets');
	});
});
