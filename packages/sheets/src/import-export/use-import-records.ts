// The import flow of one table, as state a dialog renders: read a file or pasted
// text, map its columns to fields, check every row, create the rows, report.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { TableModel } from '@constructive-io/data';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import { writeErrorMessages } from '../grid/feedback/write-errors';
import { sheetsQueryKeys } from '../hooks/query-keys';
import { useTableModels } from '../hooks/use-table-model';
import { readDelimitedTable, type DelimitedTable, type Delimiter } from './delimited-text';
import { NOT_UTF8_WARNING, readTextFile } from './files';
import { draftImportRows, finishImportRows, linkedTexts, type ImportIssue, type ImportRow } from './import-plan';
import { importTargets, mappingProblems, matchHeaders, type ImportMapping, type ImportTarget } from './import-targets';
import { resolveLinkedRecords, type LinkResult } from './linked-records';
import { runImport, type ImportProgress, type ImportRunResult } from './run-import';

export interface ImportSource {
	/** The file name, or "Pasted text". */
	name: string;
	text: string;
	table: DelimitedTable;
	/** Problems that do not stop the import, such as characters that could not be read. */
	warnings: readonly string[];
}

export type ImportPhase =
	| { step: 'source'; reading: boolean; error: string | null }
	| { step: 'mapping'; error?: string | null }
	| { step: 'checking' }
	| { step: 'review'; rows: readonly ImportRow[]; issues: readonly ImportIssue[] }
	| { step: 'running'; rows: readonly ImportRow[]; issues: readonly ImportIssue[]; progress: ImportProgress }
	| { step: 'done'; issues: readonly ImportIssue[]; result: ImportRunResult; cancelled: boolean };

export interface UseImportRecordsResult {
	phase: ImportPhase;
	/** Why the table takes no import, or null. */
	unavailableReason: string | null;
	targets: readonly ImportTarget[];
	source: ImportSource | null;
	mapping: ImportMapping;
	/** Why the current mapping cannot be checked yet; empty when it can. */
	problems: readonly string[];
	/** True while the tables of the chosen linked records load. */
	loadingLinkedTables: boolean;
	readText: (text: string, name: string) => void;
	readFile: (file: File) => Promise<void>;
	setDelimiter: (delimiter: Delimiter) => void;
	setTarget: (columnIndex: number, targetKey: string | null) => void;
	check: () => Promise<void>;
	start: () => Promise<void>;
	/** Stop checking or creating. Rows already sent still finish. */
	cancel: () => void;
	back: () => void;
	reset: () => void;
}

const PASTED_NAME = 'Pasted text';
/** What a UTF-8 reader puts in place of bytes it cannot decode. */
const REPLACEMENT_CHARACTER = '\uFFFD';

function readSource(text: string, name: string, delimiter?: Delimiter): ImportSource | string {
	const table = readDelimitedTable(text, delimiter);
	if (table.header.every((cell) => cell.trim() === '')) return 'There are no rows to import. The first row must name the columns.';
	if (table.records.length === 0) return 'There is a header row, but no rows under it to import.';
	if (table.unclosedQuoteRow !== null) {
		return `A quoted value that starts on row ${table.unclosedQuoteRow} is never closed. Check the quotes in the file and try again.`;
	}
	return { name, text, table, warnings: text.includes(REPLACEMENT_CHARACTER) ? [NOT_UTF8_WARNING] : [] };
}

function unavailableReasonOf(model: TableModel | null, targets: readonly ImportTarget[]): string | null {
	if (!model) return 'Import is available once the table has loaded.';
	if (!model.operations.create) {
		return model.issues.find((issue) => issue.scope === 'operation' && issue.target === 'create')?.message ?? 'New records cannot be added to this table.';
	}
	if (targets.length === 0) return 'No field of this table can be set from a file.';
	return null;
}

