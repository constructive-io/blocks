/**
 * Requests from the relation editor to show something else: another table
 * (for example the table that stores links which need more information than
 * the editor can enter) or one linked record. The relation components never
 * navigate themselves; the host or the record panel decides what opening means.
 */
import { createContext, useContext } from 'react';

import type { SheetsFilterGroup } from '../grid/view-state/view-state.types';

export interface SheetsOpenTableRequest {
	/** `TableModel.key` of the table to open. */
	tableKey: string;
	/** GraphQL type name of that table. */
	tableName: string;
	/**
	 * The rows the user was looking at (the junction rows of this record), as a filter
	 * group a host passes straight to `<Sheets filters>`; null when no exact filter can be
	 * built, in which case the host opens the table unfiltered.
	 */
	filters: SheetsFilterGroup | null;
	/** Why the editor asks: the links live in a table with more fields than the editor can fill. */
	reason: 'linked-records';
}

export type SheetsOpenTableHandler = (request: SheetsOpenTableRequest) => void;

export const SheetsOpenTableContext = createContext<SheetsOpenTableHandler | null>(null);

/** The host's handler for opening another table, or null when the host has none. */
export function useOpenTableHandler(): SheetsOpenTableHandler | null {
	return useContext(SheetsOpenTableContext);
}

/** A request to show one linked record, for example in the record panel's navigation stack. */
export interface SheetsOpenRecordRequest {
	/** `TableModel.key` of the record's table. */
	tableKey: string;
	/** GraphQL type name of that table. */
	tableName: string;
	/** Primary-key values of the record, by field name. */
	key: Readonly<Record<string, unknown>>;
	/** The record's label, for a title while it loads. */
	label: string;
}

export type SheetsOpenRecordHandler = (request: SheetsOpenRecordRequest) => void;

export const SheetsOpenRecordContext = createContext<SheetsOpenRecordHandler | null>(null);

/** The host's handler for opening a linked record, or null when the host has none. */
export function useOpenRecordHandler(): SheetsOpenRecordHandler | null {
	return useContext(SheetsOpenRecordContext);
}
