/**
 * Saved views of one table: list, select, create, save, discard, rename,
 * duplicate, delete. Every stored state is validated against the current
 * table model before it is used, and what was dropped is kept for the notice.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { TableModel } from '@constructive-io/data';

import { validateSheetsViewState } from '../view-state/validate-view-state';
import { createSheetsViewState, viewStateSignature } from '../view-state/view-state';
import type { SheetsViewState, SheetsViewStateDrop } from '../view-state/view-state.types';
import { viewScopeKey, type SheetsStoredView, type SheetsViewStorage, type SheetsViewStorageScope } from './view-storage';

/** A saved view, checked against the current model. */
export interface SavedView {
	id: string;
	name: string;
	/** The stored state as the current model supports it. */
	state: SheetsViewState;
	/** What the model no longer supports, as messages for the user. */
	dropped: readonly SheetsViewStateDrop[];
	updatedAt: string;
}

export interface SavedViewsBindings {
	/** 'loading' until the stored views and the table model are both there. */
	status: 'loading' | 'ready' | 'error';
	/** Why the views could not be loaded or the last change failed, or null. */
	error: string | null;
	views: readonly SavedView[];
	/** The view in use, or null for the default view (nothing saved). */
	activeView: SavedView | null;
	/** The grid differs from the active view as saved. Always false for the default view. */
	dirty: boolean;
	/** True while a change is being written. */
	busy: boolean;
	/** Messages about parts of the active view the model dropped when it loaded. */
	activeDropped: readonly SheetsViewStateDrop[];
	/** Switch to a view, or with null to the default view (no filter, sort or search, every field shown). Unsaved changes are discarded. */
	select: (viewId: string | null) => Promise<boolean>;
	/** Save the grid as a new view and switch to it. */
	create: (name: string) => Promise<boolean>;
	/** Save the grid into the active view. */
	save: () => Promise<boolean>;
	/** Go back to the active view as saved. */
	discard: () => void;
	rename: (viewId: string, name: string) => Promise<boolean>;
	/** Copy a view under a new name and switch to the copy. */
	duplicate: (viewId: string) => Promise<boolean>;
	remove: (viewId: string) => Promise<boolean>;
	/** Load the views again after an error. */
	retry: () => void;
	/** Why a name cannot be used, or null. */
	nameProblem: (name: string, exceptViewId?: string) => string | null;
	open: boolean;
	setOpen: (open: boolean) => void;
}

export interface UseSavedViewsOptions {
	storage: SheetsViewStorage;
	/** Null until the table model has loaded. */
	scope: SheetsViewStorageScope | null;
	model: TableModel | null;
	/** The grid's state in use. */
	current: SheetsViewState;
	/** Replace the grid's state. */
	apply: (state: SheetsViewState) => void;
	/** Column titles for drop messages. */
	label: (name: string) => string;
}

const MAX_NAME_LENGTH = 80;

function newViewId(): string {
	const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
	return `view-${random}`;
}

function messageOf(error: unknown): string {
	return error instanceof Error && error.message ? error.message : 'The storage did not answer.';
}

