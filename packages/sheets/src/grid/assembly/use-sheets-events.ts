// Observational events of the grid (`onEvent`): the emitter, load success or failure,
// and sort, filter and search changes. Purely observational: nothing here changes data.
import { useCallback, useEffect, useRef } from 'react';

import type { SheetsEvent } from '../sheets.types';
import type { SheetsViewBindings } from '../view-state/use-sheets-view';

export type SheetsEmit = (type: SheetsEvent['type'], meta?: Record<string, unknown>) => void;

/** The `onEvent` emitter, stable per table. */
export function useSheetsEmit(tableName: string, onEvent: ((event: SheetsEvent) => void) | undefined): SheetsEmit {
	// Keep the latest onEvent in a ref so firing events never depends on (or churns)
	// the callbacks/effects below — purely observational, no behavioral coupling.
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;
	const emit = useCallback((type: SheetsEvent['type'], meta?: Record<string, unknown>) => {
		onEventRef.current?.({ type, tableName, at: Date.now(), meta });
	}, [tableName]);
	return emit;
}

/** Emit load:success / load:error once per transition. */
export function useLoadEvents({
	dataError,
	hasCompletedInitialLoad,
	totalCount,
	emit,
}: {
	dataError: Error | null;
	hasCompletedInitialLoad: boolean;
	totalCount: number;
	emit: SheetsEmit;
}): void {
	// Emit load:success / load:error once per transition. Tracked via a ref so we
	// don't re-fire on unrelated re-renders.
	const lastLoadEmitRef = useRef<'success' | 'error' | null>(null);
	useEffect(() => {
		if (dataError) {
			if (lastLoadEmitRef.current !== 'error') {
				lastLoadEmitRef.current = 'error';
				emit('load:error', { error: dataError });
			}
			return;
		}
		if (hasCompletedInitialLoad && lastLoadEmitRef.current !== 'success') {
			lastLoadEmitRef.current = 'success';
			emit('load:success', { totalCount });
		}
	}, [dataError, hasCompletedInitialLoad, totalCount, emit]);
}

/** Emit sort:change / filter:apply / search:change when the applied view state changes. */
export function useViewChangeEvents({
	view,
	effectiveWhere,
	emit,
}: {
	view: SheetsViewBindings;
	effectiveWhere: Readonly<Record<string, unknown>> | undefined;
	emit: SheetsEmit;
}): void {
	// Emit sort:change / filter:apply / search:change when the applied state changes (not on
	// mount). Watching the state rather than the controls covers every path that changes it.
	const sortSignature = JSON.stringify(view.state.sort);
	const appliedWhereSignature = JSON.stringify(effectiveWhere ?? null);
	const appliedSearch = view.state.search.trim();
	const lastViewEventsRef = useRef({ sort: sortSignature, where: appliedWhereSignature, search: appliedSearch });
	useEffect(() => {
		const last = lastViewEventsRef.current;
		if (last.sort !== sortSignature) {
			const [first] = view.state.sort;
			emit('sort:change', { sort: view.state.sort, field: first?.column ?? null, direction: first?.direction ?? null });
		}
		if (last.search !== appliedSearch) emit('search:change', { search: appliedSearch });
		else if (last.where !== appliedWhereSignature) emit('filter:apply', { conditionCount: view.appliedCount });
		lastViewEventsRef.current = { sort: sortSignature, where: appliedWhereSignature, search: appliedSearch };
	}, [sortSignature, appliedWhereSignature, appliedSearch, view.state.sort, view.appliedCount, emit]);
}
