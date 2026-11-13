// The "Export view" button: every row of the current view as CSV, with
// progress and cancel. Formula protection follows the host's choice, like the
// grid's selected-rows export, which stays separate.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RiDownloadLine } from '@remixicon/react';

import type { SortSpec, TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from '@constructive-io/ui/dialog';
import { Progress } from '@constructive-io/ui/progress';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import { gridColumnKeys } from '../relations/relation-columns';
import { exportColumns, exportViewCsv, RELATION_PAGE_SIZE, type ExportViewResult } from './export-view';
import { downloadTextFile, safeFileName } from './files';

export interface ExportViewControlProps {
	/** The table, or null while it loads. */
	model: TableModel | null;
	/** The view's filter, search included. */
	where?: Readonly<Record<string, unknown>>;
	orderBy?: readonly SortSpec[];
	/** The view's column keys in order (column names and relation field names). Default: every grid column. */
	columns?: readonly string[];
	/** Download file name. Default: the table name with `.csv`. */
	filename?: string;
	/** Prefix text that starts like a spreadsheet formula with an apostrophe (see `formula-protection.ts`). Default false. */
	protectFormulas?: boolean;
}

type ExportState =
	| { status: 'idle' }
	| { status: 'running'; loaded: number; total: number | null }
	| { status: 'done'; result: ExportViewResult; filename: string }
	| { status: 'failed'; message: string };

function unavailableReasonOf(model: TableModel | null, columnCount: number): string | null {
	if (!model) return 'Export is available once the table has loaded.';
	if (!model.operations.list) return 'The rows of this table cannot be read.';
	if (columnCount === 0) return 'No column of this view can be exported.';
	return null;
}

function count(value: number, one: string, many = `${one}s`): string {
	return `${value.toLocaleString()} ${value === 1 ? one : many}`;
}

export function ExportViewControl({ model, where, orderBy, columns, filename, protectFormulas = false }: ExportViewControlProps) {
	const { execute } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const [state, setState] = useState<ExportState>({ status: 'idle' });
	const controllerRef = useRef<AbortController | null>(null);
	const reasonId = useId();

	useEffect(() => () => controllerRef.current?.abort(), []);

	const keys = useMemo(() => columns ?? (model ? gridColumnKeys(model) : []), [columns, model]);
	const columnCount = useMemo(() => (model ? exportColumns(model, keys).length : 0), [keys, model]);
	const unavailableReason = unavailableReasonOf(model, columnCount);

	const run = useCallback(async () => {
		if (!model) return;
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setState({ status: 'running', loaded: 0, total: null });
		const name = filename ?? safeFileName(model.name, '.csv');
		try {
			const result = await exportViewCsv(
				{ adapter, execute, model },
				{ where, orderBy, columns: keys },
				{
					protectFormulas,
					signal: controller.signal,
					onProgress: ({ loaded, total }) => {
						if (!controller.signal.aborted) setState({ status: 'running', loaded, total });
					},
				},
			);
			if (controller.signal.aborted) return;
			downloadTextFile(result.text, name);
			setState({ status: 'done', result, filename: name });
		} catch (error) {
			if (controller.signal.aborted) return;
			const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
			setState({ status: 'failed', message: `The rows could not be exported.${detail}` });
		}
	}, [adapter, execute, filename, keys, model, orderBy, protectFormulas, where]);

	const cancel = () => {
		controllerRef.current?.abort();
		setState({ status: 'idle' });
	};

	const notes =
		state.status === 'done'
			? [
					state.result.unreadableCells > 0
						? `${count(state.result.unreadableCells, 'value')} could not be read and ${state.result.unreadableCells === 1 ? 'is' : 'are'} left empty.`
						: null,
					state.result.truncatedLists > 0
						? `${count(state.result.truncatedLists, 'cell')} of linked-record lists hold only the first ${RELATION_PAGE_SIZE} records.`
						: null,
				].filter((note): note is string => Boolean(note))
			: [];

	return (
		<>
			<span title={unavailableReason ?? undefined} className='inline-flex'>
				<Button
					variant='outline'
					size='sm'
					aria-label='Export all rows of this view as CSV'
					disabled={Boolean(unavailableReason)}
					aria-describedby={unavailableReason ? reasonId : undefined}
					onClick={() => void run()}
				>
					<RiDownloadLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
					Export view
				</Button>
				{unavailableReason && (
					<span id={reasonId} className='sr-only'>
						{unavailableReason}
					</span>
				)}
			</span>
			<Dialog
				open={state.status !== 'idle'}
				onOpenChange={(next) => {
					if (!next) cancel();
				}}
			>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle>Export view</DialogTitle>
						<DialogDescription>Every row of this view, with its filter, search, sort and columns.</DialogDescription>
					</DialogHeader>
					<DialogPanel>
						{state.status === 'running' && (
							<div className='space-y-3'>
								<Progress value={state.total === null ? null : state.loaded} min={0} max={Math.max(state.total ?? 0, 1)} aria-label='Export progress' />
								<p role='status' aria-live='polite' className='text-sm tabular-nums'>
									{state.total === null
										? `${count(state.loaded, 'row')} read…`
										: `${state.loaded.toLocaleString()} of ${count(state.total, 'row')} read…`}
								</p>
							</div>
						)}
						{state.status === 'done' && (
							<div className='space-y-2 text-sm'>
								<p role='status'>
									{count(state.result.rowCount, 'row')} exported to {state.filename}.
								</p>
								{notes.map((note) => (
									<p key={note} className='text-muted-foreground'>
										{note}
									</p>
								))}
							</div>
						)}
						{state.status === 'failed' && (
							<p role='alert' className='text-destructive text-sm'>
								{state.message}
							</p>
						)}
					</DialogPanel>
					<DialogFooter>
						{state.status === 'running' && (
							<Button variant='outline' onClick={cancel}>
								Cancel
							</Button>
						)}
						{state.status === 'done' && (
							<Button variant='outline' onClick={() => downloadTextFile(state.result.text, state.filename)}>
								Download again
							</Button>
						)}
						{state.status === 'failed' && (
							<Button variant='outline' onClick={() => void run()}>
								Try again
							</Button>
						)}
						{state.status !== 'running' && <Button onClick={cancel}>Close</Button>}
					</DialogFooter>
				</DialogPopup>
			</Dialog>
		</>
	);
}
