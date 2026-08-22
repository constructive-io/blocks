/**
 * `_meta` → documents: the three screens a table implies.
 *
 * Forms lower through JSON Schema so `json-schema-to-blocks` picks the widgets;
 * list and detail screens are block nodes (`DataTable`, `DetailPanel`,
 * `RelationList`) whose props carry the table facts a renderer needs to fetch
 * rows. Everything returned is a plain `UIDocument`: persist it, hand-edit it,
 * or layer overrides on it with `composeDocument`.
 */

import { createDocument, type UIDocument, type UINode } from 'blocks-schema';
import { schemaToNodes } from 'json-schema-to-blocks';
import { selectFields, structuredConstraints, tableToSchema, typeToSchema } from './schema';
import { titleize } from './naming';
import type { DetailOptions, FormOptions, ListOptions, MetaField, MetaOptions, MetaTable } from './types';

/** Columns too wide or too structural to sit in a table cell by default. */
const WIDE_FORMATS = new Set(['json', 'data-url']);

const DEFAULT_MAX_COLUMNS = 8;

function screenTitle(table: MetaTable, options: MetaOptions): string {
	return options.title ?? titleize(table.name);
}

function documentId(table: MetaTable, options: MetaOptions, kind: string): string {
	return options.id ?? `${table.name}-${kind}`;
}

/** Facts a renderer needs to query the table, carried on the block node. */
function tableProps(table: MetaTable): Record<string, unknown> {
	return {
		table: table.name,
		...(table.schemaName ? { schemaName: table.schemaName } : {}),
		...(table.query?.all ? { query: table.query.all } : {}),
		...(table.query?.one ? { queryOne: table.query.one } : {}),
	};
}

function primaryKeyFields(table: MetaTable): string[] {
	const fromConstraints = structuredConstraints(table)?.primaryKey?.fields;
	const fromLegacy = table.primaryKeyConstraints?.find((entry) => entry?.fields)?.fields;
	const fields = fromConstraints ?? fromLegacy;
	const names = (fields ?? []).map((field) => field?.name).filter((name): name is string => Boolean(name));
	if (names.length > 0) return names;

	return (table.fields ?? [])
		.filter((field): field is MetaField => Boolean(field?.isPrimaryKey))
		.map((field) => field.name);
}

/**
 * The columns worth showing in a grid: narrow scalars first, capped, because a
 * generated list with forty columns is unusable.
 */
function listColumns(table: MetaTable, options: ListOptions): MetaField[] {
	const fields = selectFields(table, { ...options, includeSystemFields: options.includeSystemFields ?? true });

	if (options.columns?.length) {
		const wanted = new Map(fields.map((field) => [field.name, field]));
		return options.columns.map((name) => wanted.get(name)).filter((field): field is MetaField => Boolean(field));
	}

	const narrow = fields.filter((field) => {
		const schema = typeToSchema(field.type);
		return !WIDE_FORMATS.has(String(schema.format ?? ''));
	});

	return narrow.slice(0, options.maxColumns ?? DEFAULT_MAX_COLUMNS);
}

function columnNode(field: MetaField, override?: { label?: string }): Record<string, unknown> {
	const schema = typeToSchema(field.type);
	return {
		name: field.name,
		label: override?.label ?? titleize(field.name),
		type: schema.format ?? schema.type,
		...(field.isPrimaryKey ? { primaryKey: true } : {}),
	};
}

/** Form field nodes for a table, without a document envelope. */
export function tableToNodes(table: MetaTable, options: FormOptions = {}): UINode[] {
	// A create form omits database-maintained columns; an update form shows the
	// primary key but does not let it be edited.
	const includeSystemFields = options.includeSystemFields ?? options.mode === 'update';
	const schema = tableToSchema(table, { ...options, includeSystemFields, id: documentId(table, options, 'form') });
	const nodes = schemaToNodes(schema, {
		rules: options.rules,
		replaceDefaultRules: options.replaceDefaultRules,
	});

	if (options.mode !== 'update') return nodes;

	const keys = new Set(primaryKeyFields(table));
	return nodes.map((node) =>
		keys.has(String(node.props.name)) ? { ...node, props: { ...node.props, disabled: true } } : node
	);
}

