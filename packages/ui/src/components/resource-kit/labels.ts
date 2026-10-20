'use client';

import { useQueries } from '@tanstack/react-query';
import * as React from 'react';

import { useResourceKit } from './context';
import { embeddedRow, fieldFormat, isManyRelation, isSingleRelation, recordTitle } from './fields';
import { formatFieldText } from './format';
import { recordQuery } from './queries';
import type { AnyResource, ResourceField, ResourceRow } from './types';

type LabelState = { data: ResourceRow | null | undefined; loading: boolean; missing: boolean };

/** A label request is missing once it settles without a row: deleted, or not visible to this user. */
const toLabelStates = (results: { data?: ResourceRow | null; isPending: boolean; isSuccess: boolean; isError: boolean; fetchStatus: string }[]): LabelState[] =>
	results.map((result) => ({
		data: result.data,
		loading: result.isPending && result.fetchStatus !== 'idle',
		missing: (result.isSuccess && !result.data) || (result.isError && !result.data),
	}));

type Related = { target: AnyResource; id: string };

const requestKey = (target: AnyResource, id: string) => `${target.name}\u0000${id}`;

/** Reads each related record once, deduped by resource and id, through the shared detail cache. */
function useRelatedRows(requests: readonly Related[]) {
	const unique = [...new Map(requests.map((request) => [requestKey(request.target, request.id), request] as const)).values()];
	const states = useQueries({
		queries: unique.map(({ target, id }) => ({ ...recordQuery(target, id), staleTime: 60_000 })),
		combine: toLabelStates,
	});
	const byKey = new Map(unique.map((request, index) => [requestKey(request.target, request.id), states[index]!]));
	return (target: AnyResource, id: string): LabelState | undefined => byKey.get(requestKey(target, id));
}

/** A column short enough to tell records apart inside a title: an option badge or a line of text. */
const isShortValue = (field: ResourceField) => fieldFormat(field) === 'badge' || field.input === 'text' || field.input === 'email';

/**
 * The fields that name a record whose label field is itself a relation (a
 * sign-up titled by its shift): that relation, then the next relation in its
 * columns, or else the next short value, so rows read "Morning sort · Ana
 * Lima" or "Plan the October launch · user" rather than an id.
 */
function titleRelations(resource: AnyResource, labelField: string): ResourceField[] | null {
	const field = resource.fields[labelField];
	if (!field || !isSingleRelation(field)) return null;
	if (labelField !== resource.titleField) return [field];
	const others = resource.columns.map((name) => resource.fields[name]).filter((candidate): candidate is ResourceField => Boolean(candidate) && candidate !== field && !candidate!.hidden);
	const second = others.find(isSingleRelation) ?? others.find((candidate) => !candidate.relation && isShortValue(candidate));
	return second ? [field, second] : [field];
}

type LabelSpec = { resource: AnyResource; row: ResourceRow; labelField?: string };

/**
 * Names records, following a label field that is a relation to the related
 * record's own title (one level deep). Answers null while a related record
 * it needs is still loading.
 */
function useLabelResolver(specs: readonly LabelSpec[]) {
	const { byName, locale, currency, now } = useResourceKit();
	const relatedRow = useRelatedRows(
		specs.flatMap(({ resource, row, labelField }) =>
			(titleRelations(resource, labelField ?? resource.titleField) ?? []).filter(isSingleRelation).flatMap((part) => {
				const value = row[part.name];
				const target = byName.get(part.relation!.resource);
				if (value == null || value === '' || !target || embeddedRow(row, part)) return [];
				return [{ target, id: String(value) }];
			}),
		),
	);
	return (resource: AnyResource, row: ResourceRow, labelField = resource.titleField): string | null => {
		const parts = titleRelations(resource, labelField);
		if (!parts) return recordTitle(resource, row, labelField);
		const labels: string[] = [];
		for (const part of parts) {
			const value = row[part.name];
			if (!isSingleRelation(part)) {
				const text = formatFieldText(part, value, { locale, currency, now, compact: true });
				if (text) labels.push(text);
				continue;
			}
			const target = byName.get(part.relation!.resource);
			if (value == null || value === '' || !target) continue;
			const state = relatedRow(target, String(value));
			const related = embeddedRow(row, part) ?? state?.data;
			if (related) labels.push(recordTitle(target, related, part.relation!.labelField ?? target.titleField));
			else if (state?.loading) return null;
		}
		return labels.length > 0 ? labels.join(' · ') : recordTitle(resource, row, labelField);
	};
}

