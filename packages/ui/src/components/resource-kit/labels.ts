'use client';

import { useQueries } from '@tanstack/react-query';
import * as React from 'react';

import { useResourceKit } from './context';
import { embeddedRow, fieldFormat, isManyRelation, isSingleRelation, recordTitle } from './fields';
import { formatFieldText } from './format';
import { resourceKeys } from './queries';
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

/** Reads each related record once, deduped by resource and id, through the shared detail cache. */
function useRelatedRows(requests: readonly Related[]) {
	return useQueries({
		queries: requests.map(({ target, id }) => ({
			queryKey: resourceKeys.detail(target.name, id),
			queryFn: () => target.source.get(id),
			staleTime: 60_000,
		})),
		combine: toLabelStates,
	});
}

const dedupe = (requests: Iterable<readonly [string, Related]>) => [...new Map(requests).values()];
const requestKey = (target: AnyResource, id: string) => `${target.name}\u0000${id}`;

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
	const requests = dedupe(
		specs.flatMap(({ resource, row, labelField }) =>
			(titleRelations(resource, labelField ?? resource.titleField) ?? []).filter(isSingleRelation).flatMap((part) => {
				const value = row[part.name];
				const target = byName.get(part.relation!.resource);
				if (value == null || value === '' || !target || embeddedRow(row, part)) return [];
				return [[requestKey(target, String(value)), { target, id: String(value) }] as const];
			}),
		),
	);
	const states = useRelatedRows(requests);
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
			const state = states[requests.findIndex((request) => request.target === target && request.id === String(value))];
			const related = embeddedRow(row, part) ?? state?.data;
			if (related) labels.push(recordTitle(target, related, part.relation!.labelField ?? target.titleField));
			else if (state?.loading) return null;
		}
		return labels.length > 0 ? labels.join(' · ') : recordTitle(resource, row, labelField);
	};
}

/** Titles for rows of one resource, resolving a title field that is a relation. Null while loading. */
export function useRowTitles(resource: AnyResource, rows: readonly ResourceRow[], labelField = resource.titleField) {
	const resolve = useLabelResolver(rows.map((row) => ({ resource, row, labelField })));
	return (row: ResourceRow): string | null => resolve(resource, row, labelField);
}

/** Labels for ids of one resource, each read once through `get` and cached. Known labels skip the request. */
export function useRecordLabels(resource: AnyResource | undefined, ids: readonly string[], labelField?: string, known?: ReadonlyMap<string, string>) {
	const unique = React.useMemo(() => [...new Set(ids.filter(Boolean))], [ids]);
	const states = useQueries({
		queries: unique.map((id) => ({
			queryKey: resourceKeys.detail(resource?.name ?? '', id),
			queryFn: () => resource!.source.get(id),
			enabled: Boolean(resource) && !known?.has(id),
			staleTime: 60_000,
		})),
		combine: toLabelStates,
	});
	const fetched = resource ? states.flatMap((state) => (state.data ? [{ resource, row: state.data, labelField }] : [])) : [];
	const resolve = useLabelResolver(fetched);
	const labels = new Map<string, string>(known);
	const loading = new Set<string>();
	const missing = new Set<string>();
	unique.forEach((id, index) => {
		if (labels.has(id) || !resource) return;
		const state = states[index];
		const label = state?.data ? resolve(resource, state.data, labelField ?? resource.titleField) : null;
		if (label !== null) labels.set(id, label);
		else if (state?.missing) missing.add(id);
		else loading.add(id);
	});
	// Same labels, same objects: pickers hand these to Base UI, which resets typed text when its value changes identity.
	const signature = JSON.stringify([[...labels], [...loading], [...missing]]);
	return React.useMemo(() => ({ labels, loading, missing }), [signature]);
}

/** A belongs-to value with its label: null while loading, `missing` when the related row cannot be read. */
export type RelationLabel = { id: string; label: string | null; missing?: boolean };

/** Labels for every single-relation column of a page of rows, preferring rows the source embedded. */
export function useRelationLabels(fields: readonly ResourceField[], rows: readonly ResourceRow[]) {
	const { byName } = useResourceKit();
	const relationFields = fields.filter((field) => field.input === 'relation' && field.relation && !isManyRelation(field));
	// One request per related record: rows that share a target (two shifts at one location) read it once.
	const requests = dedupe(
		relationFields.flatMap((field) => {
			const target = byName.get(field.relation!.resource);
			if (!target) return [];
			return rows.flatMap((row) => {
				const id = row[field.name];
				if (id == null || id === '' || embeddedRow(row, field)) return [];
				return [[requestKey(target, String(id)), { target, id: String(id) }] as const];
			});
		}),
	);
	const states = useRelatedRows(requests);
	const labelFieldFor = (field: ResourceField, target: AnyResource) => field.relation?.labelField ?? target.titleField;
	// Related rows whose own title is a relation need one more read to be named.
	const fetched = relationFields.flatMap((field) => {
		const target = byName.get(field.relation!.resource);
		if (!target) return [];
		return rows.flatMap((row) => {
			const related = embeddedRow(row, field) ?? states[requests.findIndex((request) => request.target === target && request.id === String(row[field.name]))]?.data;
			return related ? [{ resource: target, row: related, labelField: labelFieldFor(field, target) }] : [];
		});
	});
	const resolve = useLabelResolver(fetched);
	return (field: ResourceField, row: ResourceRow): RelationLabel | null => {
		const value = row[field.name];
		if (value == null || value === '') return null;
		const id = String(value);
		const target = field.relation ? byName.get(field.relation.resource) : undefined;
		if (!target) return { id, label: null, missing: true };
		const state = states[requests.findIndex((request) => request.target === target && request.id === id)];
		const related = embeddedRow(row, field) ?? state?.data;
		if (related) return { id, label: resolve(target, related, labelFieldFor(field, target)) };
		return { id, label: null, missing: Boolean(state?.missing) };
	};
}
