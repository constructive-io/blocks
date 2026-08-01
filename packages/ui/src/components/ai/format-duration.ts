/** Format elapsed ms for "Thought for …" / "Worked for …" labels. */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`;
	const seconds = ms / 1000;
	if (seconds < 10) return `${seconds.toFixed(1)}s`;
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	const rem = Math.round(seconds % 60);
	return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}
