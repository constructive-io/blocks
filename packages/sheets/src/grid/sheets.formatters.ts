/**
 * Formatter utilities for grid cell previews
 * - Keep these pure so they are easy to test
 */

export function compactJsonPreview(value: unknown, maxLen = 80): string {
	try {
		const s = typeof value === 'string' ? value : JSON.stringify(value);
		if (s.length <= maxLen) return s;
		return s.slice(0, maxLen - 1) + '\u2026';
	} catch {
		const s = String(value);
		return s.length > maxLen ? s.slice(0, maxLen - 1) + '\u2026' : s;
	}
}

export function formatArrayPreview(arr: unknown[], max = 3): string {
	const items = arr
		.slice(0, max)
		.map((v) => (typeof v === 'object' && v !== null ? compactJsonPreview(v, 20) : String(v)));
	const more = arr.length > max ? ` +${arr.length - max}` : '';
	return items.join(', ') + more;
}

export function formatImagePreview(val: unknown): string {
	if (!val) return '';
	if (typeof val === 'string') return val.split('/').pop() || val;
	if (typeof val === 'object' && val !== null) {
		const rec = val as Record<string, unknown>;
		const url = (rec.url as string) || '';
		const filename = (rec.filename as string) || url.split('/').pop() || 'image';
		return filename;
	}
	return String(val);
}

