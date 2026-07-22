// Bounded module-level LRU that RETAINS decoded images by URL so they stay warm in
// the browser's in-memory cache across unmount/remount. In a virtualized grid the
// body <img> is destroyed when its row scrolls off-screen; without a live reference
// the decoded bitmap is dropped and a remounted <img src> refetches/repaints (flicker,
// pop-in). Holding a decoded Image reference keeps the URL warm — a remounted <img>
// paints from memory instead of refetching, even for no-cache/short-lived URLs.

const CAP = 256;
const cache = new Map<string, HTMLImageElement>(); // Map preserves insertion order → LRU.

export function warmImage(url: string): void {
	if (!url || typeof Image === 'undefined') return; // SSR / empty-url guard.

	if (cache.has(url)) {
		// Mark most-recently-used: re-insert moves it to the end of the iteration order.
		const img = cache.get(url)!;
		cache.delete(url);
		cache.set(url, img);
		return;
	}

	const img = new Image();
	img.decoding = 'async';
	img.src = url;
	cache.set(url, img);

	while (cache.size > CAP) {
		// Evict the oldest (front of insertion order).
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
}
