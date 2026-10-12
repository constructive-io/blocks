/** Format elapsed ms for "Thought for …" / "Worked for …" labels. */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`;
	const seconds = ms / 1000;
	if (seconds < 10) return `${seconds.toFixed(1)}s`;
	// Round once, then split, so 59.6 seconds is "1m" rather than "60s" and an hour reads "1h" rather than "60m".
	const total = Math.round(seconds);
	if (total < 60) return `${total}s`;
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const rem = total % 60;
	if (hours > 0) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
	return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}