export function useSavedViews({ storage, scope, model, current, apply, label }: UseSavedViewsOptions): SavedViewsBindings {
	const queryClient = useQueryClient();
	const scopeId = scope ? viewScopeKey(scope) : null;
	const queryKey = useMemo(() => ['constructive-sheets', 'saved-views', scopeId] as const, [scopeId]);
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [changeError, setChangeError] = useState<string | null>(null);

	const query = useQuery({
		queryKey,
		enabled: scope !== null,
		retry: false,
		queryFn: async () => {
			const [stored, activeViewId] = await Promise.all([
				storage.list(scope!),
				storage.getActiveViewId ? storage.getActiveViewId(scope!) : Promise.resolve(null),
			]);
			return { stored: [...stored], activeViewId };
		},
	});

	const views = useMemo<SavedView[]>(() => {
		if (!model || !query.data) return [];
		return query.data.stored.map((entry) => {
			const { state, dropped } = validateSheetsViewState(entry.state, model, { label });
			return { id: entry.id, name: entry.name, state, dropped, updatedAt: entry.updatedAt };
		});
	}, [model, query.data, label]);

	const activeViewId = query.data?.activeViewId ?? null;
	const activeView = views.find((view) => view.id === activeViewId) ?? null;
	const currentSignature = viewStateSignature(current);
	const dirty = activeView !== null && viewStateSignature(activeView.state) !== currentSignature;

	// Restore the last selected view once per table, as soon as views and model are both there.
	const restoredScope = useRef<string | null>(null);
	useEffect(() => {
		if (!scopeId || !model || !query.data || restoredScope.current === scopeId) return;
		restoredScope.current = scopeId;
		if (activeView) apply(activeView.state);
	}, [scopeId, model, query.data, activeView, apply]);

	const latest = useRef({ current, views, activeView });
	latest.current = { current, views, activeView };

	type Cached = { stored: SheetsStoredView[]; activeViewId: string | null };
	const updateCache = useCallback(
		(update: (cached: Cached) => Cached) => {
			queryClient.setQueryData<Cached>(queryKey, (cached) => update(cached ?? { stored: [], activeViewId: null }));
		},
		[queryClient, queryKey],
	);

	/** Run one storage change; on failure keep the message and report false. */
	const change = useCallback(async (work: () => Promise<void>): Promise<boolean> => {
		setBusy(true);
		setChangeError(null);
		try {
			await work();
			return true;
		} catch (error) {
			setChangeError(messageOf(error));
			return false;
		} finally {
			setBusy(false);
		}
	}, []);

	const setActive = useCallback(
		async (viewId: string | null) => {
			if (!scope) return;
			if (storage.setActiveViewId) await storage.setActiveViewId(scope, viewId);
			updateCache((cached) => ({ ...cached, activeViewId: viewId }));
		},
		[scope, storage, updateCache],
	);

	const writeView = useCallback(
		async (view: SheetsStoredView) => {
			if (!scope) throw new Error('Saved views are available once the table has loaded.');
			await storage.save(scope, view);
			updateCache((cached) => {
				const at = cached.stored.findIndex((entry) => entry.id === view.id);
				const stored = at === -1 ? [...cached.stored, view] : cached.stored.map((entry) => (entry.id === view.id ? view : entry));
				return { ...cached, stored };
			});
		},
		[scope, storage, updateCache],
	);

	const nameProblem = useCallback((name: string, exceptViewId?: string) => {
		const trimmed = name.trim();
		if (trimmed === '') return 'Enter a name.';
		if (trimmed.length > MAX_NAME_LENGTH) return `Use at most ${MAX_NAME_LENGTH} characters.`;
		const taken = latest.current.views.some((view) => view.id !== exceptViewId && view.name.toLowerCase() === trimmed.toLowerCase());
		return taken ? 'A view with this name already exists.' : null;
	}, []);

	const select = useCallback(
		(viewId: string | null) =>
			change(async () => {
				const target = viewId === null ? null : latest.current.views.find((view) => view.id === viewId);
				if (viewId !== null && !target) throw new Error('That view no longer exists.');
				await setActive(viewId);
				apply(target ? target.state : createSheetsViewState());
			}),
		[change, setActive, apply],
	);

	const create = useCallback(
		(name: string) =>
			change(async () => {
				const problem = nameProblem(name);
				if (problem) throw new Error(problem);
				const view: SheetsStoredView = {
					id: newViewId(),
					name: name.trim(),
					state: latest.current.current,
					updatedAt: new Date().toISOString(),
				};
				await writeView(view);
				await setActive(view.id);
			}),
		[change, nameProblem, writeView, setActive],
	);

	const save = useCallback(
		() =>
			change(async () => {
				const active = latest.current.activeView;
				if (!active) throw new Error('Choose a view to save into, or save as a new view.');
				await writeView({ id: active.id, name: active.name, state: latest.current.current, updatedAt: new Date().toISOString() });
			}),
		[change, writeView],
	);

	const discard = useCallback(() => {
		const active = latest.current.activeView;
		if (active) apply(active.state);
	}, [apply]);

	const rename = useCallback(
		(viewId: string, name: string) =>
			change(async () => {
				const target = latest.current.views.find((view) => view.id === viewId);
				if (!target) throw new Error('That view no longer exists.');
				const problem = nameProblem(name, viewId);
				if (problem) throw new Error(problem);
				await writeView({ id: target.id, name: name.trim(), state: target.state, updatedAt: new Date().toISOString() });
			}),
		[change, nameProblem, writeView],
	);

	const duplicate = useCallback(
		(viewId: string) =>
			change(async () => {
				const target = latest.current.views.find((view) => view.id === viewId);
				if (!target) throw new Error('That view no longer exists.');
				let name = `${target.name} copy`;
				for (let n = 2; nameProblem(name) !== null; n += 1) name = `${target.name} copy ${n}`;
				// The active view copies the grid as it is now (unsaved changes included).
				const state = latest.current.activeView?.id === viewId ? latest.current.current : target.state;
				const copy: SheetsStoredView = { id: newViewId(), name, state, updatedAt: new Date().toISOString() };
				await writeView(copy);
				await setActive(copy.id);
				apply(state);
			}),
		[change, nameProblem, writeView, setActive, apply],
	);

	const remove = useCallback(
		(viewId: string) =>
			change(async () => {
				if (!scope) return;
				await storage.remove(scope, viewId);
				updateCache((cached) => ({
					stored: cached.stored.filter((entry) => entry.id !== viewId),
					activeViewId: cached.activeViewId === viewId ? null : cached.activeViewId,
				}));
				if (latest.current.activeView?.id === viewId) await setActive(null);
			}),
		[change, scope, storage, updateCache, setActive],
	);

	const { refetch } = query;
	const retry = useCallback(() => {
		setChangeError(null);
		void refetch();
	}, [refetch]);

	const status: SavedViewsBindings['status'] = query.isError ? 'error' : query.data && model ? 'ready' : 'loading';
	const error = query.isError ? `Saved views could not be loaded. ${messageOf(query.error)}` : changeError;

	return useMemo<SavedViewsBindings>(
		() => ({
			status,
			error,
			views,
			activeView,
			dirty,
			busy,
			activeDropped: activeView?.dropped ?? [],
			select,
			create,
			save,
			discard,
			rename,
			duplicate,
			remove,
			retry,
			nameProblem,
			open,
			setOpen,
		}),
		[status, error, views, activeView, dirty, busy, select, create, save, discard, rename, duplicate, remove, retry, nameProblem, open],
	);
}
