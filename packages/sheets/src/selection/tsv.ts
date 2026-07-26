/**
 * TSV parse + tile — the INVERSE of {@link toTSV} (cell-extract.ts), used by the
 * clipboard.paste command. PURE + SSR-safe (no React, no DOM, no clipboard).
 *
 * `parseTSV` round-trips a `toTSV` string back into a `string[][]` matrix (split rows
 * on `\n`, cols on `\t`), tolerating ONE trailing newline (a spreadsheet copy ends the
 * last row with `\n`) so it does not yield a spurious empty trailing row. `tileMatrix`
 * implements spreadsheet fill semantics: a 1×N / N×1 source REPEATS to fill a larger
 * target, otherwise the source is written from the anchor as-is.
 */

/**
 * Parse a TSV string into a `string[][]` matrix (rows × cols). Splits rows on `\n`
 * (a lone trailing `\n` is dropped so it does not add an empty row) and cols on `\t`.
 * `\r` is stripped so a CRLF clipboard payload parses the same as LF. An empty string
 * yields a single empty cell `[['']]` (mirrors a 1×1 blank paste).
 */
export function parseTSV(text: string): string[][] {
	const normalized = text.replace(/\r\n?/g, '\n');
	// Drop a single trailing newline so a spreadsheet copy's terminal `\n` is not an extra row.
	const body = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
	return body.split('\n').map((line) => line.split('\t'));
}

/**
 * Tile `source` to fill a `targetW × targetH` region (spreadsheet fill semantics):
 *   • a 1×N source (single row) repeats DOWN to fill targetH rows.
 *   • an N×1 source (single col) repeats ACROSS to fill targetW cols.
 *   • a 1×1 source repeats in both axes.
 *   • any other (genuinely 2-D) source is returned unchanged — the caller writes it
 *     from the anchor as-is (no tiling), matching spreadsheet "paste block" behavior.
 *
 * Only repeats when the source is strictly smaller than the target on the repeating
 * axis; a source already >= the target is left intact (clamping is the caller's job).
 */
export function tileMatrix(source: string[][], targetW: number, targetH: number): string[][] {
	const srcH = source.length;
	const srcW = srcH > 0 ? source[0].length : 0;
	if (srcH === 0 || srcW === 0) return source;

	const isSingleRow = srcH === 1;
	const isSingleCol = srcW === 1;
	// Only 1×N / N×1 (and 1×1) sources tile; a real 2-D block pastes as-is.
	if (!isSingleRow && !isSingleCol) return source;

	const outH = isSingleRow && targetH > srcH ? targetH : srcH;
	const outW = isSingleCol && targetW > srcW ? targetW : srcW;

	const out: string[][] = [];
	for (let r = 0; r < outH; r++) {
		const srcRow = source[r % srcH];
		const line: string[] = [];
		for (let c = 0; c < outW; c++) {
			line.push(srcRow[c % srcW]);
		}
		out.push(line);
	}
	return out;
}
