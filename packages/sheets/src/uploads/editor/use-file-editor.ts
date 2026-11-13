// State of the file editor: the files a cell will hold, the uploads in flight,
// and the save sequence.
//
// Save runs in order:
//   1. a draft row is created first, and its key is read from the created row
//      with the table model's primary key (so a key without a default works);
//   2. new files upload, at most UPLOAD_CONCURRENCY at a time, each with its own
//      progress and cancel; a failed file keeps its error and a retry, and the
//      others keep their uploads;
//   3. the cell is written once with the whole value (one file, a list in the
//      order shown, or null), waiting out the server's file confirmation.
// Cancel aborts the uploads in flight. The server expires a file row whose PUT
// never finished, so a cancelled upload leaves nothing behind.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ColumnModel, TableModel } from '@constructive-io/data';

import { isAbortError } from '../../context/sheets-upload-presigned';
import type { DraftSubmitResult } from '../../grid/draft-types';
import { cellElementFor, type FileCellWriteJob, type FileUploadState } from '../../hooks/use-sheets-upload';
import type { SheetsRowIdentifier } from '../../row-identity';
import { fileWriteMessage } from '../file-cell-write';
import { storedFilesOf, type StoredFile } from '../../utils/file.utils';

/** Uploads in flight at once, per editor. */
export const UPLOAD_CONCURRENCY = 3;

export type FileEntryStatus = 'stored' | 'selected' | 'uploading' | 'uploaded' | 'failed';

export interface FileEntry {
	/** Local key. */
	key: string;
	/** The stored file, for a file the cell already holds. */
	stored: StoredFile | null;
	/** The picked file, for a new one. */
	file: File | null;
	/** Object URL of a picked image, for its preview. */
	previewUrl: string | null;
	status: FileEntryStatus;
	/** Upload progress in percent, while uploading. */
	progress: number | null;
	error: string | null;
	/** The element the cell stores for this file, once known. */
	element: unknown;
}

export type FileEditorPhase =
	| { name: 'idle' }
	| { name: 'creating-row' }
	| { name: 'uploading' }
	| { name: 'saving' }
	| { name: 'processing' }
	| { name: 'failed'; message: string };

export interface SaveTarget {
	rowKey: SheetsRowIdentifier;
	/** Grid row id, which keys the cell's pending state. */
	rowId: string;
}

export interface UseFileEditorArgs {
	value: unknown;
	table: TableModel | null;
	column: ColumnModel | null;
	multiple: boolean;
	upload: FileUploadState;
	write: (job: FileCellWriteJob) => Promise<unknown>;
	/** The row, or null for a draft row that has not been created. */
	target: SaveTarget | null;
	submitDraft?: () => Promise<DraftSubmitResult>;
	/** The key and grid row id of a row the draft created, or null when its key cannot be read. */
	targetOfCreatedRow: (row: Record<string, unknown>) => SaveTarget | null;
	onUploadError?: (message: string) => void;
	/** Called once the draft row exists on the server. */
	onRowCreated?: () => void;
	onSaved: (saved: unknown, info: { createdRow: boolean }) => void;
}

let nextKey = 1;
const entryKey = () => `entry-${nextKey++}`;

function storedEntries(value: unknown, column: ColumnModel | null): FileEntry[] {
	return storedFilesOf(value, column?.value.file).map((stored) => ({
		key: entryKey(),
		stored,
		file: null,
		previewUrl: null,
		status: 'stored',
		progress: null,
		error: null,
		element: stored.raw,
	}));
}

function isImageUpload(file: File): boolean {
	return file.type.startsWith('image/');
}

async function runPool<T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const item = items[next]!;
			next += 1;
			await worker(item);
		}
	});
	await Promise.all(lanes);
}

