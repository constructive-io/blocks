import type { ListQuery, ListResult, ResourceSource } from './types';

/** One side of an in-memory many-to-many junction. */
export type MemoryLinkSide = {
	linked(id: string): string[];
	link(id: string, targetIds: string[]): void;
};

const PAIR = '\u0000';

/**
 * An in-memory junction table between two resources. Give `left` to the first
 * resource's many-to-many field and `right` to the second's, and both read the
 * same pairs.
 */
export function createMemoryJunction(pairs: readonly (readonly [string, string])[] = []) {
	const rows = new Set(pairs.map(([left, right]) => `${left}${PAIR}${right}`));
	const side = (index: 0 | 1): MemoryLinkSide => ({
		linked: (id) => [...rows].map((row) => row.split(PAIR)).filter((pair) => pair[index] === id).map((pair) => pair[1 - index]!),
		link: (id, targetIds) => {
			for (const row of [...rows]) if (row.split(PAIR)[index] === id) rows.delete(row);
			for (const targetId of new Set(targetIds)) rows.add(index === 0 ? `${id}${PAIR}${targetId}` : `${targetId}${PAIR}${id}`);
		},
	});
	return { left: side(0), right: side(1) };
}

export type MemorySourceOptions = {
	/** Defaults to "id". */
	primaryKey?: string;
	/** Fields `search` matches, case-insensitively. Defaults to every string field. */
	searchFields?: string[];
	/** Many-to-many fields and the junction side each reads. */
	links?: Record<string, MemoryLinkSide>;
	/** Simulated round-trip in milliseconds. */
	latency?: number;
	/** Id for a created row. Defaults to a random UUID. */
	createId?: () => string;
	/** Fills defaults on create, e.g. `createdAt`. */
	onCreate?: (values: Record<string, unknown>) => Record<string, unknown>;
};

const fold = (value: unknown) => String(value ?? '').normalize('NFKD').toLocaleLowerCase();

function compare(left: unknown, right: unknown): number {
	if (left == null || left === '') return right == null || right === '' ? 0 : 1;
	if (right == null || right === '') return -1;
	if (typeof left === 'number' && typeof right === 'number') return left - right;
	if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right);
	return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

const copy = <T>(value: T): T => structuredClone(value);

/**
 * A `ResourceSource` over an array, for demos, stories, tests, and prototypes
 * before a backend exists. Search, sort, equality filters, paging, and
 * many-to-many links behave like a real source; rows are copied in and out so
 * callers never share references with the store.
 */
export function createMemorySource<Row extends Record<string, unknown>>(initialRows: readonly Row[], options: MemorySourceOptions = {}): ResourceSource<Row> {
	const { primaryKey = 'id', searchFields, links = {}, latency = 0, createId = () => crypto.randomUUID(), onCreate } = options;
	let rows: Row[] = copy([...initialRows]);
	const wait = () => (latency > 0 ? new Promise((resolve) => setTimeout(resolve, latency)) : Promise.resolve());
	const find = (id: string) => rows.find((row) => String(row[primaryKey]) === id);

	return {
		async list(query: ListQuery): Promise<ListResult<Row>> {
			await wait();
			let result = rows;
			for (const [field, expected] of Object.entries(query.filters ?? {})) {
				result = result.filter((row) => (expected == null ? row[field] == null : String(row[field]) === String(expected)));
			}
			const search = fold(query.search?.trim());
			if (search) {
				result = result.filter((row) => {
					const keys = searchFields ?? Object.keys(row).filter((key) => typeof row[key] === 'string');
					return keys.some((key) => fold(row[key]).includes(search));
				});
			}
			if (query.sort) {
				const { field, direction } = query.sort;
				result = [...result].sort((left, right) => compare(left[field], right[field]) * (direction === 'desc' ? -1 : 1));
			}
			return { rows: copy(result.slice(query.offset, query.offset + query.limit)), totalCount: result.length };
		},
		async get(id) {
			await wait();
			const row = find(id);
			return row ? copy(row) : null;
		},
		async create(values) {
			await wait();
			const base = { [primaryKey]: createId(), ...copy(values) } as Record<string, unknown>;
			const row = (onCreate ? { ...base, ...onCreate(base) } : base) as Row;
			rows = [row, ...rows];
			return copy(row);
		},
		async update(id, patch) {
			await wait();
			const row = find(id);
			if (!row) throw new Error('That record no longer exists.');
			const next = { ...row, ...copy(patch) } as Row;
			rows = rows.map((candidate) => (candidate === row ? next : candidate));
			return copy(next);
		},
		async remove(id) {
			await wait();
			rows = rows.filter((row) => String(row[primaryKey]) !== id);
			for (const side of Object.values(links)) side.link(id, []);
		},
		async link(id, field, targetIds) {
			await wait();
			const side = links[field];
			if (!side) throw new Error(`No link table for ${field}.`);
			side.link(id, targetIds);
		},
		async linked(id, field) {
			await wait();
			return links[field]?.linked(id) ?? [];
		},
	};
}