type TitleRef = { target: AnyResource; id: string; labelField: string; row?: ResourceRow | null };

/**
 * Names related records: reads each by id unless its row is already at hand
 * (embedded by the source), then follows a title field that is itself a
 * relation. The title is null while loading; `missing` is set only when the
 * row was not found.
 */
function useRelatedTitles(refs: readonly TitleRef[]) {
	const relatedRow = useRelatedRows(refs.filter((ref) => !ref.row));
	const resolve = useLabelResolver(
		refs.flatMap(({ target, id, labelField, row }) => {
			const related = row ?? relatedRow(target, id)?.data;
			return related ? [{ resource: target, row: related, labelField }] : [];
		}),
	);
	return (target: AnyResource, id: string, labelField: string, row?: ResourceRow | null): { label: string | null; missing?: boolean } => {
		const state = row ? undefined : relatedRow(target, id);
		const related = row ?? state?.data;
		if (related) return { label: resolve(target, related, labelField) };
		return { label: null, missing: Boolean(state?.missing) };
	};
}

/** Titles for rows of one resource, resolving a title field that is a relation. Null while loading. */
export function useRowTitles(resource: AnyResource, rows: readonly ResourceRow[], labelField = resource.titleField) {
	const resolve = useLabelResolver(rows.map((row) => ({ resource, row, labelField })));
	return (row: ResourceRow): string | null => resolve(resource, row, labelField);
}

/** Labels for ids of one resource, each read once through `get` and cached. Known labels skip the request; an id in neither map is loading. */
export function useRecordLabels(resource: AnyResource | undefined, ids: readonly string[], labelField?: string, known?: ReadonlyMap<string, string>) {
	const unique = React.useMemo(() => [...new Set(ids.filter(Boolean))], [ids]);
	const field = resource ? (labelField ?? resource.titleField) : '';
	const title = useRelatedTitles(resource ? unique.filter((id) => !known?.has(id)).map((id) => ({ target: resource, id, labelField: field })) : []);
	const labels = new Map<string, string>(known);
	const missing = new Set<string>();
	for (const id of unique) {
		if (labels.has(id) || !resource) continue;
		const { label, missing: gone } = title(resource, id, field);
		if (label !== null) labels.set(id, label);
		else if (gone) missing.add(id);
	}
	// Same labels, same objects: pickers hand these to Base UI, which resets typed text when its value changes identity.
	const signature = JSON.stringify([[...labels], [...missing]]);
	return React.useMemo(() => ({ labels, missing }), [signature]);
}

/** A belongs-to value with its label: null while loading, `missing` when the related row cannot be read. */
export type RelationLabel = { id: string; label: string | null; missing?: boolean };

/** Labels for every single-relation column of a page of rows, preferring rows the source embedded. */
export function useRelationLabels(fields: readonly ResourceField[], rows: readonly ResourceRow[]) {
	const { byName } = useResourceKit();
	const relationFields = fields.filter((field) => field.input === 'relation' && field.relation && !isManyRelation(field));
	const labelFieldFor = (field: ResourceField, target: AnyResource) => field.relation?.labelField ?? target.titleField;
	// One request per related record: rows that share a target (two shifts at one location) read it once.
	const title = useRelatedTitles(
		relationFields.flatMap((field) => {
			const target = byName.get(field.relation!.resource);
			if (!target) return [];
			return rows.flatMap((row) => {
				const id = row[field.name];
				if (id == null || id === '') return [];
				return [{ target, id: String(id), labelField: labelFieldFor(field, target), row: embeddedRow(row, field) }];
			});
		}),
	);
	return (field: ResourceField, row: ResourceRow): RelationLabel | null => {
		const value = row[field.name];
		if (value == null || value === '') return null;
		const id = String(value);
		const target = field.relation ? byName.get(field.relation.resource) : undefined;
		if (!target) return { id, label: null, missing: true };
		return { id, ...title(target, id, labelFieldFor(field, target), embeddedRow(row, field)) };
	};
}