export function useFileEditor(args: UseFileEditorArgs) {
	const { value, table, column, multiple, upload, write, target, submitDraft, targetOfCreatedRow, onUploadError, onRowCreated, onSaved } = args;
	// The files the cell held when the editor opened; a refetch while it is open does not reset the edit.
	const [initial] = useState(() => storedEntries(value, column));
	const [entries, setEntriesState] = useState<FileEntry[]>(initial);
	const [phase, setPhase] = useState<FileEditorPhase>({ name: 'idle' });
	const entriesRef = useRef(entries);
	const controllers = useRef(new Map<string, AbortController>());
	const committed = useRef<SaveTarget | null>(null);
	const mounted = useRef(true);
	/** Set when the user cancels an upload during a save: that save stops before writing. */
	const cancelled = useRef(false);

	const setEntries = useCallback((update: (current: FileEntry[]) => FileEntry[]) => {
		entriesRef.current = update(entriesRef.current);
		if (mounted.current) setEntriesState(entriesRef.current);
	}, []);
	const patch = useCallback((key: string, change: Partial<FileEntry>) => {
		setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...change } : entry)));
	}, [setEntries]);

	useEffect(() => {
		mounted.current = true;
		const active = controllers.current;
		return () => {
			mounted.current = false;
			for (const controller of active.values()) controller.abort();
			for (const entry of entriesRef.current) if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
		};
	}, []);

	const busy = phase.name === 'creating-row' || phase.name === 'uploading' || phase.name === 'saving' || phase.name === 'processing';

	const dirty = useMemo(() => {
		if (entries.length !== initial.length) return true;
		return entries.some((entry, index) => entry.file !== null || entry.stored !== initial[index]?.stored);
	}, [entries, initial]);

	const discard = useCallback((entry: FileEntry) => {
		const controller = controllers.current.get(entry.key);
		if (controller) {
			cancelled.current = true;
			controller.abort();
		}
		controllers.current.delete(entry.key);
		if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
	}, []);

	const addFiles = useCallback((files: readonly File[]) => {
		if (files.length === 0) return;
		const picked = (multiple ? files : files.slice(0, 1)).map((file): FileEntry => ({
			key: entryKey(),
			stored: null,
			file,
			previewUrl: isImageUpload(file) && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null,
			status: 'selected',
			progress: null,
			error: null,
			element: undefined,
		}));
		setEntries((current) => {
			if (multiple) return [...current, ...picked];
			current.forEach(discard);
			return picked;
		});
		setPhase((current) => (current.name === 'failed' ? { name: 'idle' } : current));
	}, [discard, multiple, setEntries]);

	const remove = useCallback((key: string) => {
		setEntries((current) => {
			const entry = current.find((candidate) => candidate.key === key);
			if (entry) discard(entry);
			return current.filter((candidate) => candidate.key !== key);
		});
	}, [discard, setEntries]);

	const move = useCallback((key: string, delta: -1 | 1) => {
		setEntries((current) => {
			const index = current.findIndex((entry) => entry.key === key);
			const to = index + delta;
			if (index < 0 || to < 0 || to >= current.length) return current;
			const next = [...current];
			[next[index], next[to]] = [next[to]!, next[index]!];
			return next;
		});
	}, [setEntries]);

	const uploadEntry = useCallback(async (entry: FileEntry, recordId: string | number | undefined) => {
		if (upload.status !== 'ready' || !entry.file || !column) return;
		const controller = new AbortController();
		controllers.current.set(entry.key, controller);
		patch(entry.key, { status: 'uploading', progress: 0, error: null });
		try {
			const projection = await upload.send(entry.file, {
				recordId,
				signal: controller.signal,
				onProgress: ({ percentage }) => patch(entry.key, { progress: percentage }),
			});
			patch(entry.key, { status: 'uploaded', progress: 100, element: cellElementFor(column, projection, entry.file) });
		} catch (error) {
			if (controller.signal.aborted || isAbortError(error)) return;
			const message = error instanceof Error && error.message ? error.message : 'Upload failed';
			patch(entry.key, { status: 'failed', progress: null, error: message });
			onUploadError?.(message);
		} finally {
			controllers.current.delete(entry.key);
		}
	}, [column, onUploadError, patch, upload]);

	const save = useCallback(async () => {
		if (busy || !table || !column) return;
		try {
			let saveTarget = committed.current ?? target;
			if (!saveTarget) {
				if (!submitDraft) throw new Error('Save the row before adding a file.');
				setPhase({ name: 'creating-row' });
				const { createdRow: row } = await submitDraft();
				// The draft is gone from here on: the host refetches whatever happens next.
				onRowCreated?.();
				saveTarget = row ? targetOfCreatedRow(row) : null;
				if (!saveTarget) throw new Error('The row was created, but its key could not be read, so the file was not saved.');
				committed.current = saveTarget;
			}

			const pending = entriesRef.current.filter((entry) => entry.file && entry.status !== 'uploaded');
			if (pending.length > 0) {
				if (upload.status !== 'ready') {
					throw new Error(upload.status === 'unavailable' ? upload.reason : 'Storage is not ready yet.');
				}
				setPhase({ name: 'uploading' });
				cancelled.current = false;
				const recordId = typeof saveTarget.rowKey === 'object' ? undefined : saveTarget.rowKey;
				await runPool(pending, UPLOAD_CONCURRENCY, (entry) => uploadEntry(entry, recordId));
				if (!mounted.current) return;
				if (cancelled.current) {
					// A cancelled upload is not a request to save without it.
					cancelled.current = false;
					setPhase({ name: 'idle' });
					return;
				}
				const failed = entriesRef.current.filter((entry) => entry.status === 'failed').length;
				const unfinished = entriesRef.current.some((entry) => entry.file && entry.status !== 'uploaded');
				if (unfinished) {
					setPhase(failed
						? { name: 'failed', message: failed === 1 ? 'A file could not be uploaded.' : `${failed} files could not be uploaded.` }
						: { name: 'idle' });
					return;
				}
			}

			const elements = entriesRef.current.map((entry) => entry.element);
			const nextValue = multiple ? elements : elements[0] ?? null;
			setPhase({ name: 'saving' });
			const saved = await write({
				table,
				column,
				rowKey: saveTarget.rowKey,
				rowId: saveTarget.rowId,
				value: nextValue,
				onProcessing: () => {
					if (mounted.current) setPhase({ name: 'processing' });
				},
			});
			// After the editor closed, the cell shows the saved value from the refetch.
			if (!mounted.current) return;
			setPhase({ name: 'idle' });
			onSaved(saved, { createdRow: committed.current !== null });
		} catch (error) {
			if (isAbortError(error) || !mounted.current) return;
			setPhase({ name: 'failed', message: fileWriteMessage(error) });
		}
	}, [busy, column, multiple, onRowCreated, onSaved, submitDraft, table, target, targetOfCreatedRow, upload, uploadEntry, write]);

	/** Stop the uploads in flight. A write already sent keeps going and shows on the cell. */
	const cancelUploads = useCallback(() => {
		if (controllers.current.size > 0) cancelled.current = true;
		for (const controller of controllers.current.values()) controller.abort();
		controllers.current.clear();
	}, []);

	return {
		entries,
		phase,
		busy,
		dirty,
		/** True when the draft row still has to be created by the save. */
		needsRowCreation: !target && committed.current === null,
		addFiles,
		remove,
		move,
		save,
		cancelUploads,
	};
}
