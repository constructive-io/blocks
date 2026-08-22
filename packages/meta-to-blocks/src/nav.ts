/**
 * `_meta` → a navigation document.
 *
 * A console needs a way in before it needs screens, and the table list is
 * already in `_meta`: this lowers it to `Page > Nav > NavGroup > NavLink`, one
 * group per schema, one link per table, pointing at whatever route the host
 * uses for a list screen. Purely declarative — no query runtime — so the same
 * document renders in a docs page, an admin shell, or a server-rendered page.
 */

import { createDocument, type UIDocument, type UINode } from 'blocks-schema';
import { titleize } from './naming';
import type { MetaTable, NavOptions } from './types';

const DEFAULT_HREF = (table: MetaTable) => `/${table.name}`;

/**
 * Junction tables carry nothing but the two keys they join, so a link to one is
 * noise in a generated console; a table is one when a `manyToMany` relation
 * names it as its junction.
 */
function junctionTableNames(tables: readonly MetaTable[]): Set<string> {
	const names = new Set<string>();
	for (const table of tables) {
		for (const relation of table.relations?.manyToMany ?? []) {
			const junction = relation?.junctionTable?.name;
			if (junction) names.add(junction);
		}
	}
	return names;
}

function navLink(table: MetaTable, options: NavOptions): UINode {
	const override = options.tables?.[table.name];
	const href = override?.href ?? (options.href ?? DEFAULT_HREF)(table);

	return {
		type: 'NavLink',
		key: `nav.${table.schemaName ? `${table.schemaName}.` : ''}${table.name}`,
		props: {
			label: override?.label ?? titleize(table.name),
			href,
			table: table.name,
			...(table.schemaName ? { schemaName: table.schemaName } : {}),
			...(table.description ? { description: table.description } : {}),
		},
		children: [],
	};
}

/** Tables worth linking, in the order the groups should render. */
function navTables(tables: readonly MetaTable[], options: NavOptions): MetaTable[] {
	const junctions = options.includeJunctionTables ? new Set<string>() : junctionTableNames(tables);
	const omitted = new Set(options.omitTables ?? []);

	const visible = tables.filter(
		(table) => !omitted.has(table.name) && !junctions.has(table.name) && !options.tables?.[table.name]?.omit
	);

	if (!options.tableOrder?.length) return visible;

	const rank = new Map(options.tableOrder.map((name, index) => [name, index]));
	const at = (table: MetaTable) => rank.get(table.name) ?? rank.size;
	return [...visible].sort((left, right) => at(left) - at(right));
}

/**
 * Groups tables by `schemaName`, keeping first-seen schema order. Tables with no
 * schema land in a single unnamed group so a flat `_meta` payload still renders.
 */
function groupBySchema(tables: readonly MetaTable[]): Map<string, MetaTable[]> {
	const groups = new Map<string, MetaTable[]>();
	for (const table of tables) {
		const schema = table.schemaName ?? '';
		const group = groups.get(schema);
		if (group) group.push(table);
		else groups.set(schema, [table]);
	}
	return groups;
}

/** Nav nodes for a `_meta` table list, without a document envelope. */
export function metaToNavNodes(tables: readonly MetaTable[], options: NavOptions = {}): UINode[] {
	const visible = navTables(tables, options);

	if (options.group === false) {
		return visible.map((table) => navLink(table, options));
	}

	return [...groupBySchema(visible)].map(([schema, group]) => ({
		type: 'NavGroup',
		key: `nav.${schema || 'tables'}`,
		props: {
			...(schema ? { label: options.schemaLabels?.[schema] ?? titleize(schema), schemaName: schema } : {}),
			count: group.length,
		},
		children: group.map((table) => navLink(table, options)),
	}));
}

/** Navigation screen: `Page > Nav > NavGroup > NavLink`. */
export function metaToNavDocument(tables: readonly MetaTable[], options: NavOptions = {}): UIDocument {
	const children = metaToNavNodes(tables, options);

	return createDocument(
		{
			type: 'Page',
			key: options.rootKey ?? 'page',
			props: { title: options.title ?? 'Navigation' },
			children: [
				{
					type: 'Nav',
					key: 'nav',
					props: { ...(options.label ? { label: options.label } : {}) },
					children,
				},
			],
		},
		{
			id: options.id ?? 'nav',
			meta: { source: 'meta-to-blocks', kind: 'nav' },
		}
	);
}