/** Create/edit screen: `Page > Form > fields`. */
export function tableToFormDocument(table: MetaTable, options: FormOptions = {}): UIDocument {
	const fields = tableToNodes(table, options);
	const form: UINode = {
		type: 'Form',
		key: 'form',
		props: {
			name: table.name,
			...(options.submitLabel ? { submitLabel: options.submitLabel } : {}),
			...(options.mode === 'update' ? { mode: 'update' } : {}),
		},
		children: fields,
	};

	return createDocument(
		{
			type: 'Page',
			key: options.rootKey ?? 'page',
			props: { title: screenTitle(table, options) },
			children: options.form === false ? fields : [form],
		},
		{
			id: documentId(table, options, 'form'),
			meta: { source: 'meta-to-blocks', table: table.name, kind: 'form' },
		}
	);
}

/** List screen: `Page > DataTable`. */
export function tableToListDocument(table: MetaTable, options: ListOptions = {}): UIDocument {
	const columns = listColumns(table, options).map((field) =>
		columnNode(field, options.fields?.[field.name])
	);

	return createDocument(
		{
			type: 'Page',
			key: options.rootKey ?? 'page',
			props: { title: screenTitle(table, options) },
			children: [
				{
					type: 'DataTable',
					key: `${table.name}.list`,
					props: {
						...tableProps(table),
						columns,
						...(primaryKeyFields(table).length > 0 ? { rowKey: primaryKeyFields(table) } : {}),
					},
					children: [],
				},
			],
		},
		{
			id: documentId(table, options, 'list'),
			meta: { source: 'meta-to-blocks', table: table.name, kind: 'list' },
		}
	);
}

/** Detail screen: `Page > DetailPanel` plus a `RelationList` per child relation. */
export function tableToDetailDocument(table: MetaTable, options: DetailOptions = {}): UIDocument {
	const fields = selectFields(table, { ...options, includeSystemFields: options.includeSystemFields ?? true });
	const panel: UINode = {
		type: 'DetailPanel',
		key: `${table.name}.detail`,
		props: {
			...tableProps(table),
			fields: fields.map((field) => columnNode(field, options.fields?.[field.name])),
			...(primaryKeyFields(table).length > 0 ? { rowKey: primaryKeyFields(table) } : {}),
		},
		children: [],
	};

	const children: UINode[] = [panel];

	if (options.relations !== false) {
		const hasMany = table.relations?.hasMany ?? [];
		for (const relation of hasMany) {
			const related = relation?.referencedBy?.name;
			if (!related) continue;
			children.push({
				type: 'RelationList',
				key: `${table.name}.${relation.fieldName ?? related}`,
				props: {
					label: titleize(relation.fieldName ?? related),
					table: related,
					relation: 'hasMany',
					...(relation.keys?.length
						? { foreignKey: relation.keys.map((key) => key?.name).filter(Boolean) }
						: {}),
				},
				children: [],
			});
		}

		for (const relation of table.relations?.manyToMany ?? []) {
			const related = relation?.rightTable?.name;
			if (!related) continue;
			children.push({
				type: 'RelationList',
				key: `${table.name}.${relation.fieldName ?? related}`,
				props: {
					label: titleize(relation.fieldName ?? related),
					table: related,
					relation: 'manyToMany',
					...(relation.junctionTable?.name ? { junctionTable: relation.junctionTable.name } : {}),
				},
				children: [],
			});
		}
	}

	return createDocument(
		{
			type: 'Page',
			key: options.rootKey ?? 'page',
			props: { title: screenTitle(table, options) },
			children,
		},
		{
			id: documentId(table, options, 'detail'),
			meta: { source: 'meta-to-blocks', table: table.name, kind: 'detail' },
		}
	);
}
