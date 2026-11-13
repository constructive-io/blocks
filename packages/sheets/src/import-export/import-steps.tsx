// The steps of the import dialog. Each step renders what `useImportRecords`
// holds; none of them reads or writes data on its own.

import { useId, useMemo, useRef, useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import { Progress } from '@constructive-io/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Textarea } from '@constructive-io/ui/textarea';

import type { ColumnValueKind } from '@constructive-io/data';

import type { Delimiter } from './delimited-text';
import { fileColumnName, type ImportIssue, type ImportRow } from './import-plan';
import type { ImportProgress, ImportRunResult } from './run-import';
import type { UseImportRecordsResult } from './use-import-records';

/** Rows the review step shows. */
export const PREVIEW_ROWS = 20;

const SKIP = '__skip__';

const DELIMITER_NAMES: Record<Delimiter, string> = { ',': 'Comma', '\t': 'Tab', ';': 'Semicolon', '|': 'Vertical bar' };

function plural(count: number, one: string, many = `${one}s`): string {
	return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function Problems({ items, label }: { items: readonly string[]; label: string }) {
	if (items.length === 0) return null;
	return (
		<div role='alert' aria-label={label} className='border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm'>
			<ul className='list-disc space-y-1 ps-4'>
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</div>
	);
}

export function SourceStep({ flow }: { flow: UseImportRecordsResult }) {
	const fileRef = useRef<HTMLInputElement>(null);
	const pasteId = useId();
	const [pasted, setPasted] = useState('');
	const phase = flow.phase.step === 'source' ? flow.phase : null;

	return (
		<div
			className='space-y-4'
			onDragOver={(event) => event.preventDefault()}
			onDrop={(event) => {
				event.preventDefault();
				const file = event.dataTransfer.files[0];
				if (file) void flow.readFile(file);
			}}
		>
			<div className='border-input flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center'>
				<p className='text-sm'>Choose a CSV or tab-separated file, or drop it here. The first row must name the columns.</p>
				<input
					ref={fileRef}
					type='file'
					accept='.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain'
					aria-label='Choose a file to import'
					className='sr-only'
					tabIndex={-1}
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = '';
						if (file) void flow.readFile(file);
					}}
				/>
				<Button variant='outline' size='sm' disabled={phase?.reading} onClick={() => fileRef.current?.click()}>
					{phase?.reading ? 'Reading the file…' : 'Choose a file'}
				</Button>
			</div>
			<div className='space-y-2'>
				<label htmlFor={pasteId} className='text-sm font-medium'>
					Or paste rows from a spreadsheet
				</label>
				<Textarea
					id={pasteId}
					rows={6}
					value={pasted}
					placeholder={'name,code\nFirst record,A1'}
					onChange={(event) => setPasted(event.target.value)}
				/>
				<div className='flex justify-end'>
					<Button variant='outline' size='sm' disabled={pasted.trim() === ''} onClick={() => flow.readText(pasted, '')}>
						Use pasted rows
					</Button>
				</div>
			</div>
			{phase?.error && <Problems items={[phase.error]} label='The rows cannot be read' />}
		</div>
	);
}

