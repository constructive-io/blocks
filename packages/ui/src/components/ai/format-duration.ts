/** Format elapsed ms for "Thought for …" / "Worked for …" labels. */
export function formatDuration(ms: number): string {
	// Round before choosing the unit, so 999.6 ms is "1.0s" rather than "1000ms" and 9.96 seconds is "10s" rather than "10.0s".
	const wholeMs = Math.round(ms);
	if (wholeMs < 1000) return `${Math.max(1, wholeMs)}ms`;
	const seconds = ms / 1000;
	const tenths = Math.round(seconds * 10) / 10;
	if (tenths < 10) return `${tenths.toFixed(1)}s`;
	// Round once, then split, so 59.6 seconds is "1m" rather than "60s" and an hour reads "1h" rather than "60m".
	const total = Math.round(seconds);
	if (total < 60) return `${total}s`;
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const rem = total % 60;
	if (hours > 0) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
	return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}
