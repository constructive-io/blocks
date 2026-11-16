// A host-level read-only grid (`<Sheets readOnly>`).
//
// Every write in Sheets is decided by the table model: a cell, a paste, a fill,
// Add row, New record, Import, Delete, a link and the record panel all read the
// model's operations, write flags and relation flags, and show the model's reason
// when they refuse. So read-only is applied once, where models are read: inside a
// read-only grid, every table model (this table's and the related ones) loses its
// create, update and delete operations, and each refusal carries the host's reason.
// Listing, filters, sort, search and export are untouched.

import { createContext, useContext, type ReactNode } from 'react';

import type { ModelIssue, TableModel } from '@constructive-io/data';

/** The reason a grid shows for `readOnly={true}`. */
export const DEFAULT_READ_ONLY_REASON = 'This table is read-only here.';

const SheetsReadOnlyContext = createContext<string | null>(null);

/** The reason of a `readOnly` prop: its text, the default for `true`, or null when the grid can write. */
export function readOnlyReasonOf(readOnly: boolean | string | null | undefined): string | null {
	if (typeof readOnly === 'string') return readOnly.trim() || DEFAULT_READ_ONLY_REASON;
	return readOnly ? DEFAULT_READ_ONLY_REASON : null;
}

export interface SheetsReadOnlyProviderProps {
	/** `true`, or the reason to show; false or omitted leaves writes to the table model. */
	readOnly?: boolean | string | null;
	children: ReactNode;
}

/**
 * Make everything inside read-only with a reason. `<Sheets readOnly>` renders it;
 * a host driving `useSheets` itself wraps its grid in it.
 */
export function SheetsReadOnlyProvider({ readOnly, children }: SheetsReadOnlyProviderProps) {
	return <SheetsReadOnlyContext.Provider value={readOnlyReasonOf(readOnly)}>{children}</SheetsReadOnlyContext.Provider>;
}

/** The host's read-only reason, or null when the grid can write. */
export function useSheetsReadOnlyReason(): string | null {
	return useContext(SheetsReadOnlyContext);
}

const OPERATION_ISSUES = [
	{ target: 'create', code: 'CREATE_UNAVAILABLE' },
	{ target: 'update', code: 'UPDATE_UNAVAILABLE' },
	{ target: 'delete', code: 'DELETE_UNAVAILABLE' },
] as const;

function buildReadOnlyModel(model: TableModel, reason: string): TableModel {
	const issues: ModelIssue[] = OPERATION_ISSUES.map(({ target, code }) => ({ scope: 'operation', target, code, message: reason }));
	return {
		...model,
		operations: { ...model.operations, create: null, update: null, delete: null },
		columns: model.columns.map((column) => ({
			...column,
			write: { create: false, update: false, requiredOnCreate: false, createReason: reason, updateReason: reason },
		})),
		relations: model.relations.map((relation) => ({ ...relation, editable: false, unlinkable: false, reason })),
		// The host's reason comes first, so every "why" lookup finds it.
		issues: [...issues, ...model.issues],
	};
}

const readOnlyModels = new WeakMap<TableModel, Map<string, TableModel>>();

/**
 * The model as a read-only grid sees it: no create, update or delete, every field and
 * link read-only, each with `reason`. The same model and reason give the same object,
 * so memoized consumers do not recompute.
 */
export function readOnlyTableModel(model: TableModel, reason: string): TableModel {
	let byReason = readOnlyModels.get(model);
	if (!byReason) {
		byReason = new Map();
		readOnlyModels.set(model, byReason);
	}
	let readOnly = byReason.get(reason);
	if (!readOnly) {
		readOnly = buildReadOnlyModel(model, reason);
		byReason.set(reason, readOnly);
	}
	return readOnly;
}
