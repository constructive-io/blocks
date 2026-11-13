// The Import button and its dialog: file or pasted rows, column mapping, a
// checked preview, the import with progress and cancel, and the error report.

import { useId, useState } from 'react';
import { RiUploadLine } from '@remixicon/react';

import type { TableModel } from '@constructive-io/data';
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

import { downloadTextFile, importErrorReportText, safeFileName } from './files';
import { DoneStep, MappingStep, ReviewStep, RunningStep, SourceStep } from './import-steps';
import { useImportRecords } from './use-import-records';

export interface ImportRecordsControlProps {
	/** The table to add records to, or null while it loads. */
	model: TableModel | null;
	/** Name used in the dialog title and the error report's file name. Default: the table name. */
	tableLabel?: string;
}

const DESCRIPTIONS = {
	source: 'Each row of the file becomes a new record.',
	mapping: 'Choose the field each column of the file fills. Columns set to "Do not import" are left out.',
	checking: 'Checking every row of the file.',
	review: 'Rows with problems are not imported. The error report lists them.',
	running: 'Adding records. Rows already sent still finish when you cancel.',
	done: 'The import has finished.',
} as const;

export function ImportRecordsControl({ model, tableLabel }: ImportRecordsControlProps) {
	const flow = useImportRecords(model);
	const [open, setOpen] = useState(false);
	const reasonId = useId();
	const { phase } = flow;
	const label = tableLabel ?? model?.name ?? 'records';
	const busy = phase.step === 'running' || phase.step === 'checking';
	// The first step has no actions of its own (the file and paste buttons sit in the step), so it has no footer band.
	const hasActions = phase.step !== 'source';

	const downloadReport = () => {
		if (phase.step === 'review') downloadTextFile(importErrorReportText(phase.issues), safeFileName(label, '-import-problems.csv'));
		if (phase.step === 'done') {
			const { result, issues } = phase;
			downloadTextFile(
				importErrorReportText([...issues, ...result.failures], result.notSent),
				safeFileName(label, '-import-errors.csv'),
			);
		}
	};
	const reportCount =
		phase.step === 'review'
			? phase.issues.length
			: phase.step === 'done'
				? phase.issues.length + phase.result.failures.length + phase.result.notSent.length
				: 0;

	const close = () => {
		if (busy) return;
		setOpen(false);
		if (phase.step === 'done') flow.reset();
	};

	return (
		<>
			<span title={flow.unavailableReason ?? undefined} className='inline-flex'>
				<Button
					variant='outline'
					size='sm'
					disabled={Boolean(flow.unavailableReason)}
					aria-describedby={flow.unavailableReason ? reasonId : undefined}
					onClick={() => setOpen(true)}
				>
					<RiUploadLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
					Import
				</Button>
				{flow.unavailableReason && (
					<span id={reasonId} className='sr-only'>
						{flow.unavailableReason}
					</span>
				)}
			</span>
			<Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
				<DialogPopup className='max-w-3xl' showCloseButton={!busy}>
					<DialogHeader>
						<DialogTitle>Import into {label}</DialogTitle>
						<DialogDescription>{DESCRIPTIONS[phase.step]}</DialogDescription>
					</DialogHeader>
					<DialogPanel>
						{phase.step === 'source' && <SourceStep flow={flow} />}
						{phase.step === 'mapping' && <MappingStep flow={flow} />}
						{phase.step === 'checking' && (
							<p role='status' className='text-sm'>
								Checking {flow.source?.table.records.length.toLocaleString()} rows…
							</p>
						)}
						{phase.step === 'review' && <ReviewStep flow={flow} rows={phase.rows} issues={phase.issues} />}
						{phase.step === 'running' && <RunningStep progress={phase.progress} />}
						{phase.step === 'done' && <DoneStep result={phase.result} issues={phase.issues} cancelled={phase.cancelled} />}
					</DialogPanel>
					{hasActions && (
						<DialogFooter>
							{reportCount > 0 && (
								<Button variant='outline' onClick={downloadReport}>
									Download error report
								</Button>
							)}
							{(phase.step === 'mapping' || phase.step === 'review') && (
								<Button variant='ghost' onClick={flow.back}>
									Back
								</Button>
							)}
							{busy && (
								<Button variant='outline' onClick={flow.cancel}>
									Cancel
								</Button>
							)}
							{phase.step === 'mapping' && (
								<Button
									disabled={flow.problems.length > 0 || flow.loadingLinkedTables}
									title={flow.loadingLinkedTables ? 'The linked tables are still loading.' : undefined}
									onClick={() => void flow.check()}
								>
									{flow.loadingLinkedTables ? 'Loading linked tables…' : 'Check rows'}
								</Button>
							)}
							{phase.step === 'review' && (
								<Button
									disabled={phase.rows.length === 0}
									title={phase.rows.length === 0 ? 'No row is ready to import.' : undefined}
									onClick={() => void flow.start()}
								>
									{phase.rows.length === 0 ? 'Nothing to import' : `Import ${phase.rows.length.toLocaleString()} ${phase.rows.length === 1 ? 'row' : 'rows'}`}
								</Button>
							)}
							{phase.step === 'done' && (
								<>
									<Button variant='outline' onClick={flow.reset}>
										Import another file
									</Button>
									<Button onClick={close}>Close</Button>
								</>
							)}
						</DialogFooter>
					)}
				</DialogPopup>
			</Dialog>
		</>
	);
}
