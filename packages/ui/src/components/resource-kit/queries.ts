'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { useResourceKit } from './context';
import { recordId, relatedResourceNames } from './fields';
import type { Submission } from './form-values';
import type { AnyResource, ListQuery, ResourceRow } from './types';

/** Every cache entry of a resource sits under `resourceKeys.all(name)`, so one write can invalidate them together. */
export const resourceKeys = {
	all: (resource: string) => ['resource-kit', resource] as const,
	list: (resource: string, query: ListQuery) => ['resource-kit', resource, 'list', query] as const,
	detail: (resource: string, id: string) => ['resource-kit', resource, 'detail', id] as const,
	linked: (resource: string, id: string, field: string) => ['resource-kit', resource, 'linked', id, field] as const,
};

/** One page of a resource. Keeps the previous page on screen while the next loads. */
export function useResourceList(resource: AnyResource, query: ListQuery, options: { enabled?: boolean } = {}) {
	return useQuery({
		queryKey: resourceKeys.list(resource.name, query),
		queryFn: () => resource.source.list(query),
		placeholderData: keepPreviousData,
		enabled: options.enabled ?? true,
	});
}

export function useResourceRecord(resource: AnyResource, id: string | null | undefined) {
	return useQuery({
		queryKey: resourceKeys.detail(resource.name, id ?? ''),
		queryFn: () => resource.source.get(id!),
		enabled: Boolean(id),
	});
}

/** The ids linked through a many-to-many field, or an empty list when the source cannot say. */
export function useLinkedIds(resource: AnyResource, id: string | null | undefined, field: string, options: { enabled?: boolean } = {}) {
	const linked = resource.source.linked?.bind(resource.source);
	return useQuery({
		queryKey: resourceKeys.linked(resource.name, id ?? '', field),
		queryFn: () => (linked ? linked(id!, field) : Promise.resolve([])),
		enabled: Boolean(id) && (options.enabled ?? true),
	});
}

/** Invalidates a resource and every resource related to it, so lists, details, related lists, and labels refetch. */
export function useInvalidateResource() {
	const queryClient = useQueryClient();
	const { resources } = useResourceKit();
	return React.useCallback(
		(resource: AnyResource) =>
			Promise.all(relatedResourceNames(resource, resources).map((name) => queryClient.invalidateQueries({ queryKey: resourceKeys.all(name) }))),
		[queryClient, resources],
	);
}

type SaveInput = { id?: string; submission: Submission };

/** The record was written but a many-to-many link was not: retry as an edit of `record`, never as a new create. */
export class PartialSaveError extends Error {
	readonly record: ResourceRow;
	readonly field: string;
	constructor(record: ResourceRow, field: string, cause: unknown) {
		super(cause instanceof Error ? cause.message : 'The links could not be saved.', { cause });
		this.name = 'PartialSaveError';
		this.record = record;
		this.field = field;
	}
}

/** Creates or updates a record, then writes its many-to-many links. Resolves with the saved row. */
export function useSaveRecord(resource: AnyResource) {
	const invalidate = useInvalidateResource();
	return useMutation({
		mutationFn: async ({ id, submission }: SaveInput) => {
			const { source } = resource;
			let row: ResourceRow;
			if (id) {
				const hasChanges = Object.keys(submission.values).length > 0;
				row = hasChanges ? await source.update(id, submission.values) : ((await source.get(id)) ?? { [resource.primaryKey]: id });
			} else {
				row = await source.create(submission.values);
			}
			const savedId = id ?? recordId(resource, row);
			const links = Object.entries(submission.links);
			if (links.length > 0) {
				if (!source.link) throw new PartialSaveError(row, links[0]![0], new Error(`${resource.label} cannot link records: the source has no link().`));
				for (const [field, targetIds] of links) {
					try {
						await source.link(savedId, field, targetIds);
					} catch (cause) {
						throw new PartialSaveError(row, field, cause);
					}
				}
			}
			return row;
		},
		onSettled: () => invalidate(resource),
	});
}

export function useDeleteRecord(resource: AnyResource) {
	const invalidate = useInvalidateResource();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => resource.source.remove(id),
		onSuccess: (_result, id) => queryClient.removeQueries({ queryKey: resourceKeys.detail(resource.name, id) }),
		onSettled: () => invalidate(resource),
	});
}