export function MappingStep({ flow }: { flow: UseImportRecordsResult }) {
	const { source, mapping, targets } = flow;
	const labels = useMemo(
		() => Object.fromEntries([[SKIP, 'Do not import'], ...targets.map((target) => [target.key, target.label])]) as Record<string, string>,
		[targets],
	);
	if (!source) return null;
	const { table } = source;
	const sample = table.records[0]?.fields ?? [];
	const error = flow.phase.step === 'mapping' ? flow.phase.error ?? null : null;

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
				<span role='status'>
					{plural(table.records.length, 'row')} in {source.name}
				</span>
				<span className='flex items-center gap-2'>
					<span className='text-muted-foreground'>Separator</span>
					<Select value={table.delimiter} onValueChange={(value) => flow.setDelimiter(value as Delimiter)}>
						<SelectTrigger size='sm' className='w-[9rem]' aria-label='Separator'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(DELIMITER_NAMES) as Delimiter[]).map((delimiter) => (
								<SelectItem key={delimiter} value={delimiter}>
									{DELIMITER_NAMES[delimiter]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</span>
			</div>
			{source.warnings.length > 0 && (
				<p role='status' className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm'>
					{source.warnings.join(' ')}
				</p>
			)}
			<table className='w-full text-sm'>
				<caption className='sr-only'>Columns of the file and the field each one fills</caption>
				<thead className='text-muted-foreground text-left text-xs'>
					<tr>
						<th className='py-1 pe-3 font-medium'>Column of the file</th>
						<th className='py-1 pe-3 font-medium'>First value</th>
						<th className='py-1 font-medium'>Import into</th>
					</tr>
				</thead>
				<tbody>
					{table.header.map((_, index) => {
						const name = fileColumnName(table.header, index);
						return (
							<tr key={index} className='border-border/60 border-t'>
								<td className='py-1.5 pe-3 font-medium'>{name}</td>
								<td className='text-muted-foreground max-w-[12rem] truncate py-1.5 pe-3' title={sample[index] ?? ''}>
									{sample[index] ?? ''}
								</td>
								<td className='py-1.5'>
									<Select
										value={mapping[index] ?? SKIP}
										items={labels}
										onValueChange={(value) => flow.setTarget(index, value === SKIP ? null : value)}
									>
										<SelectTrigger size='sm' className='w-[14rem]' aria-label={`Field for ${name}`}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={SKIP}>Do not import</SelectItem>
											{targets.map((target) => (
												<SelectItem key={target.key} value={target.key}>
													{target.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<Problems items={error ? [error, ...flow.problems] : flow.problems} label='The import cannot be checked yet' />
		</div>
	);
}

/** Value kinds whose preview column is right-aligned with tabular figures. */
const NUMERIC_KINDS: ReadonlySet<ColumnValueKind> = new Set(['integer', 'bigint', 'decimal', 'float']);
/** Value kinds whose preview column uses tabular figures; dates and times stay left-aligned. */
const TABULAR_KINDS: ReadonlySet<ColumnValueKind> = new Set(['date', 'time', 'datetime', 'interval']);

/** Alignment and figures of a preview column, from the field its file column fills. */
function previewColumnClass(flow: UseImportRecordsResult, columnIndex: number): string {
	const target = flow.targets.find((candidate) => candidate.key === flow.mapping[columnIndex]);
	const kind = target?.kind === 'column' && !target.column.value.isArray ? target.column.value.kind : null;
	if (kind && NUMERIC_KINDS.has(kind)) return 'text-end tabular-nums';
	if (kind && TABULAR_KINDS.has(kind)) return 'tabular-nums';
	return '';
}

/** The reasons of each cell of the preview, by row and file column. */
function issuesByCell(issues: readonly ImportIssue[]): Map<string, string[]> {
	const out = new Map<string, string[]>();
	for (const issue of issues) {
		const key = `${issue.row}:${issue.columnIndex ?? ''}`;
		out.set(key, [...(out.get(key) ?? []), issue.reason]);
	}
	return out;
}

export function ReviewStep({ flow, rows, issues }: { flow: UseImportRecordsResult; rows: readonly ImportRow[]; issues: readonly ImportIssue[] }) {
	const { source, mapping } = flow;
	if (!source) return null;
	const failedRows = new Set(issues.map((issue) => issue.row)).size;
	const columns = mapping.flatMap((key, index) => (key ? [index] : []));
	const cells = issuesByCell(issues);
	const preview = source.table.records.slice(0, PREVIEW_ROWS);

	return (
		<div className='space-y-4'>
			<p role='status' className='text-sm'>
				{plural(rows.length, 'row is', 'rows are')} ready to import.
				{failedRows > 0 && ` ${plural(failedRows, 'row has', 'rows have')} problems and will not be imported.`}
			</p>
			<div className='overflow-x-auto'>
				<table className='w-full text-sm'>
					<caption className='sr-only'>
						The first {Math.min(PREVIEW_ROWS, source.table.records.length)} rows of the file, checked
					</caption>
					<thead className='text-muted-foreground text-left text-xs'>
						<tr>
							<th className='py-1 pe-3 text-end font-medium'>Row</th>
							{/* Problems come before the values, so a wide file never pushes them out of view. */}
							<th className='min-w-[14rem] py-1 pe-3 font-medium'>Problems</th>
							{columns.map((index) => (
								<th key={index} className={`py-1 pe-3 font-medium ${previewColumnClass(flow, index)}`}>
									{fileColumnName(source.table.header, index)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{preview.map((record) => {
							const rowProblems = issues.filter((issue) => issue.row === record.row).map((issue) => issue.reason);
							return (
								<tr key={record.row} className='border-border/60 border-t align-top'>
									<td className='text-muted-foreground py-1.5 pe-3 text-end tabular-nums'>{record.row}</td>
									<td className='text-destructive py-1.5 pe-3'>{rowProblems.join(' ')}</td>
									{columns.map((index) => {
										const reasons = cells.get(`${record.row}:${index}`);
										return (
											<td
												key={index}
												className={`max-w-[10rem] truncate py-1.5 pe-3 ${previewColumnClass(flow, index)}${reasons ? ' text-destructive' : ''}`}
												title={reasons ? reasons.join(' ') : record.fields[index] ?? ''}
												aria-invalid={reasons ? true : undefined}
											>
												{record.fields[index] ?? ''}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			{source.table.records.length > PREVIEW_ROWS && (
				<p className='text-muted-foreground text-xs'>
					Showing the first {PREVIEW_ROWS} rows. The error report lists the problems of every row.
				</p>
			)}
		</div>
	);
}

export function RunningStep({ progress }: { progress: ImportProgress }) {
	return (
		<div className='space-y-3'>
			<Progress value={progress.done} min={0} max={Math.max(progress.total, 1)} aria-label='Import progress' />
			<p role='status' aria-live='polite' className='text-sm tabular-nums'>
				{progress.done.toLocaleString()} of {plural(progress.total, 'row')} sent
				{progress.failed > 0 ? `, ${progress.failed.toLocaleString()} refused` : ''}.
			</p>
		</div>
	);
}

export function DoneStep({ result, issues, cancelled }: { result: ImportRunResult; issues: readonly ImportIssue[]; cancelled: boolean }) {
	const skipped = new Set(issues.map((issue) => issue.row)).size;
	const lines = [
		`${plural(result.created, 'record')} ${result.created === 1 ? 'was' : 'were'} added.`,
		result.failures.length > 0 ? `${plural(result.failures.length, 'row was', 'rows were')} refused.` : null,
		skipped > 0 ? `${plural(skipped, 'row was', 'rows were')} not imported because of problems in the file.` : null,
		result.notSent.length > 0
			? `${plural(result.notSent.length, 'row was', 'rows were')} not sent, because the import ${cancelled ? 'was cancelled' : 'stopped'}.`
			: null,
	].filter((line): line is string => Boolean(line));

	return (
		<div className='space-y-3'>
			<p role='status' className='text-sm'>
				{lines.join(' ')}
			</p>
			{result.stopReason && <Problems items={[result.stopReason]} label='The import stopped' />}
		</div>
	);
}
