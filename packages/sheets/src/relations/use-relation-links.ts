/**
 * The full current link set of one row's hasOne, hasMany or manyToMany
 * relation, read page by page through a filtered query instead of the
 * capped nested list the grid row carries.
 *
 * - hasOne/hasMany: the related table, filtered by `keys[].remote` = this row's `keys[].local`.
 * - manyToMany: the junction table, filtered by `junction.left`, with the
 *   junction's own belongsTo relation to the related table for labels.
 */
import { useMemo } from 'react';

import type { RelationModel, TableModel } from '@constructive-io/data';

import {
	equalityFilter,
	hasLinkPatch,
	junctionLeftValues,
	junctionRightKey,
	junctionRightRecord,
	linkKey,
	type RecordValues,
} from './relation-keys';
import type { LinkedRecord } from './relation-changes';
import { useModelPages } from './use-model-pages';

export interface RelationLinks {
	/** Current links, in server order, as loaded so far. */
	links: LinkedRecord[];
	/** Every current link, or null when the server does not count them. */
	total: number | null;
	isLoading: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	fetchNextPage: () => void;
	error: Error | null;
	/** False when the link set cannot be queried; `links` then come from the row itself. */
	queried: boolean;
	/** While loading: how many links the row itself already shows (its first page), to hold their space. */
	placeholderCount: number;
}

/** The junction's belongsTo relation that points at the related table through `junction.right`. */
export function junctionTargetRelation(relation: RelationModel, junction: TableModel): RelationModel | null {
	const right = relation.junction?.right ?? [];
	return (
		junction.relations.find(
			(candidate) =>
				candidate.kind === 'belongsTo' &&
				candidate.readable &&
				candidate.targetKey === relation.targetKey &&
				candidate.keys.length === right.length &&
				right.every((pair) => candidate.keys.some((key) => key.local === pair.junction && key.remote === pair.remote)),
		) ?? null
	);
}

function asRecords(value: unknown): RecordValues[] {
	if (!Array.isArray(value)) return value && typeof value === 'object' ? [value as RecordValues] : [];
	return value.filter((entry): entry is RecordValues => Boolean(entry) && typeof entry === 'object');
}

export function useRelationLinks(options: {
	relation: RelationModel;
	row: RecordValues | null;
	/** The value of the relation field on the row, used when the link set cannot be queried. */
	rowValue: unknown;
	target: TableModel | null;
	junction: TableModel | null;
	/** True while the related or junction table model is still loading. */
	modelsLoading: boolean;
	enabled: boolean;
}): RelationLinks {
	const { relation, row, rowValue, target, junction, modelsLoading, enabled } = options;
	const isJunction = relation.kind === 'manyToMany';
	const listModel = isJunction ? junction : target;

	const where = useMemo(() => {
		if (!row || !listModel) return null;
		const values = isJunction ? junctionLeftValues(relation, row) : hasLinkPatch(relation, row);
		return values ? equalityFilter(listModel, values) : null;
	}, [isJunction, listModel, relation, row]);

	const throughRelation = useMemo(
		() => (isJunction && junction ? junctionTargetRelation(relation, junction) : null),
		[isJunction, junction, relation],
	);

	const listed = enabled && relation.kind !== 'belongsTo';
	const queried = listed && Boolean(listModel && where);
	// Until the model that lists the links is known, show nothing rather than the capped
	// nested list: a link taken from it has no junction row, so it could not be removed.
	const waiting = listed && !listModel && modelsLoading;
	const pages = useModelPages({
		model: listModel,
		purpose: isJunction ? 'relation-junction-links' : 'relation-links',
		keyParts: [relation.fieldName],
		where,
		relations: throughRelation ? [throughRelation.fieldName] : undefined,
		enabled: queried,
	});

	const links = useMemo<LinkedRecord[]>(() => {
		if (waiting) return [];
		if (!queried) {
			return asRecords(rowValue).flatMap((record): LinkedRecord[] => {
				const key = linkKey(relation, record);
				return key ? [{ key, record, junctionRow: null }] : [];
			});
		}
		return pages.rows.flatMap((entry) => {
			if (!isJunction) {
				const key = linkKey(relation, entry);
				return key ? [{ key, record: entry }] : [];
			}
			const key = junctionRightKey(relation, entry);
			if (!key) return [];
			const nested = throughRelation ? entry[throughRelation.fieldName] : null;
			const record = nested && typeof nested === 'object'
				? { ...junctionRightRecord(relation, entry), ...(nested as RecordValues) }
				: junctionRightRecord(relation, entry);
			return [{ key, record, junctionRow: entry }];
		});
	}, [isJunction, pages.rows, queried, relation, rowValue, throughRelation, waiting]);

	return {
		links,
		total: queried ? pages.total : null,
		isLoading: waiting || (queried && pages.isLoading),
		isFetchingNextPage: pages.isFetchingNextPage,
		hasNextPage: queried && pages.hasNextPage,
		fetchNextPage: pages.fetchNextPage,
		error: queried ? pages.error : null,
		queried,
		placeholderCount: asRecords(rowValue).length,
	};
}
