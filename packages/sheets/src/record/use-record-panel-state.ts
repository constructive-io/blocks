// State of the record panel: which record of the grid's table is open (the root),
// and the linked records opened from it (a navigation stack; Back returns).
//
// A host can control the root for deep links: pass `recordId` (null for closed)
// and `onRecordOpenChange`. Without `recordId` the panel keeps its own state and
// still reports every change. Linked records and a new-record form stay inside
// the panel either way.

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TableModel } from '@constructive-io/data';

import type { SheetsRowIdentifier } from '../row-identity';
import {
	identifierOfKey,
	keyOfIdentifier,
	type RecordPanelEntry,
	type RecordPanelRecordEntry,
} from './record-target';

export interface UseRecordPanelStateArgs {
	/** The grid's table model, or null while it loads. */
	table: TableModel | null;
	/** Controlled root record of the grid's table: an identifier, or null for closed. Omit to let the panel own it. */
	recordId?: SheetsRowIdentifier | null;
	/** Called with the root record whenever the user opens, moves or closes the panel (null when closed). */
	onRecordOpenChange?: (recordId: SheetsRowIdentifier | null) => void;
}

export interface RecordPanelController {
	/** The entry the panel shows, or null when it is closed. */
	current: RecordPanelEntry | null;
	/** True when a linked record is shown above the root. */
	canGoBack: boolean;
	/** The root entry (a record of the grid's table, or the new-record form). */
	root: RecordPanelEntry | null;
	/** Open a record of the grid's table as the root (clears linked records). */
	openRecord: (entry: RecordPanelRecordEntry) => void;
	/** Open a linked record above the current one. */
	pushRecord: (entry: RecordPanelRecordEntry) => void;
	/** Show the record below the current one. */
	back: () => void;
	/** Open the form for a new record of the grid's table. */
	openNew: () => void;
	/** Replace the current entry (a created record replaces its form; a deleted linked record leaves). */
	replaceCurrent: (entry: RecordPanelRecordEntry | null) => void;
	/** Close the panel. */
	close: () => void;
}

export function useRecordPanelState({ table, recordId, onRecordOpenChange }: UseRecordPanelStateArgs): RecordPanelController {
	const controlled = recordId !== undefined;
	const [ownRoot, setOwnRoot] = useState<RecordPanelEntry | null>(null);
	const [creating, setCreating] = useState(false);
	const [linked, setLinked] = useState<RecordPanelRecordEntry[]>([]);

	const controlledRoot = useMemo<RecordPanelEntry | null>(() => {
		if (!controlled || !table) return null;
		if (recordId === null || recordId === undefined) {
			return creating ? { kind: 'new', tableKey: table.key, tableName: table.name } : null;
		}
		const key = keyOfIdentifier(table, recordId);
		return key ? { kind: 'record', tableKey: table.key, tableName: table.name, key, label: '' } : null;
	}, [controlled, table, recordId, creating]);

	const root = controlled ? controlledRoot : ownRoot;

	// A host that opens another record (or closes) leaves the linked records behind.
	useEffect(() => {
		if (controlled) setLinked([]);
	}, [controlled, recordId]);

	const setRoot = useCallback(
		(next: RecordPanelEntry | null) => {
			setLinked([]);
			if (next?.kind === 'new') {
				setCreating(true);
				if (!controlled) setOwnRoot(next);
				else if (recordId !== null) onRecordOpenChange?.(null);
				return;
			}
			setCreating(false);
			if (!controlled) setOwnRoot(next);
			onRecordOpenChange?.(next ? identifierOfKey(next.key) : null);
		},
		[controlled, recordId, onRecordOpenChange],
	);

	const openRecord = useCallback((entry: RecordPanelRecordEntry) => setRoot(entry), [setRoot]);
	const openNew = useCallback(() => {
		if (table) setRoot({ kind: 'new', tableKey: table.key, tableName: table.name });
	}, [table, setRoot]);
	const close = useCallback(() => {
		setLinked([]);
		setRoot(null);
	}, [setRoot]);
	const pushRecord = useCallback((entry: RecordPanelRecordEntry) => setLinked((stack) => [...stack, entry]), []);
	const back = useCallback(() => setLinked((stack) => stack.slice(0, -1)), []);
	const replaceCurrent = useCallback(
		(entry: RecordPanelRecordEntry | null) => {
			if (linked.length > 0) {
				setLinked((stack) => (entry ? [...stack.slice(0, -1), entry] : stack.slice(0, -1)));
				return;
			}
			setRoot(entry);
		},
		[linked.length, setRoot],
	);

	const current = linked.length > 0 ? linked[linked.length - 1]! : root;

	// Back leaves a linked record: to the one below it, or to the grid's record (closing when there is none).
	const canGoBack = linked.length > 1 || (linked.length === 1 && root !== null);
	return useMemo(
		() => ({ current, canGoBack, root, openRecord, pushRecord, back, openNew, replaceCurrent, close }),
		[current, canGoBack, root, openRecord, pushRecord, back, openNew, replaceCurrent, close],
	);
}
