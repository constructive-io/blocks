// Delimited text (CSV, TSV and their semicolon or pipe variants), read and written.
//
// Reading follows RFC 4180 and what spreadsheets write: a field may be quoted, a
// quoted field may hold the delimiter, line breaks and doubled quotes, lines end
// in CRLF, LF or CR, and a leading byte-order mark is dropped. The delimiter is
// detected from the first lines when the caller does not name one.

export type Delimiter = ',' | '\t' | ';' | '|';

export const DELIMITERS: readonly Delimiter[] = ['\t', ',', ';', '|'];

/** One record of a delimited text. */
export interface DelimitedRecord {
	/** The record's row number as a spreadsheet app shows it: the first record is row 1, blank lines count. */
	row: number;
	fields: string[];
}

export interface DelimitedTable {
	delimiter: Delimiter;
	/** The first record. */
	header: string[];
	/** Every record after the header, blank lines left out. */
	records: DelimitedRecord[];
	/** The row of a quoted field that is never closed (it runs to the end of the text), or null. */
	unclosedQuoteRow: number | null;
}

const BOM = '\uFEFF';
/** Characters the delimiter detection reads. */
const DETECTION_SAMPLE = 8192;

function scan(text: string, delimiter: Delimiter): { records: DelimitedRecord[]; unclosedQuoteRow: number | null } {
	const source = text.startsWith(BOM) ? text.slice(1) : text;
	const records: DelimitedRecord[] = [];
	let fields: string[] = [];
	let field = '';
	let inQuotes = false;
	let row = 0;

	const endRecord = () => {
		fields.push(field);
		row += 1;
		// A blank line is no record, but it keeps its row number.
		if (fields.length > 1 || fields[0] !== '') records.push({ row, fields });
		fields = [];
		field = '';
	};

	for (let index = 0; index < source.length; index += 1) {
		const character = source[index]!;
		if (inQuotes) {
			if (character !== '"') field += character;
			else if (source[index + 1] === '"') {
				field += '"';
				index += 1;
			} else inQuotes = false;
			continue;
		}
		if (character === '"' && field === '') {
			inQuotes = true;
		} else if (character === delimiter) {
			fields.push(field);
			field = '';
		} else if (character === '\r' || character === '\n') {
			if (character === '\r' && source[index + 1] === '\n') index += 1;
			endRecord();
		} else {
			field += character;
		}
	}
	const unclosedQuoteRow = inQuotes ? row + 1 : null;
	if (field !== '' || fields.length > 0 || inQuotes) endRecord();
	return { records, unclosedQuoteRow };
}

/** The records of a delimited text, blank lines left out. */
export function parseDelimited(text: string, delimiter: Delimiter): DelimitedRecord[] {
	return scan(text, delimiter).records;
}

/**
 * The delimiter a text uses: the candidate that splits the first lines into the
 * same number of fields (more than one) most often. Tab wins a tie, then comma.
 */
export function detectDelimiter(text: string): Delimiter {
	const sample = text.slice(0, DETECTION_SAMPLE);
	let best: { delimiter: Delimiter; score: number } = { delimiter: ',', score: 0 };
	for (const delimiter of DELIMITERS) {
		const counts = parseDelimited(sample, delimiter).slice(0, 20).map((record) => record.fields.length);
		const frequency = new Map<number, number>();
		for (const count of counts) frequency.set(count, (frequency.get(count) ?? 0) + 1);
		let score = 0;
		for (const [count, times] of frequency) if (count > 1) score = Math.max(score, times * 100 + count);
		if (score > best.score) best = { delimiter, score };
	}
	return best.delimiter;
}

/** Read a delimited text into a header and records. */
export function readDelimitedTable(text: string, delimiter: Delimiter = detectDelimiter(text)): DelimitedTable {
	const { records, unclosedQuoteRow } = scan(text, delimiter);
	const [first, ...rest] = records;
	return { delimiter, header: first?.fields ?? [], records: rest, unclosedQuoteRow };
}

function quoteField(value: string, delimiter: Delimiter): string {
	return value.includes(delimiter) || /["\r\n]/.test(value) || value !== value.trim()
		? `"${value.replace(/"/g, '""')}"`
		: value;
}

/** Write records as delimited text with CRLF line ends, quoting only the fields that need it. */
export function writeDelimited(records: readonly (readonly string[])[], delimiter: Delimiter = ','): string {
	return records.map((record) => record.map((value) => quoteField(value, delimiter)).join(delimiter)).join('\r\n');
}

/** A CSV file body: a byte-order mark first, so spreadsheet apps read it as UTF-8. */
export function csvFileText(records: readonly (readonly string[])[]): string {
	return `${BOM}${writeDelimited(records, ',')}\r\n`;
}