export function useImportRecords(model: TableModel | null): UseImportRecordsResult {
	const { execute, scopeKey } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const queryClient = useQueryClient();

	const targets = useMemo(() => (model ? importTargets(model) : []), [model]);
	const [phase, setPhase] = useState<ImportPhase>({ step: 'source', reading: false, error: null });
	const [source, setSource] = useState<ImportSource | null>(null);
	const [mapping, setMapping] = useState<ImportMapping>([]);
	const controllerRef = useRef<AbortController | null>(null);

	useEffect(() => () => controllerRef.current?.abort(), []);

	const linkedTargetKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const key of mapping) {
			const target = targets.find((candidate) => candidate.key === key);
			if (target?.kind === 'relation' && target.relation.targetKey) keys.add(target.relation.targetKey);
		}
		return [...keys];
	}, [mapping, targets]);
	const { models: linkedModels, isLoading: loadingLinkedTables } = useTableModels(linkedTargetKeys);

	const problems = useMemo(
		() => (model && source ? mappingProblems(mapping, targets, model) : []),
		[mapping, model, source, targets],
	);

	const applySource = useCallback(
		(next: ImportSource | string) => {
			if (typeof next === 'string') {
				setPhase({ step: 'source', reading: false, error: next });
				return;
			}
			setSource(next);
			setMapping(matchHeaders(next.table.header, targets));
			setPhase({ step: 'mapping' });
		},
		[targets],
	);

	const readText = useCallback((text: string, name: string) => applySource(readSource(text, name || PASTED_NAME)), [applySource]);

	const readFile = useCallback(
		async (file: File) => {
			setPhase({ step: 'source', reading: true, error: null });
			try {
				applySource(readSource(await readTextFile(file), file.name));
			} catch {
				setPhase({ step: 'source', reading: false, error: `${file.name} could not be read.` });
			}
		},
		[applySource],
	);

	const setDelimiter = useCallback(
		(delimiter: Delimiter) => {
			if (source) applySource(readSource(source.text, source.name, delimiter));
		},
		[source, applySource],
	);

	const setTarget = useCallback((columnIndex: number, targetKey: string | null) => {
		setMapping((current) => current.map((key, index) => (index === columnIndex ? targetKey : key)));
	}, []);

	const check = useCallback(async () => {
		if (!model || !source || problems.length > 0) return;
		const controller = new AbortController();
		controllerRef.current = controller;
		setPhase({ step: 'checking' });
		try {
			const drafts = draftImportRows(source.table, mapping, targets);
			const links = new Map<string, Map<string, LinkResult>>();
			for (const [key, texts] of linkedTexts(drafts)) {
				const target = targets.find((candidate) => candidate.key === key);
				if (target?.kind !== 'relation') continue;
				const linked = target.relation.targetKey ? linkedModels.get(target.relation.targetKey) ?? null : null;
				links.set(key, await resolveLinkedRecords(target.relation, { adapter, execute, target: linked }, texts, controller.signal));
			}
			const { rows, issues } = finishImportRows(drafts, source.table.header, links);
			if (!controller.signal.aborted) setPhase({ step: 'review', rows, issues });
		} catch {
			setPhase({ step: 'mapping', error: controller.signal.aborted ? null : 'The rows could not be checked. Try again.' });
		}
	}, [adapter, execute, linkedModels, mapping, model, problems.length, source, targets]);

	const start = useCallback(async () => {
		if (!model || phase.step !== 'review' || phase.rows.length === 0) return;
		const { rows, issues } = phase;
		const controller = new AbortController();
		controllerRef.current = controller;
		const ctx = { model, tableName: model.key };
		setPhase({ step: 'running', rows, issues, progress: { done: 0, created: 0, failed: 0, total: rows.length } });
		const result = await runImport(rows, (values) => adapter.createRow(ctx, values, execute), {
			signal: controller.signal,
			describeError: (error) => writeErrorMessages(error, 'create').join(' '),
			onProgress: (progress) => setPhase((current) => (current.step === 'running' ? { ...current, progress } : current)),
		});
		if (result.created > 0) {
			// Every cached page of the table, in each paging mode. A bare table name is a prefix of each schema's entries.
			for (const queryKey of [
				sheetsQueryKeys.table(scopeKey, model.name),
				sheetsQueryKeys.infiniteTable(scopeKey, model.name),
				sheetsQueryKeys.cursorTable(scopeKey, model.name).slice(0, -1),
			]) {
				void queryClient.invalidateQueries({ queryKey });
			}
		}
		setPhase({ step: 'done', issues, result, cancelled: controller.signal.aborted });
	}, [adapter, execute, model, phase, queryClient, scopeKey]);

	const cancel = useCallback(() => controllerRef.current?.abort(), []);

	const back = useCallback(() => {
		controllerRef.current?.abort();
		setPhase((current) => {
			if (current.step === 'mapping') return { step: 'source', reading: false, error: null };
			if (current.step === 'review' || current.step === 'checking') return { step: 'mapping' };
			return current;
		});
	}, []);

	const reset = useCallback(() => {
		controllerRef.current?.abort();
		setSource(null);
		setMapping([]);
		setPhase({ step: 'source', reading: false, error: null });
	}, []);

	return {
		phase,
		unavailableReason: unavailableReasonOf(model, targets),
		targets,
		source,
		mapping,
		problems,
		loadingLinkedTables,
		readText,
		readFile,
		setDelimiter,
		setTarget,
		check,
		start,
		cancel,
		back,
		reset,
	};
}
