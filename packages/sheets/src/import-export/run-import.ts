// Create the checked rows of an import, a few at a time.
//
// A small pool of workers takes rows in file order, so the server sees a bounded
// number of creates at once. Cancelling stops new creates; a create already sent
// is not aborted, because the server may have saved it, so its outcome is still
// counted. An ended session also stops the run, since every later create would
// fail the same way. Rows that were never sent are reported, so they can be
// imported again.

import { getErrorCode, isAuthenticationError } from '@constructive-io/data';

import type { ImportIssue, ImportRow } from './import-plan';

export interface ImportProgress {
	/** Rows sent and answered. */
	done: number;
	created: number;
	failed: number;
	total: number;
}

export interface ImportRunResult {
	created: number;
	/** Rows the server refused, with its reason. */
	failures: ImportIssue[];
	/** Rows never sent, because the run was cancelled or stopped. */
	notSent: number[];
	/** Why the run stopped early, or null when it sent every row or was cancelled. */
	stopReason: string | null;
}

export interface RunImportOptions {
	/** Creates in flight at once. Default 4. */
	concurrency?: number;
	/** Stops sending new rows when it aborts. */
	signal?: AbortSignal;
	onProgress?: (progress: ImportProgress) => void;
	/** The reason a failed create shows. */
	describeError: (error: unknown) => string;
}

const DEFAULT_CONCURRENCY = 4;
/** After an ended session or a suspended database, no later create can succeed. */
function stopsTheRun(error: unknown): boolean {
	return isAuthenticationError(error) || getErrorCode(error) === 'ACCESS_SUSPENDED';
}

export async function runImport(
	rows: readonly ImportRow[],
	create: (values: Record<string, unknown>) => Promise<unknown>,
	options: RunImportOptions,
): Promise<ImportRunResult> {
	const concurrency = Math.max(1, Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, rows.length || 1));
	const failures: ImportIssue[] = [];
	const sent = new Set<number>();
	let created = 0;
	let next = 0;
	let stopReason: string | null = null;

	const report = () =>
		options.onProgress?.({ done: created + failures.length, created, failed: failures.length, total: rows.length });

	const work = async () => {
		while (next < rows.length && !options.signal?.aborted && stopReason === null) {
			const index = next;
			next += 1;
			const row = rows[index]!;
			sent.add(index);
			try {
				await create(row.values);
				created += 1;
			} catch (error) {
				const reason = options.describeError(error);
				failures.push({ row: row.row, column: '', columnIndex: null, reason });
				if (stopsTheRun(error)) stopReason ??= reason;
			}
			report();
		}
	};

	report();
	await Promise.all(Array.from({ length: concurrency }, work));
	failures.sort((left, right) => left.row - right.row);
	const notSent = rows.flatMap((row, index) => (sent.has(index) ? [] : [row.row]));
	return { created, failures, notSent, stopReason };
}
