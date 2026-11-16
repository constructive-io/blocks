// The import error report repeats text from the imported file: its column names, and
// values that reasons quote. A spreadsheet app opening the report must not run that
// text as a formula, so the report always protects it; plain text stays as it is.
import { describe, expect, it } from 'vitest';

import { readDelimitedTable } from '../delimited-text';
import { importErrorReportText } from '../files';

function reportRecords(text: string): string[][] {
	const table = readDelimitedTable(text, ',');
	return [table.header, ...table.records.map((record) => record.fields)];
}

describe('import error report', () => {
	it('protects file text that starts like a formula, and leaves other text as it is', () => {
		const text = importErrorReportText(
			[
				{ row: 3, column: '=HYPERLINK("https://example.com","x")', columnIndex: 0, reason: 'Enter a whole number.' },
				{ row: 2, column: 'Owner', columnIndex: 1, reason: '@SUM(1) matches no record.' },
			],
			[4],
		);

		expect(reportRecords(text)).toEqual([
			['Row', 'Column', 'Reason'],
			['2', 'Owner', "'@SUM(1) matches no record."],
			['3', `'=HYPERLINK("https://example.com","x")`, 'Enter a whole number.'],
			['4', '', 'Not imported: the import stopped before this row was sent.'],
		]);
	});
});
